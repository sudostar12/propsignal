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

// 3. 🔍 Optional: crude suburb pattern matching (replace later with DB match)
const suburbPattern = /\b([a-z\s]+)\b/i;
const possible_suburb = user_input.match(suburbPattern)?.[1]?.trim();

// 4. 🎯 Vague prompt clarification logic
if (!detected_intent && !possible_suburb) {
  // No intent + no suburb
  return NextResponse.json({
    role: 'assistant',
    clarification: true,
    message: `Could you clarify which suburb you're interested in? Also, are you looking to invest, live, or rent?\n\nEach goal affects the criteria — for example:\n• "Compare Werribee and Tarneit for investment"\n• "Best family suburbs under $900k"\n• "Rental yield in Docklands for units"`
  });
}

if (!detected_intent && possible_suburb) {
  // Suburb present, intent missing
  return NextResponse.json({
    role: 'assistant',
    clarification: true,
    message: `Thanks for mentioning "${possible_suburb}". Just to guide you better — are you looking to invest, live, or rent in this suburb?\n\nEach goal shifts what I focus on:\n• Invest → growth, rental yield, approvals\n• Live → family-friendliness, safety, schools\n• Rent → rent levels, affordability, vacancy\n\nLet me know and I’ll tailor the insights for ${possible_suburb}!`
  });
}

if (detected_intent && !possible_suburb) {
  // Intent present, suburb missing
  return NextResponse.json({
    role: 'assistant',
    clarification: true,
    message: `Got it — you're looking to ${detected_intent}. Could you let me know which suburb you're thinking about?\n\nFor example:\n• "Rental yield in Sunshine Coast"\n• "Best family suburbs under $800k in VIC"`
  });
}

  // 5. Build conditional prompt based on intent
let prompt = '';

if (detected_intent === 'invest') {
  prompt = `
You are PropSignal AI, a buyer’s agent assistant helping users assess suburbs in Australia for property investment. Ask for clarification if the user's query is vague.

Focus on:
- Capital growth potential
- Rental yield
- Vacancy rate
- Infrastructure and zoning
Use a professional tone, keep it practical and data-informed.
  `.trim();
} else if (detected_intent === 'live') {
  prompt = `
You are PropSignal AI, a property expert helping users find suitable suburbs in Australia to live in. Ask for clarification if the user's query is vague.

Focus on:
- Family-friendliness
- Safety, schools, and transport
- Lifestyle and amenities
Speak with a warm, reassuring tone.
  `.trim();
} else if (detected_intent === 'rent') {
  prompt = `
You are PropSignal AI, assisting renters in Australia to find suitable and affordable suburbs. Ask for clarification if the user's query is vague.

Focus on:
- Median rent
- Availability and vacancy rate
- Accessibility and amenities
Keep responses clear and tenant-friendly.
  `.trim();
} else {
  prompt = `
You are PropSignal AI, a property insights assistant for Australian suburbs.

Provide helpful and clear answers on investment, lifestyle, or renting — and ask for clarification if the user's query is vague.
  `.trim();
}

  // 6. 🤖 Generate AI chat reply
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

  // 7. 💾 Log to Supabase
  await supabase.from('ai_chat_logs').insert({
    user_input,
    ai_response,
    intent: detected_intent,
  });

  // 8. Return response
  return NextResponse.json({ reply: ai_response });
}
