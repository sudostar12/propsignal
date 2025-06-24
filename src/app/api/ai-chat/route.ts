import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages } = body;

  // 1. Extract user's most recent message
  const user_input = messages[messages.length - 1]?.content || '';

  // 2. 🔍 Detect user intent
  let detected_intent = null;
  try {
    const intentDetection = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a property assistant. Your task is to classify user intent as one of: "invest", "live", or "rent". Only return one of those three words.`
        },
        {
          role: 'user',
          content: user_input
        }
      ]
    });

    detected_intent = intentDetection.choices[0].message.content?.toLowerCase().trim();
    if (!['invest', 'live', 'rent'].includes(detected_intent ?? '')) {
      detected_intent = null; // fallback in case GPT returns something unexpected
    }
  } catch (error) {
    console.error('Intent detection failed:', error);
  }

  // 3. Build conditional prompt based on intent
let prompt = '';

if (detected_intent === 'invest') {
  prompt = `
You are PropSignal AI, a buyer’s agent assistant helping users assess suburbs in Victoria for property investment.

Focus on:
- Capital growth potential
- Rental yield
- Vacancy rate
- Infrastructure and zoning
Use a professional tone, keep it practical and data-informed.
  `.trim();
} else if (detected_intent === 'live') {
  prompt = `
You are PropSignal AI, a property expert helping users find suitable suburbs in Victoria to live in.

Focus on:
- Family-friendliness
- Safety, schools, and transport
- Lifestyle and amenities
Speak with a warm, reassuring tone.
  `.trim();
} else if (detected_intent === 'rent') {
  prompt = `
You are PropSignal AI, assisting renters in Victoria to find suitable and affordable suburbs.

Focus on:
- Median rent
- Availability and vacancy rate
- Accessibility and amenities
Keep responses clear and tenant-friendly.
  `.trim();
} else {
  prompt = `
You are PropSignal AI, a property insights assistant for Victorian suburbs.

Provide helpful and clear answers on investment, lifestyle, or renting — and ask for clarification if the user's query is vague.
  `.trim();
}

  // 4. 🤖 Generate AI chat reply
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      ...messages,
    ],
  });

  const ai_response = completion.choices[0].message.content || '';

  // 5. 💾 Log to Supabase
  await supabase.from('ai_chat_logs').insert({
    user_input,
    ai_response,
    intent: detected_intent,
  });

  // 6. Return response
  return NextResponse.json({ reply: ai_response });
}
