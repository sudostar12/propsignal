// src/utils/smartConversationHandler.ts
import OpenAI from 'openai';
import { getContext, updateContext } from './contextManager';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface ConversationIntent {
  type: 'clarification_response' | 'new_question' | 'follow_up' | 'greeting' | 'suburb_switch';
  confidence: number;
  reasoning: string;
  shouldClearContext: boolean;
  suburbMentioned?: string;
  stateMentioned?: string;
}

/**
 * Analyzes conversation flow to understand if user is:
 * - Answering a clarification question
 * - Asking a new question
 * - Following up on previous topic
 * - Switching suburbs
 */
export async function analyzeConversationFlow(
  userInput: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<ConversationIntent> {
  
  console.log('[Smart Conversation] Analyzing conversation flow...');
  
  const context = getContext();
  
  // Build context for AI
  const lastAssistantMessage = conversationHistory
    .slice()
    .reverse()
    .find(m => m.role === 'assistant')?.content || '';
  
  const contextInfo = `
Current Context:
- Pending clarification: ${context.clarificationOptions && context.clarificationOptions.length > 0 ? 'YES' : 'NO'}
- Last suburb discussed: ${context.suburb || 'none'}
- Clarification options: ${context.clarificationOptions?.map((o) => o.suburb).join(', ') || 'none'}

Last assistant message: "${lastAssistantMessage}"

User's response: "${userInput}"
  `.trim();
  
  const prompt = `You are a conversation flow analyzer. Determine what the user is trying to do.

${contextInfo}

Analyze the user's intent and respond with ONLY valid JSON:

{
  "type": "clarification_response" | "new_question" | "follow_up" | "greeting" | "suburb_switch",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "shouldClearContext": true/false,
  "suburbMentioned": "suburb name or null",
  "stateMentioned": "state abbreviation or null"
}

**Rules:**
- If we just asked "which suburb?" and user said a suburb/state name → "clarification_response"
- If user says "what about X" where X is NEW suburb → "suburb_switch"  
- If user asks about same suburb but different data → "follow_up"
- If user asks completely different question → "new_question"
- If pending clarification but user asks unrelated question → "new_question" + shouldClearContext: true

**Examples:**
We asked: "Which Burwood - NSW or VIC?"
User says: "victoria" → type: "clarification_response"

We asked: "Which Burwood - NSW or VIC?"
User says: "what about doncaster" → type: "suburb_switch", shouldClearContext: true

We asked: "Which Burwood - NSW or VIC?"  
User says: "hawthorn" → type: "suburb_switch", shouldClearContext: true

No pending clarification
User says: "hawthorn" → type: "new_question"

RESPOND ONLY WITH JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: 'You are a conversation flow analyzer. Respond only with JSON.' },
        { role: 'user', content: prompt }
      ],
      //temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('[Smart Conversation] Analysis:', result);
    
    return result;
    
  } catch (error) {
    console.error('[Smart Conversation] Error:', error);
    return {
      type: 'new_question',
      confidence: 50,
      reasoning: 'Failed to analyze, defaulting to new question',
      shouldClearContext: false
    };
  }
}

/**
 * Handle the conversation based on the analyzed intent
 */
export async function handleConversationIntent(
  intent: ConversationIntent,
  userInput: string
): Promise<{ shouldProceed: boolean; response?: string }> {
  
  const context = getContext();
  
  // Clear context if needed
  if (intent.shouldClearContext) {
    console.log('[Smart Conversation] Clearing old context');
    updateContext({
      clarificationOptions: [],
      pendingTopic: undefined
    });
  }
  
  // Handle clarification response
  if (intent.type === 'clarification_response' && 
      context.clarificationOptions && 
      context.clarificationOptions.length > 0) {
    
    console.log('[Smart Conversation] User is responding to clarification');
    
    // Try to match their response
    const userLower = userInput.toLowerCase();
    const match = context.clarificationOptions.find((opt) =>
      userLower.includes(opt.state?.toLowerCase()) ||
      userLower.includes(opt.suburb?.toLowerCase()) ||
      userLower.includes(opt.lga?.toLowerCase())
    );
    
    if (match) {
      console.log('[Smart Conversation] Matched to:', match);
      
      // Update context
      updateContext({
        suburb: match.suburb,
        lga: match.lga,
        state: match.state,
        clarificationOptions: [],
        pendingTopic: undefined
      });
      
      // Let the system proceed with this suburb
      return { shouldProceed: true };
    } else {
      // Couldn't match
      const options = context.clarificationOptions
        .map((o) => `${o.suburb} (${o.lga}, ${o.state})`)
        .join('\n• ');
      
      return {
        shouldProceed: false,
        response: `I didn't catch that. Which suburb?\n\n• ${options}`
      };
    }
  }
  
  // Handle suburb switch
  if (intent.type === 'suburb_switch') {
    console.log('[Smart Conversation] User is switching suburbs');
    // Clear old context and let normal flow detect the new suburb
    return { shouldProceed: true };
  }
  
  // All other cases - proceed normally
  return { shouldProceed: true };
}