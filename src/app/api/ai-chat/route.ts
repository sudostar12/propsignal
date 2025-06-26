import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Message = {
  role: 'user' | 'assistant';
  content: string;
  clarification?: boolean;
  uuid?: string;
};


export async function POST(req: NextRequest) {
  try {
  const body = await req.json();
  const { messages, clarification_count = 0 } = body;
  let clarificationCount = clarification_count;

// 0. 🔍 Fallback: Estimate clarificationCount from assistant replies if not tracked by client
if (!clarificationCount) {
  clarificationCount = (messages as Message[]).filter(
    (m) => m.role === 'assistant' && m.clarification === true
  ).length;
}

console.log('💡 Clarification Count inferred:', clarificationCount);


  // 1. Extract user's most recent message
  const user_input = messages[messages.length - 1]?.content || '';


  // DS suggested this
const genericQueries = [
  "weather", "hi", "hello", "how are you", "what's up", "help", 
  "who are you", "what can you do", "hey", "sup"
];

const isGenericQuery = genericQueries.some(phrase => 
  user_input.toLowerCase().includes(phrase)
);

if (isGenericQuery) {
  return NextResponse.json({
    role: 'assistant',
    message: `Hey there! 👋 I’m your Aussie property assistant. I can help with suburb insights, investment tips, or finding a place to live. Try something like:\n\n• "Best suburbs for families in Melbourne?"\n• "Where should I invest under $600k?"\n• "What’s rental demand like in Brisbane?"\n\nOr just chat — I’m flexible! 😊`,
    clarification: true,
  });
}


// 2. 🔍 Check for vague input using GPT
let is_vague_input = false;
try {
  const vaguenessCheck = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You're a classifier. Given a user message, classify it as either "vague" or "specific". A vague message is unclear, too short, or lacks actionable detail (e.g. "hi", "help", "i don't know", "what can you do"). Only return one word: "vague" or "specific".`,
      },
      {
        role: 'user',
        content: user_input,
      },
    ],
  });

  const classification = vaguenessCheck.choices[0].message.content?.toLowerCase().trim();
  if (classification === 'vague') is_vague_input = true;
} catch (error) {
  console.error('Vagueness check failed:', error);
}


// 3. 🛑 Handle vague input — but don't short-circuit if intent is clear
if (is_vague_input) {
  const input = user_input.toLowerCase().trim();
  const containsIntent =
    ['invest', 'investing', 'live', 'living', 'rent', 'renting'].some((word) =>
      input.includes(word)
    ) || ['1', '2', '3'].includes(input);

    if (is_vague_input && !containsIntent) { //DS suggested this
      clarificationCount += 1;
    
      let message = "";
      switch (clarificationCount) {
        case 1:
          message = `Hey! 👋 No worries if you're unsure — I’m here to help explore. Are you thinking about:\n\n• 🏡 **Buying a home**\n• 📈 **Investing in property**\n• 🏠 **Renting somewhere new**\n\nOr just say a suburb name (e.g., "Tell me about Footscray") and I’ll dive in!`;
          break;
        case 2:
          message = `All good! Property can be overwhelming. Let’s simplify:\n\n1. "Top suburbs for rentals under $500?"\n2. "Where’s hot for investment in QLD?"\n3. "Best family suburbs near schools?"\n\nOr throw me a curveball — I can handle it! 😄`;
          break;
        default:
          message = `Brain freeze? Happens to the best of us! 🧠❄️\n\nTry one of these or just say *anything*:\n• "Compare Sydney vs. Melbourne rentals"\n• "Cheapest suburbs 1hr from CBD"\n• "Just browsing — surprise me!"\n\nI’ll meet you where you’re at.`;
      }
    
      return NextResponse.json({
        role: 'assistant',
        clarification: true,
        message,
        clarification_count: clarificationCount,
      });
    }

  // else: vague message *did* contain a useful keyword — continue as normal
}



  // 4. 🔍 Detect user intent
  let detected_intent = null;
  try {
    const intentDetection = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a property assistant. Classify user intent as one of:
          - "invest" (buy to generate returns)
          - "live" (buy or rent for personal residence)
          - "rent" (seeking to lease a home)
          - "unsure" (user is confused, browsing, or unclear)

          Return only one word from the list.`

        },
        {
          role: 'user',
          content: user_input
        }
      ]
    });

    detected_intent = intentDetection.choices[0].message.content?.toLowerCase().trim();
    if (!['invest', 'live', 'rent', 'unsure'].includes(detected_intent ?? '')) {
      detected_intent = null; // fallback in case GPT returns something unexpected
    }
  } catch (error) {
    console.error('Intent detection failed:', error);
  }

  const lowerInput = user_input.toLowerCase().trim();

  if (!detected_intent) {
    for (let i = messages.length - 2; i >= 0; i--) {
      const content = messages[i]?.content?.toLowerCase() || '';
      if (content.includes('invest')) {
        detected_intent = 'invest';
        break;
      } else if (content.includes('live')) {
        detected_intent = 'live';
        break;
      } else if (content.includes('rent')) {
        detected_intent = 'rent';
        break;
      }
    }
  }
  

if (clarificationCount >= 3 && !detected_intent) {
  // Handle numbered replies
  if (['1', 'one'].includes(lowerInput)) {
    detected_intent = 'invest';
  } else if (['2', 'two'].includes(lowerInput)) {
    detected_intent = 'rent';
  } else if (['3', 'three'].includes(lowerInput)) {
    detected_intent = 'live';
  } else if (
    /rent/i.test(lowerInput) ||
    /living|home|place|move/i.test(lowerInput) ||
    /don'?t know|no idea|just browsing|new here|explore/i.test(lowerInput)
  ) {
    detected_intent = 'unsure';
  }
}


// 3. 🔍 Detect suburb match (case-insensitive, multi-word, DB-driven)
let possible_suburb: string | null = null;
let matching_suburbs: { suburb: string; state: string }[] = [];

try {
  const { data: suburbList, error } = await supabase
    .from('suburbs')
    .select('suburb, state');

  if (error) {
    console.error('Suburb list fetch failed:', error);
  }

  if (suburbList && suburbList.length > 0) {
    const input = user_input.toLowerCase();

    // Match any suburb that appears in input
    matching_suburbs = suburbList.filter(({suburb}) =>
      new RegExp(`\\b${suburb.toLowerCase()}\\b`, 'i').test(input)
    );

    // If there's a single unambiguous match, use it
    if (matching_suburbs.length === 1) {
      possible_suburb = matching_suburbs[0].suburb;
    }
    if (matching_suburbs.length > 1) {
      const options = matching_suburbs.map(s => `${s.suburb}, ${s.state}`).join('\n• ');
    
      clarificationCount += 1;
    
      return NextResponse.json({
        role: 'assistant',
        clarification: true,
        message: `Thanks! The suburb "${matching_suburbs[0].suburb}" exists in multiple states.\n\nWhich one are you interested in?\n• ${options}\n\nOnce I know the state, I can give you precise insights.`,
        clarification_count: clarificationCount,
      });
    }
    
  }
} catch (e) {
  console.error('Suburb match error:', e);
}


// 4. 🎯 Clarify Vague prompts
if (!detected_intent && !possible_suburb) {
  // No intent + no suburb
  clarificationCount += 1;
  return NextResponse.json({
    role: 'assistant',
    clarification: true,
    message: `Could you clarify which suburb you're interested in? Also, are you looking to invest, live, or rent?\n\nEach goal affects the criteria — for example:\n• "Compare Box Hill and Doncaster for investment"\n• "Best family suburbs under $900k"\n• "Rental yield in Docklands for units"`,
    clarification_count: clarificationCount,
  });
  
}

if (!detected_intent && possible_suburb) {
  // Suburb present, intent missing
  clarificationCount += 1;
  return NextResponse.json({
    role: 'assistant',
    clarification: true,
    message: `Thanks for mentioning "${possible_suburb}". Just to guide you better — are you looking to invest, live, or rent in this suburb?\n\nEach goal shifts what I focus on:\n• Invest → growth, rental yield, approvals\n• Live → family-friendliness, safety, schools\n• Rent → rent levels, affordability, vacancy\n\nLet me know and I’ll tailor the insights for ${possible_suburb}!`,
    clarification_count: clarificationCount,
  });
}

if (detected_intent && !possible_suburb) {
  // Intent present, suburb missing
  clarificationCount += 1;
  return NextResponse.json({
    role: 'assistant',
    clarification: true,
    message: `Got it — you're looking to ${detected_intent}. Could you let me know which suburb you're thinking about?\n\nFor example:\n• "Rental yield in Sunshine Coast"\n• "Best family suburbs under $800k in VIC"`,
    clarification_count: clarificationCount,
  });
}

// 4.5 🔁 If suburb matches multiple states, clarify (DS suggested this)
if (matching_suburbs.length > 1) {
  const options = matching_suburbs
    .map((s) => `📍 **${s.suburb}, ${s.state}**`)
    .join('\n');

  return NextResponse.json({
    role: 'assistant',
    clarification: true,
    message: `Oops, multiple ${matching_suburbs[0].suburb}s exist! Which one?\n\n${options}\n\n*Pro tip:* Include the state next time (e.g., "Frankston VIC") to skip this step! 😉`,
    clarification_count: clarificationCount + 1,
  });
}

  // 5. Conditional prompt logic based on intent
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
} else if (detected_intent === 'unsure') { //update this to be more specific to unsure intent
  prompt = `
You are PropSignal AI, a friendly Australian property expert. The user seems unsure or might be testing the waters. Respond with:

- **Warmth and patience**: Use emojis sparingly (e.g., 😊, 🏡).
- **Open-ended suggestions**: Offer 2-3 starting points (investment, lifestyle, renting).
- **Flexibility**: Allow non-property chats (e.g., "Just browsing!" → "No stress! Want a fun fact about Melbourne's housing market?").

Example responses:
- "Keen to explore? Try: 'Best suburbs for first-home buyers?' or 'Where’s rental demand growing fastest?'"
- "No rush! Property’s a big decision. Want to compare two suburbs? Just name them!"
- "All good! Here’s a hot tip: Regional VIC has 6%+ rental yields. Want details?"
`.trim();
}else {
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
  const { data, error } = await supabase
  .from('ai_chat_logs')
  .insert({
    user_input,
    ai_response,
    intent: detected_intent,
    suburb: possible_suburb,
    clarification_count,
  })
  .select('uuid');
  

if (error) {
  console.error('Logging failed:', error);
}

// 8. Send uuid back with response
return NextResponse.json({
  reply: ai_response,
  uuid: data?.[0]?.uuid || null,
});
} catch (error) {
  console.error('❌ API /api/ai-chat failed:', error);

  return new Response(JSON.stringify({ error: 'Sorry, something went wrong. Please try again later.' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
}
