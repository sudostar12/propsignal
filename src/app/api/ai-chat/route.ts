import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';
import { detectUserIntent } from '@/utils/detectIntent';
import { detectSuburb } from '@/utils/detectSuburb';
import { AIChatPrompt } from '@/utils/AIChatPrompt';

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

    // Memory-style context message moved to utils/AIChatPrompt.ts
   
    const prompt = AIChatPrompt(possible_suburb, detected_intent);

    // Main GPT Prompt - moved to utils/AIChatPrompt.ts
   

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
