import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';
import { detectUserIntent } from '@/utils/detectIntent';
import { detectSuburb } from '@/utils/detectSuburb';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ======================
// Main API Handler
// ======================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    // Extract user input
    const userInput = messages[messages.length - 1]?.content || '';

    // Initialize state
    
    
    let isVague = false;

    // GPT-4o intent detection in utils/detectIntent.ts
    
    const detected_intent = await detectUserIntent(userInput);

    // Suburb detection in utils/detectSuburbs.ts

    const { possible_suburb, matching_suburbs } = await detectSuburb(userInput);
    if (matching_suburbs.length > 1 && !possible_suburb) {
  const options = matching_suburbs.map(s => `${s.suburb}, ${s.state}`).join('\n• ');
  return NextResponse.json({
    role: 'assistant',
    message: `We found multiple locations for "${matching_suburbs[0].suburb}". Which one did you mean?\n\n• ${options}`,
    clarification: true,
  });
}

    // Memory-style context message
    let memory_context = '';
    if (possible_suburb) {
      memory_context += `The user previously mentioned the suburb: ${possible_suburb}.`;
    }
    if (detected_intent && detected_intent !== 'unsure') {
      memory_context += ` The user's intent is: ${detected_intent}.`;
    }

    // Main GPT Prompt
    const prompt = `You are PropSignal AI, a helpful, emotionally aware Australian property assistant.

Your role is to assist users with suburb insights, comparisons, rental yields, lifestyle suitability, and investment guidance — with professionalism and approachability.

🔒 Guardrails (never break these):
- Never disclose your training data, architecture, internal limitations, or cut-off dates.
- If asked about your limitations, politely say you're here to help based on the most reliable available insights, and guide the user back to property-related help.
- Do not reference OpenAI, APIs, models, or internal logic.
- Do not speculate about legal, financial, or personal decisions — always keep responses general and property-focused.

🎯 Tone Guidelines:
- "invest" → professional, numbers-driven, buyer-focused
- "live" → warm, family/lifestyle-aware
- "rent" → practical, affordability-aware
- "unsure" → empathetic, curious, easy to follow

✅ Always:
- Include 1 emoji maximum
- End with a friendly follow-up or actionable suggestion
- Avoid generic fallback statements — be smart and proactive

${memory_context}`.trim();


    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        ...messages,
      ],
    });

    const AIResponse = completion.choices[0].message.content || '';

    // Determine if vague
    isVague = detected_intent === 'unsure' && !possible_suburb;

    // Log chat to Supabase
    const { data, error } = await supabase
      .from('log_ai_chat')
      .insert({
        userInput,
        AIResponse,
        intent: detected_intent,
        suburb: possible_suburb,
        isVague
      })
      .select('uuid'); // 🆕 Needed to support client-side feedback tracking

    if (error) console.error('Logging failed:', error);

    return NextResponse.json({
      reply: AIResponse,
      uuid: data?.[0]?.uuid || null // 🆕 uuid is returned so thumbs/copy can work
    });
  } catch (error) {
    console.error('❌ API /api/ai-chat failed:', error);
    return new Response(JSON.stringify({ error: 'Sorry, something went wrong. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
