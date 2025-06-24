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

  // 3. 🤖 Generate AI chat reply
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `
You are PropSignal AI, a buyer’s agent assistant for residential properties in Victoria. Provide suburb-level insights based on metrics like rental yield, price, population growth, and vacancy.

If the user input is vague, politely ask for clarification — and offer examples.

Adjust tone depending on intent:
- "invest" → focus on rental yield, growth
- "live" → focus on family-friendliness, schools, lifestyle
- "rent" → focus on rental costs, availability, affordability
        `.trim(),
      },
      ...messages,
    ],
  });

  const ai_response = completion.choices[0].message.content || '';

  // 4. 💾 Log to Supabase
  await supabase.from('ai_chat_logs').insert({
    user_input,
    ai_response,
    intent: detected_intent,
  });

  // 5. Return response
  return NextResponse.json({ reply: ai_response });
}
