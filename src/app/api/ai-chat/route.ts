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

    //let area = questionAnalysis.targetArea;
    let finalReply = '';
    let isVague = false;
    let lga = null;
    let state = null;
    let topic = questionAnalysis.topic;
    //const targetAreas = questionAnalysis.targetAreas || [];
let area: string | undefined = undefined;
const suburb1 = questionAnalysis.targetAreas?.[0] || '';
const suburb2 = questionAnalysis.targetAreas?.[1] || '';



if (topic === 'compare' && questionAnalysis.targetAreas.length > 1) {
  console.log('[DEBUG route.ts] Multi-suburb comparison requested:', questionAnalysis.targetAreas);
  // In compare flow, do not set area here
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

      const clarificationReply = `I didn't catch which suburb you meant. Could you clarify again?\n\n**Options:**\n• ${optionsList}\n\n**Please reply specifying the state or LGA.**`;

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


// 🚧 Check if the suburb is outside of VIC - 26/07 - to be deleted once other state coverage is added.


if (context?.state && context.state.toUpperCase() !== "VIC") {
  console.log(`[INFO route.ts] Non-VIC suburb detected (${context.state}) — returning coverage notice.`);
let suggestions: string[] = [];
  finalReply = `🚧 **Coverage Notice**\n\nI currently only cover **Victorian suburbs**. Expansion to other states like **${context.state}** is underway.\n\nWant early access in your area? Let me know!`;

  context.clarificationOptions = [];
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
      state: context.state
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
  finalReply = `Great question! Our full suburb profile feature is currently being developed — it will include details like lifestyle insights, local amenities, and growth trends to help you make informed decisions.

In the meantime, here are a few things you can ask about ${area}:
• "What is the median price in ${area}?"
• "Tell me the rental yield for ${area}."
• "Show me price growth trends in ${area}."
• "Are there any new projects in ${area}?"
• "What are the crime stats for ${area}?"

Just type one of these, or ask about anything else you'd like to explore!`;
} else if (topic === 'compare') {
  finalReply = `Thanks for your question! Our suburb comparison feature is currently being developed — it will let you easily compare ${questionAnalysis.targetAreas.join (" and ")} on price trends, rental yields, and more.

While we're building this, you can still explore detailed insights on individual suburbs, one at a time. Here are some example prompts you can try:
• "What is the median price in ${suburb1}?"
• "Tell me the rental yield for ${suburb2}."
• "Show me price growth trends in ${suburb2}."
• "Are there any new projects in ${suburb2}?"
• "What are the crime stats for ${suburb1}?"

Feel free to ask about any of these, or anything else you'd like to explore!`;

} else {
  console.log('[DEBUG route.ts] Preparing AI general response.');
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
