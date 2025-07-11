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
    let topic = questionAnalysis.topic;
    let finalReply = '';
    let isVague = false;
    let lga = null;
    let state = null;

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

     // ✅ For multi-suburb flow, use topic from original context instead of re-analyzing 
  topic = context.pendingTopic || 'general';
  console.log('[DEBUG route.ts] Using pending topic from context:', topic);

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
      updateContext({ suburb: area, lga: lga, state: state, clarificationOptions: [], pendingTopic: undefined });
    } else {
      // If no match, ask again
      console.log('[DEBUG route.ts] User clarification did not match any options');

      const optionsList = context.clarificationOptions
        .map(opt => `${opt.suburb} (${opt.lga}, ${opt.state})`)
        .join("\n• ");

      const clarificationReply = `I didn't catch which suburb you meant. Could you clarify again?\n\nOptions:\n• ${optionsList}\n\nPlease reply specifying the state or LGA.`;

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
      updateContext({ clarificationOptions: suburbDetection.multipleMatches, pendingTopic: topic });

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
      // ✅ New block: handle no suburb found
if (!suburbDetection.possible_suburb && !suburbDetection.needsClarification) {
  console.log('[DEBUG route.ts] No suburb detected, using AI fallback clarification');

  const aiFallbackMessage = await generateGeneralReply(messages, topic);

  return NextResponse.json({
    reply: aiFallbackMessage,
    clarificationNeeded: true,
    options: []
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
if (area) {
  updateContext({
    suburb: area,
    lga: lga ?? undefined,
    state: state ?? undefined
  });
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

if ((topic === "yield" || topic === "projects") && !lga) {
  throw new Error('route.ts error - LGA is required but missing.');
}

const currentContext = getContext(); // ✅ Declare once, here

if (!area && currentContext.suburb) {
  area = currentContext.suburb;
}

console.log('[DEBUG route.ts] Topic value:', topic, ', Area value:', area);


const topicHandlers: Record<string, () => Promise<string>> = {
  price: () => answerMedianPrice(area),
  crime: () => answerCrimeStats(area),
  yield: () => {
    return answerRentalYield(area, lga!);
  },
  price_growth: () => answerPriceGrowth(area, questionAnalysis.years || 3),
  projects: () => {
    return answerNewProjects(area, lga!);
  }
};


if (area && topicHandlers[topic]) {
  finalReply = await topicHandlers[topic]();
} else if (topic === 'profile') {
  finalReply = `Great! You requested a detailed profile for ${area}. Right now, we haven't implemented full profile yet...`;
} else if (topic === 'compare') {
  finalReply = `Comparison queries are coming soon!`;
} else {
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
