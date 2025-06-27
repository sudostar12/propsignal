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

// ======================
// Helper Functions
// ======================
async function detectGibberish(input: string): Promise<boolean> {
  const trimmed = input.trim().toLowerCase();
  
  // 1. Ultra-short non-words
  if (trimmed.length <= 3 && !['hi', 'hey', 'sup', 'yo'].includes(trimmed)) {
    return true;
  }

  // 2. Common typo patterns (add more as needed)
  const typoPatterns = [
    /^[hw]a?[sz]{1,2}\s?y[ae]$/, // "hwss ya", "hws ya", etc
    /^n[o']?t?\s?s[uo]r/,        // "nto sur", "not sur"
  ];

  if (typoPatterns.some(regex => regex.test(trimmed))) {
    return true;
  }
 

  // 3. GPT-4o fallback for ambiguous cases
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',  // CHANGED TO GPT-4O
      temperature: 0,
      messages: [{
        role: 'system',
        content: `Is this likely a typo/mistake? Reply ONLY "yes" or "no":\n"${input}"`
      }]
    });
    return res.choices[0].message.content?.toLowerCase().trim() === 'yes';
  } catch {
    return false; // Fail open
  }
}

function getTypoResponse(input: string, isFollowUp: boolean): string {
  // Stage 1: Try gentle correction
    const corrections: Record<string, string> = {
      'hr ya': 'how are ya',
      'hrya': 'how are ya', 
      'nnr sur': 'not sure',
      'din knw': "don't know"
    };

    const corrected = corrections[input.toLowerCase()] || 
      (input.length <= 5 ? input : 'that');

  // Phase 2: Determine response based on follow-up status
  if (isFollowUp) {
    return `I'm not sure what you mean. Try one of these:\n` +
           `• "Top suburbs for families"\n` +
           `• "Best investment areas under $800k"\n` +
           `• Or just say a suburb name`;
  }

  // Initial response
  return `Did you mean "${corrected}"? Ask about:\n` +
         `• Suburbs to live/invest\n` +
         `• Rental market insights\n` +
         `• Property trends`;
}

// ======================
// Main API Handler
// ======================

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

    // ======================
    // 1. Input Validation Layer
    // ======================
    // A. Gibberish/Typo Detection
    const isGibberishOrTypo = await detectGibberish(user_input);

    if (isGibberishOrTypo) {
      return NextResponse.json({
        role: 'assistant',
        message: getTypoResponse(user_input, messages.length > 1),
        clarification: true,
      });
    }

    // B. Generic Query Detection
    const genericQueries = [
      "weather", "hi", "hello", "how are you", "what's up", "help", 
      "who are you", "what can you do", "hey", "sup", 'what\'s up', 'how\'s it going', 
      'sup', 'yo', 'hi', 'hello', 'hey', 'greetings',
      'howdy', 'good morning', 'good afternoon'
    ];

    const isGenericQuery = (
      genericQueries.some(phrase => 
        user_input.toLowerCase().includes(phrase)) ||
      (user_input.trim().length <= 5 && !isGibberishOrTypo)
    );

    if (isGenericQuery) {
      return NextResponse.json({
        role: 'assistant',
        message: `🏡 G'day! I'm your Aussie property expert. Try:\n\n` +
                `• "Best suburbs under $700k in Sydney?"\n` +
                `• "Where should I invest in Melbourne?"\n` +
                `• "Tell me about Brisbane's rental market"`,
        clarification: true
      });
    }

    // ======================
    // 2. Property-Specific Logic
    // ======================
    // A. Intent Detection (GPT-4o)
    let detected_intent = null;
    try {
      const intentDetection = await openai.chat.completions.create({
        model: 'gpt-4o',  // CHANGED TO GPT-4O
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
      if (!['invest', 'live', 'rent', 'unsure', 'chat'].includes(detected_intent ?? '')) {
        detected_intent = null; // fallback in case GPT returns something unexpected
      }
// Add this new condition before suburb detection (~line 220):
if (detected_intent === 'chat') {
  return NextResponse.json({
    role: 'assistant',
    message: `Hey there! 👋 I'm your Aussie property helper. Ask me about suburbs, investments, or rentals!`,
    clarification: true
  });
}

    } catch (error) {
      console.error('Intent detection failed:', error);
    }

     // B. Suburb Matching (case-insensitive, multi-word, DB-driven)
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
        message: `Thanks for mentioning "${possible_suburb}". Just to guide you better — are you looking to invest, live, or rent in this suburb?\n\nEach goal shifts what I focus on:\n• Invest → growth, rental yield, approvals\n• Live → family-friendliness, safety, schools\n• Rent → rent levels, affordability, vacancy\n\nLet me know and I'll tailor the insights for ${possible_suburb}!`,
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

    // 4.5 🔁 If suburb matches multiple states, clarify
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
You are PropSignal AI, a buyer's agent assistant helping users assess suburbs in Australia for property investment. Ask for clarification if the user's query is vague.

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
    } else if (detected_intent === 'unsure') {
      prompt = `
You're a friendly property expert. The user seems unsure or might be testing the waters. Respond with:
1. Warmth and patience. Always include ONE emoji max (e.g., 😊, 🏡).
2. A VERY brief property-related fun fact (1 sentence)
3. An open question about their needs
4. Flexibility: Allow non-property chats (e.g., "Just browsing!" → "No stress! Want a fun fact about Melbourne's housing market?").

Example:
"Fun fact: Melbourne home prices grew 62% in 10 years! 🏡 Want to explore a specific suburb?" 
"Regional VIC has 6%+ rental yields. Need help narrowing down areas?"
      `.trim();
    } else {
      prompt = `
      You're PropSignal AI, an Australian property expert. Respond to the user's query about:
      ${detected_intent || 'general property advice'} 
      ${possible_suburb ? `in ${possible_suburb}` : ''}.
      Be concise, friendly, and include 1-2 key insights.
    `.trim();
    }

    // 6. 🤖 Generate AI chat reply
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',  // CHANGED TO GPT-4O
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

    // 💾 Log to Supabase
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
    return new Response(JSON.stringify({ error: 'Sorry, something went wrong. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}