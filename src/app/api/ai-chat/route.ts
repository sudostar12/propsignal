import { NextRequest, NextResponse } from 'next/server';
import { analyzeUserQuestion } from '@/utils/questionAnalyzer';
import { updateContext, getContext } from '@/utils/contextManager';
import { answerCrimeStats } from "@/utils/answers/crimeAnswer";
import { answerMedianPrice } from "@/utils/answers/medianPriceAnswer";
import { answerRentalYield } from "@/utils/answers/rentalYieldAnswer";
import { generateGeneralReply } from '@/utils/detectIntent';
import { detectSuburb } from '@/utils/detectSuburb';
import { supabase } from '@/lib/supabaseClient';
import { answerPriceGrowth } from "@/utils/answers/priceGrowthAnswer";
import { answerNewProjects } from "@/utils/answers/newProjectsAnswer";
import { getSuggestionsForTopic } from '@/utils/suggestions';
import { answerMultiSuburbComparison } from "@/utils/answers/multiSuburbAnswer";
import { setSuburbContext } from "@/utils/contextManager";
import { normalizeStateToAbbreviation } from '@/utils/detectSuburb';
//import { planUserQuery } from "@/utils/smartPlanner";
//import { executePlan } from "@/utils/queryExecutor";
//import { toTitle } from "@/utils/formatters";


export async function POST(req: NextRequest) {
  try {
    console.log('\n[DEBUG route.ts] ======== NEW REQUEST ========');

    //const { messages } = await req.json();

    // Smart system toggle and delegation
const body = await req.json();
const { messages, useSmartSystem } = body;
// Extract user input early (needed for both smart and original systems)
const userInput = messages?.[messages.length - 1]?.content || '';
console.log('[DEBUG route.ts] User input:', userInput);

// If smart system is requested, use smart logic directly
if (useSmartSystem === true) {
  console.log('[DEBUG route.ts] Using smart system');
  
  try {
 // Import smart system functions directly (no HTTP fetch needed)
    const { planUserQuery } = await import('@/utils/smartPlanner');
    const { executeEnhancedPlan } = await import('@/utils/smartExecutor');
    const { generateRentalYieldSummary } = await import('@/utils/fetchRentalData');
    const { formatMarkdownReply } = await import('@/utils/responseFormatter');
    const { analyzeUserQuestionSmart } = await import('@/utils/smartQuestionAnalyzer');
    
    // ✅ Analyze user question ONCE and cache it (saves ~2-3 seconds)
    // For follow-up questions, pass last assistant message as context
console.log('[DEBUG route.ts] Analyzing user question');
    const cachedAnalysis = await analyzeUserQuestionSmart(userInput);
    console.log('[DEBUG route.ts] Cached analysis:', cachedAnalysis);
    
    if (cachedAnalysis.topic === 'methodology' || cachedAnalysis.analysisType === 'meta_question') {
      console.log('[DEBUG route.ts] AI detected meta-question about methodology');
      
      const openai = await import('openai').then(m => new m.default({ apiKey: process.env.OPENAI_API_KEY! }));

const methodologyPrompt = `The user asked: "${userInput}"

This is a question about how our property analysis system works.

Provide a natural, confident response that:
1. Explains we combine official statistics, property market data, and safety records
2. Mentions we analyze investment metrics, safety, demographics, and market trends
3. Emphasizes data-driven approach with regular updates
4. Shows expertise casually, like an expert would naturally explain their work
5. Ends with "Just ask about any suburb you're interested in"

Tone: Knowledgeable, matter-of-fact, helpful (like a trusted advisor)
Length: 100-130 words
AVOID: Defensive phrases, "we encourage", "reach out", "confidentiality", overly formal language
Keep it conversational and confident.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: methodologyPrompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      const methodologyResponse = response.choices[0]?.message?.content || 'Our analysis uses data from multiple sources including crime statistics, property prices, and demographics.';

      const { data: logData } = await supabase
        .from('log_ai_chat')
        .insert({
          userInput,
          AIResponse: methodologyResponse,
          intent: 'methodology',
          suburb: null,
          state: null,
          isVague: false
        })
        .select('uuid');

      return NextResponse.json({
        reply: methodologyResponse,
        uuid: logData?.[0]?.uuid || null,
        suggestions: [
          'Tell me about Doncaster',
          'What suburbs are best for families?',
          'Compare Melton and Werribee'
        ],
        showCopy: true,
        allowFeedback: true,
        clarificationNeeded: false,
        fromSmartSystem: true
      });
    }
    
    // Plan the query (this will also call analyzer internally, but we have cached result for later reuse)
    const plan = await planUserQuery(messages);
    console.log('[DEBUG route.ts] Smart plan:', plan);
    
    if (!plan.suburb) {
      // Fall back to original system if no suburb detected
      console.log('[DEBUG route.ts] No suburb in plan, falling back to original system');
    } else {
      // Execute the plan
      const result = await executeEnhancedPlan(plan);
      
      if (result.error) {
        console.error('[DEBUG route.ts] Smart execution error:', result.error);
        // Fall back to original system
      } else {
        // Generate response based on intent
        let smartReply: string;
        
        if (plan.intent === 'rental_yield' || !plan.intent) {
          // Use rental yield response generation
          const successResult = result as Record<string, unknown>;
          
          const yearForSummary =
            (successResult.latestYieldYear as number | null) ??
            ((successResult.latestPR as { year?: number })?.year) ??
            new Date().getFullYear();

          const nearbyInsights = ((successResult.nearbyCompare as { rows?: unknown[] })?.rows || []).map((r: unknown) => {
            const row = r as { suburb: string; house?: number; unit?: number };
            return {
              suburb: row.suburb,
              houseYield: typeof row.house === "number" ? row.house : undefined,
              unitYield: typeof row.unit === "number" ? row.unit : undefined,
            };
          });

          const latestYield = successResult.latestYield as { house?: number; unit?: number } | undefined;
          const capitalAvg = successResult.capitalAvg as { house?: number; unit?: number } | undefined;
          const houseYield = typeof latestYield?.house === "number" ? latestYield.house : undefined;

          let summary: string;
          if (houseYield !== undefined) {
            summary = await generateRentalYieldSummary({
              suburb: plan.suburb,
              year: yearForSummary,
              userHouseYield: houseYield,
              userUnitYield: typeof latestYield?.unit === "number" ? latestYield.unit : undefined,
              nearbyInsights,
              state: plan.state || "VIC",
              stateAvgHouseYield: typeof capitalAvg?.house === "number" ? capitalAvg.house : undefined,
              stateAvgUnitYield: typeof capitalAvg?.unit === "number" ? capitalAvg.unit : undefined,
            });
          } else {
            summary = "Unable to generate yield analysis - insufficient house yield data available.";
          }

          smartReply = `${formatMarkdownReply(plan.suburb, successResult as never)}
 
🧭 **Summary**
${summary}

💡 Data uses suburb-level rollups (bedroom = null) plus bedroom snapshots when requested.`;

      } else if (plan.intent === 'suburb_search' || !plan.suburb) {
        // Handle search/recommendation queries
        console.log('[DEBUG route.ts] Handling suburb search query');
        
        const { findTopSuburbsByCriteria } = await import('@/utils/smartDataOrchestrator');
        const searchResults = await findTopSuburbsByCriteria();
        
        console.log('[DEBUG route.ts] Search found suburbs:', searchResults.suburbs);
        
        // Generate AI response for search results
        const { generateSmartResponse } = await import('@/utils/smartDataOrchestrator');
        const { analyzeUserQuestionSmart } = await import('@/utils/smartQuestionAnalyzer');
        
// ✅ Reuse cached analysis instead of calling again
        const analysis = cachedAnalysis;
        
        // Create a response about the recommended suburbs
        const searchPrompt = `User asked: "${userInput}"

We found these top suburbs based on data analysis:
${searchResults.suburbs.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Generate a helpful response that:
1. Acknowledges their question about community vibe/lifestyle
2. Lists these suburbs as recommendations
3. Briefly explains why these suburbs might have strong community (based on demographics, safety, family-friendly factors)
4. Encourages them to ask about specific suburbs for detailed analysis

Keep it concise and actionable.`;

        const openai = await import('openai').then(m => new m.default({ apiKey: process.env.OPENAI_API_KEY! }));
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: searchPrompt }],
          temperature: 0.7,
          max_tokens: 400
        });

        smartReply = response.choices[0]?.message?.content || 'Here are some suburbs to consider: ' + searchResults.suburbs.join(', ');
    

        } else {
          // Use AI to generate response for non-yield queries
          const { generateSmartResponse } = await import('@/utils/smartDataOrchestrator');
          const { analyzeUserQuestionSmart } = await import('@/utils/smartQuestionAnalyzer');
          
         // ✅ Reuse cached analysis instead of calling again
          const analysis = cachedAnalysis;
          
          const resultData = result as Record<string, unknown>;
          const fetchedData = {
            data: (resultData.fetchedData || {}) as Record<string, unknown>,
            metadata: {
              fetchTimeMs: 0,
              dataSourcesUsed: [] as string[],
              targetAreas: [plan.suburb] as string[],
              analysisType: 'simple' as 'simple' | 'moderate' | 'complex'
            }
          };
          
          smartReply = await generateSmartResponse(userInput, analysis, fetchedData);
        }
        
        // Log to database
        const { data: smartLogData } = await supabase
          .from('log_ai_chat')
          .insert({
            userInput,
            AIResponse: smartReply,
            intent: plan.intent || 'smart_system',
            suburb: plan.suburb,
            state: plan.state,
            isVague: false
          })
          .select('uuid');
        
        // Return smart response
        return NextResponse.json({
          reply: smartReply,
          uuid: smartLogData?.[0]?.uuid || null,
          suggestions: getSuggestionsForTopic(plan.intent || 'general'),
          showCopy: true,
          allowFeedback: true,
          clarificationNeeded: false,
          fromSmartSystem: true,
          smartMetadata: { plan, intent: plan.intent }
        });
      }
    }
  } catch (error) {
    console.error('[ERROR route.ts] Smart system error:', error);
    // Fall back to original system
    console.log('[DEBUG route.ts] Falling back to original system due to smart system error');
  }
}

// Continue with existing logic...

   // const userInput = messages?.[messages.length - 1]?.content || '';
    //console.log('[DEBUG route.ts] User input:', userInput);

    // STEP 1️⃣ — Analyze user question
    const questionAnalysis = await analyzeUserQuestion(userInput);
    console.log('[DEBUG route.ts] Question analysis:', questionAnalysis);

    //let area = questionAnalysis.targetArea;
    let finalReply = '';
    let isVague = false;
    let lga = null;
    let state = null;
    let topic = questionAnalysis.topic;
    //const targetAreas = questionAnalysis.targetAreas || [];
let area: string | undefined = undefined;

// ✅ Safely normalize targetAreas (handles undefined + legacy targetArea)
const targetAreas: string[] = Array.isArray(questionAnalysis.targetAreas)
  ? questionAnalysis.targetAreas
  : (questionAnalysis.targetArea ? [questionAnalysis.targetArea] : []);

// ✅ Extract suburbs safely
const suburb1 = targetAreas[0] || '';
//const suburb2 = targetAreas[1] || '';

if (topic === 'compare' && targetAreas.length > 1) {
  console.log('[DEBUG route.ts] Multi-suburb comparison requested:', targetAreas);
  // In compare flow, do not set area here
} else {
  
  console.log('[DEBUG route.ts] Single suburb context (AI hint only):', suburb1);
}



    // ============================
    // [DEBUG-S5.1] MULTI-SUBURB COMPARISON HANDLING
    // ============================
    // 11/07: suburb comparison can be moved to a seperate file under answers. 

if (questionAnalysis.compare && questionAnalysis.targetAreas && questionAnalysis.targetAreas.length > 1) {
  console.log('[DEBUG-route.ts] Multi-suburb comparison requested:', questionAnalysis.targetAreas);
  
  finalReply = await answerMultiSuburbComparison(questionAnalysis.targetAreas, questionAnalysis.topic);
}
  
// ============================
// [DEBUG-S5.2] MULTI-SUBURB QUERY HANDLING
// ============================

else {
  const context = getContext();

// 1️⃣ Check if we are expecting suburb clarification
  if (context.clarificationOptions && context.clarificationOptions.length > 0) {
    console.log('[DEBUG route.ts] User provided clarification input:', userInput);

    // ✅ NEW: Detect if user is asking a NEW question instead of clarifying
    // Check for question keywords and topic-related words
    const questionKeywords = /\b(what|how|tell|show|give|get|find|check|look|search|about)\b/i;
    const topicKeywords = /\b(crime|price|yield|growth|rental|median|project|stat|rate|suburb|area)\b/i;
    const hasQuestionWord = questionKeywords.test(userInput);
    const hasTopicWord = topicKeywords.test(userInput);
    
    // Check if user is still talking about the same suburb that needed clarification
    const previousSuburb = context.clarificationOptions[0]?.suburb?.toLowerCase() || '';
    const mentionsPreviousSuburb = userInput.toLowerCase().includes(previousSuburb);
    
    // If user has question words + topic words BUT doesn't mention the previous suburb = NEW QUESTION
    const isNewQuestion = (hasQuestionWord || hasTopicWord) && !mentionsPreviousSuburb;
    
    console.log('[DEBUG route.ts] New question detection:', {
      hasQuestionWord,
      hasTopicWord,
      mentionsPreviousSuburb,
      previousSuburb,
      isNewQuestion
    });
    
    if (isNewQuestion) {
      console.log('[DEBUG route.ts] User is asking a NEW question - clearing old clarification');
      
      // Clear the pending clarification
      updateContext({ 
        clarificationOptions: [], 
        pendingTopic: undefined,
        suburb: undefined,
        lga: undefined,
        state: undefined
      });
      
      // Don't return - let the code continue to process this as a new question
      // The code will fall through to line 161 where normal suburb detection happens
    } else {
      console.log('[DEBUG route.ts] User is providing clarification (not a new question)');

      // ✅ For multi-suburb flow, use topic from original context instead of re-analyzing 
      topic = context.pendingTopic || 'general';
      console.log('[DEBUG route.ts] Using pending topic from context:', topic);

// Try to match user clarification to stored options
    const userInputNormalized = userInput.trim().toLowerCase();
    
    // ✅ FIXED: Also check if questionAnalysis detected a state - normalize it for comparison
    const detectedState = questionAnalysis.state ? normalizeStateToAbbreviation(questionAnalysis.state) : null;
    console.log('[DEBUG route.ts] Detected state from analysis:', questionAnalysis.state, '-> normalized:', detectedState);
    
    const clarifiedMatch = context.clarificationOptions.find(opt => {
      // Check if user input matches state (either full name or abbreviation)
      const optStateNormalized = opt.state ? normalizeStateToAbbreviation(opt.state) : '';
      const userStateMatch = detectedState && optStateNormalized === detectedState;
      
      // Original checks
      const stateMatch = opt.state?.toLowerCase() === userInputNormalized;
      const lgaMatch = opt.lga?.toLowerCase().includes(userInputNormalized);
      const suburbMatch = opt.suburb.toLowerCase().includes(userInputNormalized);
      
      return userStateMatch || stateMatch || lgaMatch || suburbMatch;
    });

      if (clarifiedMatch) {
        console.log('[DEBUG route.ts] User clarification matched:', clarifiedMatch);

        // Update area, lga, state
        area = clarifiedMatch.suburb;
        lga = clarifiedMatch.lga;
        state = clarifiedMatch.state;

        // Clear clarification options from context
        updateContext({ suburb: area, lga: lga, state: state, clarificationOptions: [], pendingTopic: undefined });
      } else {
        // If no match, ask again
        console.log('[DEBUG route.ts] User clarification did not match any options');

        const optionsList = context.clarificationOptions
          .map(opt => `${opt.suburb} (${opt.lga}, ${opt.state})`)
          .join("\n• ");

        const clarificationReply = `I didn't catch which suburb you meant. Could you clarify again?\n\n**Options:**\n• ${optionsList}\n\n**Please reply specifying the state or LGA, or ask a new question to start fresh.**`;

        return NextResponse.json({
          reply: clarificationReply,
          clarificationNeeded: true,
          options: context.clarificationOptions
        });
      }
    } // End of else block for clarification
  }

    if (!area) {
    const suburbDetection = await detectSuburb(userInput, questionAnalysis.state || undefined);

    if (!suburbDetection.possible_suburb && !suburbDetection.needsClarification) {
  console.log('[DEBUG route.ts] No suburb detected in current message - clearing old suburb context');
  updateContext({ 
    suburb: undefined, 
    lga: undefined, 
    state: undefined, 
    nearbySuburbs: [],
    clarificationOptions: [],
    pendingTopic: undefined
  });
}

    if (suburbDetection.needsClarification && suburbDetection.multipleMatches) {
      console.log('[DEBUG route.ts] Multiple matches found, storing clarification options in context');

      // Store options in context
      updateContext({ clarificationOptions: suburbDetection.multipleMatches, pendingTopic: topic });

      const optionsList = suburbDetection.multipleMatches
        .map(opt => `${opt.suburb} (${opt.lga}, ${opt.state})`)
        .join("\n• ");

      const clarificationReply = `I found multiple suburbs named "${suburbDetection.extractedSuburb}". Which one do you mean?\n\n• ${optionsList}\n\n**Please reply specifying the state or LGA.**`;

      return NextResponse.json({
        reply: clarificationReply,
        clarificationNeeded: true,
        options: suburbDetection.multipleMatches
      });
    }
      // ✅ AI fallback to handle no suburb found
      if (!suburbDetection.possible_suburb && !suburbDetection.needsClarification) {
      console.log('[DEBUG route.ts] No suburb detected, using AI fallback clarification');

      const aiFallbackMessage = await generateGeneralReply(messages, topic);

        // 🔧 Add predefined suggestions here too
  let suggestions: string[] = [];
  if (topic && typeof topic === 'string') {
    const topicSuggestions = getSuggestionsForTopic(topic);
    if (Array.isArray(topicSuggestions) && topicSuggestions.length > 0) {
      console.log('[DEBUG-SUGGEST] Selected suggestions (fallback path):', topicSuggestions);
      suggestions = topicSuggestions;
    }
  }

     // ✅ Log fallback message to DB
console.log('[DEBUG route.ts] Logging fallback AI response');
const { data: fallbackLog, error: fallbackLogError } = await supabase
  .from('log_ai_chat')
  .insert({
    userInput,
    AIResponse: aiFallbackMessage,
    intent: topic,
    suburb: null,
    isVague: true,
    lga: null,
    state: null
  })
  .select('uuid');

if (fallbackLogError) {
  console.error('[ERROR route.ts] Fallback logging failed:', fallbackLogError);
} else {
  console.log('[DEBUG route.ts] Fallback logged successfully, UUID:', fallbackLog?.[0]?.uuid);
}

// ✅ Return fallback + uuid + suggestions
return NextResponse.json({
  reply: aiFallbackMessage,
  clarificationNeeded: true,
  options: [],
  uuid: fallbackLog?.[0]?.uuid || null,
  suggestions
});

    }

    if (suburbDetection.possible_suburb) {
 
setSuburbContext({
  suburb: suburbDetection.possible_suburb,
  lga: suburbDetection.lga,
  state: suburbDetection.state,
  nearbySuburbs: suburbDetection.nearbySuburbs ?? [],
  clarificationOptions: [],
});
}
  }

  console.log('[DEBUG route.ts] Current context v1:', getContext());
}


// Use pendingTopic for multi-suburb clarification scenario
const context = getContext();
if (context.pendingTopic) {
  console.log('[DEBUG route.ts] Using pending topic from context:', context.pendingTopic);
  topic = context.pendingTopic;

  // Clear pendingTopic so it does not persist
  updateContext({
    ...context,
    pendingTopic: undefined
  });
}


const currentContext = getContext();

// ==============================================================
// 🔍 DEBUG: State Check Diagnostics
// ==============================================================
const debugContext = getContext(); // Store once for debug logging
console.log('[DEBUG route.ts] ===== STATE CHECK DIAGNOSTICS =====');
console.log('[DEBUG route.ts] About to check non-VIC state...');
console.log('[DEBUG route.ts] getContext() returns:', JSON.stringify(debugContext, null, 2));
console.log('[DEBUG route.ts] context.state value:', debugContext?.state);
console.log('[DEBUG route.ts] context.state type:', typeof debugContext?.state);
console.log('[DEBUG route.ts] Will trigger coverage notice?', debugContext?.state && debugContext.state.trim() !== '' && debugContext.state.toUpperCase() !== "VIC" && debugContext.state.toUpperCase() !== "VICTORIA");
console.log('[DEBUG route.ts] ==========================================');
// ==============================================================

// 🚧 Check if the suburb is outside of VIC - 26/07 - to be deleted once other state coverage is added.


// ✅ Use fresh context here, not the stale 'context' variable from earlier
const freshContext = getContext();

// ✅ Improved state check with multiple safeguards
if (freshContext?.state && 
    freshContext.state.trim() !== '' && 
    freshContext.state.toUpperCase() !== "VIC" && 
    freshContext.state.toUpperCase() !== "VICTORIA") {
  console.log(`[INFO route.ts] Non-VIC suburb detected (${freshContext.state}) — returning coverage notice.`);
//let suggestions: string[] = [];
  finalReply = `🚧 **Coverage Notice**\n\nI currently only cover **Victorian suburbs**. Expansion to other states like **${freshContext.state}** is underway.\n\n🔗 [Subscribe](https://www.propsignal.com.au/)\n` +
  `to get notified when insights for your area become available.`;

  freshContext.clarificationOptions = [];
  //suggestions = [];

  // ✅ Supabase logging for feedback tracking
  const { data } = await supabase
    .from('log_ai_chat')
    .insert({
      userInput,
      AIResponse: finalReply,
      intent: topic,
      suburb: area,
      isVague,
      lga,
      state: freshContext.state
    })
    .select('uuid');

  const loggedUUID = data?.[0]?.uuid || null;

  // ✅ Unified response with UI icons and metadata
  return NextResponse.json({
    reply: finalReply,
    uuid: loggedUUID,
    suggestions: [], // explicitly empty
    showCopy: true,
    allowFeedback: true,
    clarificationNeeded: false,
    options: [],
    metadata: {
      blocked: true,
      reason: "non_vic_suburb",
      state: context.state,
      suburb: context.suburb || null
    }
  });
}

// non-vic state coverage logic block above this line. To be deleted once additional coverage is added.


if (topic !== 'compare' && !area && currentContext.suburb) {
  area = currentContext.suburb;
}

if (!lga && currentContext.lga) {
  lga = currentContext.lga;
}

if (!area && ['price', 'crime', 'yield', 'price_growth', 'projects'].includes(topic)) {
  console.warn(`[WARN route.ts] No suburb detected for topic '${topic}'. Falling back to GPT general response`);
   finalReply = await generateGeneralReply(messages, topic);
  isVague = true;
}

if (topic !== 'compare') {
 // const areaSafe = area!;
  // You can safely use areaSafe inside this block or below only for non-compare handlers
}
if ((topic === "yield" || topic === "projects") && !lga) {
    console.warn(`[WARN route.ts] No LGA detected for topic '${topic}'. Falling back to GPT general response`);
   finalReply = await generateGeneralReply(messages, topic);
  isVague = true;
}

if (topic === 'compare') {
  console.log('[DEBUG route.ts] Topic value:', topic, ', Target areas:', questionAnalysis.targetAreas);
} else {
  console.log('[DEBUG route.ts] Topic value:', topic, ', Area value:', area);
}


const areaSafe = area!;
const topicHandlers: Record<string, () => Promise<string>> = {
  price: () => answerMedianPrice(areaSafe),
  crime: () => answerCrimeStats(areaSafe),
  yield: () => {return answerRentalYield(areaSafe, lga!);},
  price_growth: () => answerPriceGrowth(areaSafe, questionAnalysis.years || 3),
  projects: () => {return answerNewProjects(areaSafe, lga!);}
  };


if (area && topicHandlers[topic]) {
  finalReply = await topicHandlers[topic]();
} else if (topic === 'profile') {
  // Handle multi-suburb profile requests
  if (targetAreas.length > 1) {
    const suburb1 = targetAreas[0];
    const suburb2 = targetAreas[1];
    
    finalReply = `You're interested in ${suburb1} and ${suburb2}! 

While our side-by-side comparison feature is in development, I can give you detailed insights on each suburb individually.

**Try asking:**
- "What is the median price in ${suburb1}?"
- "What are the crime stats for ${suburb2}?"
- "Show me price growth in ${suburb1}"
- "Tell me the rental yield for ${suburb2}"

Which suburb would you like to explore first?`;
  } else {
    // Single suburb profile request
    const suburbName = area || (targetAreas.length > 0 ? targetAreas[0] : 'that area');
    
    finalReply = `I'd love to give you a comprehensive profile of ${suburbName}!

Right now, I can provide you with detailed insights across these key areas:

📊 **Investment Metrics**
- Median prices and trends
- Rental yields and returns  
- Historical price growth

🏘️ **Local Market Data**
- New development projects
- Crime and safety statistics

**What would you like to explore first?** Just ask about any of these topics for ${suburbName}!`;
  }



  } else {
  console.log('[DEBUG route.ts] Preparing AI general response.');
  
  // ✅ CRITICAL FIX: Clear old suburb context when answering general questions
  // This prevents previous non-VIC suburbs from persisting
  if (!area) {
    console.log('[DEBUG route.ts] No suburb in current question - clearing old suburb context');
    updateContext({ 
      suburb: undefined, 
      lga: undefined, 
      state: undefined, 
      nearbySuburbs: [],
      clarificationOptions: [],
      pendingTopic: undefined
    });
  }

  finalReply = await generateGeneralReply(messages, topic);
  isVague = true;
}

if (!lga && currentContext.lga) {
  lga = currentContext.lga;
}

if (!state && currentContext.state) {
  state = currentContext.state;
}

 // ===============================
    // ✅ Central Logging Block
    // ===============================
    console.log('[DEBUG route.ts] Preparing to log to database');
    const { data, error } = await supabase
      .from('log_ai_chat')
      .insert({
        userInput,
        AIResponse: finalReply,
        intent: topic,
        suburb: area,
        isVague,
        lga,
        state
      })
      .select('uuid');

    if (error) {
      console.error('[ERROR route.ts] Logging failed:', error);
    } else {
      console.log('[DEBUG route.ts] Conversation logged successfully, UUID:', data?.[0]?.uuid);
    }

    // 💬 Add suggestions for frontend quick questions
    console.log('[DEBUG route.ts] Adding predefined suggestions for topic:', topic);
    const suggestions = getSuggestionsForTopic(topic);

return NextResponse.json({
  reply: finalReply,
  uuid: data?.[0]?.uuid || null,
  suggestions,  // fallback suggestions will be empty if none
  showCopy: true,
  allowFeedback: true,
  clarificationNeeded: Array.isArray(context.clarificationOptions) && context.clarificationOptions.length > 0,
  options: context.clarificationOptions || []
});

  } catch (err) {
    console.error('[ERROR route.ts] /api/ai-chat crashed:', err);
    return NextResponse.json(
      { error: 'Sorry, something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
// Health check
export async function GET() {
  return NextResponse.json({ ok: true, msg: 'PropSignal AI API is running 🚀' });
}
