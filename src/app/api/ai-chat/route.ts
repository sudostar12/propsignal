import { NextRequest, NextResponse } from 'next/server';
//import OpenAI from 'openai';
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


//const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    console.log('\n[DEBUG route.ts] ======== NEW REQUEST ========');

    const { messages } = await req.json();
    const userInput = messages?.[messages.length - 1]?.content || '';
    console.log('[DEBUG route.ts] User input:', userInput);

    // STEP 1️⃣ — Analyze user question
    const questionAnalysis = await analyzeUserQuestion(userInput);
    console.log('[DEBUG route.ts] Question analysis:', questionAnalysis);

    let area = questionAnalysis.targetArea;
    const topic = questionAnalysis.topic;
    let finalReply = '';
    let isVague = false;
    let lga = null;
    let state = null;

    // ============================
    // [DEBUG-S5.1] MULTI-SUBURB COMPARISON HANDLING
    // ============================

if (questionAnalysis.compare && questionAnalysis.targetAreas && questionAnalysis.targetAreas.length > 1) {
  console.log('[DEBUG-route.ts] Multi-suburb comparison requested:', questionAnalysis.targetAreas);

  const results: string[] = [];

  for (const suburb of questionAnalysis.targetAreas) {
    let result = "";

    if (questionAnalysis.topic === "crime") {
      result = await answerCrimeStats(suburb);
    } else if (questionAnalysis.topic === "price") {
      result = await answerMedianPrice(suburb);
    } else if (questionAnalysis.topic === "yield") {
      result = await answerRentalYield(suburb);
    } else {
      result = `I don't yet support "${questionAnalysis.topic}" data.`;
    }

    results.push(`**${suburb}:** ${result}`);
  }

        finalReply = `Here's a side-by-side comparison:\n\n${results.join("\n\n")}`;
    }
  
// ============================
// [DEBUG-S5.2] STATE-LEVEL QUERY HANDLING
// ============================

else {
  const context = getContext();

  // 1️⃣ Check if we are expecting suburb clarification
  if (context.clarificationOptions && context.clarificationOptions.length > 0) {
    console.log('[DEBUG route.ts] User provided clarification input:', userInput);

    // Try to match user clarification to stored options
    const userInputNormalized = userInput.trim().toLowerCase();
    const clarifiedMatch = context.clarificationOptions.find(opt =>
      opt.state?.toLowerCase() === userInputNormalized ||
      opt.lga?.toLowerCase().includes(userInputNormalized) ||
      opt.suburb.toLowerCase().includes(userInputNormalized)
    );

    if (clarifiedMatch) {
      console.log('[DEBUG route.ts] User clarification matched:', clarifiedMatch);

      // Update area, lga, state
      area = clarifiedMatch.suburb;
      lga = clarifiedMatch.lga;
      state = clarifiedMatch.state;

      // Clear clarification options from context
      updateContext({ suburb: area, lga: lga, state: state, clarificationOptions: [] });
    } else {
      // If no match, ask again
      console.log('[DEBUG route.ts] User clarification did not match any options');

      const optionsList = context.clarificationOptions
        .map(opt => `${opt.suburb} (${opt.lga}, ${opt.state})`)
        .join("\n• ");

      const clarificationReply = `I didn't catch which suburb you meant. Could you clarify again?\n\nOptions:\n• ${optionsList}\n\nPlease reply specifying suburb, state, or LGA.`;

      return NextResponse.json({
        reply: clarificationReply,
        clarificationNeeded: true,
        options: context.clarificationOptions
      });
    }
  }

    if (!area && topic !== "general") {
    const suburbDetection = await detectSuburb(userInput);

    if (suburbDetection.needsClarification && suburbDetection.multipleMatches) {
      console.log('[DEBUG route.ts] Multiple matches found, storing clarification options in context');

      // Store options in context
      updateContext({ clarificationOptions: suburbDetection.multipleMatches });

      const optionsList = suburbDetection.multipleMatches
        .map(opt => `${opt.suburb} (${opt.lga}, ${opt.state})`)
        .join("\n• ");

      const clarificationReply = `I found multiple suburbs named "${suburbDetection.extractedSuburb}". Which one do you mean?\n\n• ${optionsList}\n\nPlease reply specifying the state or LGA.`;

      return NextResponse.json({
        reply: clarificationReply,
        clarificationNeeded: true,
        options: suburbDetection.multipleMatches
      });
    }

    if (suburbDetection.possible_suburb) {
      area = suburbDetection.possible_suburb;
      lga = suburbDetection.lga;
      state = suburbDetection.state;
      console.log('[DEBUG route.ts] Suburb auto-detected:', area);

      // Update context
      updateContext({ suburb: area, lga, state, clarificationOptions: [] });
    }
  }
if (area) {
  updateContext({
    suburb: area,
    lga: lga ?? undefined,
    state: state ?? undefined
  });
}

  console.log('[DEBUG route.ts] Current context:', getContext());
}


if (area && (!lga || !state)) {
  console.log('[DEBUG route.ts] Looking up LGA and State for suburb:', area);
  const { data: suburbInfo, error: suburbError } = await supabase
    .from('lga_suburbs')
    .select('lga, state')
    .eq('suburb', area)
    .single();

  if (suburbError) {
    console.error('[ERROR: route.ts] Failed to lookup suburb details:', suburbError);
  } else if (suburbInfo) {
    lga = suburbInfo.lga;
    state = suburbInfo.state;
    console.log('[DEBUG route.ts] Found LGA:', lga, 'State:', state);
  }

  updateContext({ suburb: area, lga: lga ?? undefined, state: state ?? undefined });

  console.log('[DEBUG route.ts] Current context:', getContext());

  if (topic === 'price') {
    finalReply = await answerMedianPrice(area);
  } else if (topic === 'crime') {
    finalReply = await answerCrimeStats(area);
  } else if (topic === 'yield') {
    finalReply = await answerRentalYield(area);
  } else if (topic === 'price_growth') {
    finalReply = await answerPriceGrowth(area, questionAnalysis.years || 5);
  } else if (topic === 'projects') {
    finalReply = await answerNewProjects(area);
  } else if (topic === 'profile') {
    finalReply = `Great! You requested a detailed profile for ${area}. Right now, we haven't implemented full profile yet...`;
  } else if (topic === 'compare') {
    finalReply = `Comparison queries are coming soon!`;
  } else {
    // ⚠️ fallback still inside — needs to be outside if area exists but topic is general
    finalReply = await generateGeneralReply(messages, topic);
    isVague = true;
  }
} else {
  // 💥 If no area, handle general fallback
  finalReply = await generateGeneralReply(messages, topic);
  isVague = true;
}

const currentContext = getContext();

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
      suggestions // ← include in response for UI buttons
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
