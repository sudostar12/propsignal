import { NextRequest, NextResponse } from 'next/server';
//import OpenAI from 'openai';
import { analyzeUserQuestion } from '@/utils/questionAnalyzer';
import { updateContext, getContext } from '@/utils/contextManager';
//import { answerMedianPrice, answerCrimeStats, answerRentalYield } from '@/utils/answerFunctions';  - DELETE this entry after testing 08/7/2025
import { answerCrimeStats } from "@/utils/answers/crimeAnswer";
import { answerMedianPrice } from "@/utils/answers/medianPriceAnswer";
import { answerRentalYield } from "@/utils/answers/rentalYieldAnswer";

import { generateGeneralReply } from '@/utils/detectIntent';
import { detectSuburb } from '@/utils/detectSuburb';

//const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    console.log('\n[DEBUG] ======== NEW REQUEST ========');

    const { messages } = await req.json();
    const userInput = messages?.[messages.length - 1]?.content || '';
    console.log('[DEBUG] User input:', userInput);

    // STEP 1️⃣ — Analyze user question
    const questionAnalysis = await analyzeUserQuestion(userInput);
    console.log('[DEBUG] Question analysis:', questionAnalysis);

    // ============================
    // [DEBUG-S5.1] MULTI-SUBURB COMPARISON HANDLING
    // ============================

if (questionAnalysis.compare && questionAnalysis.targetAreas && questionAnalysis.targetAreas.length > 1) {
  console.log('[DEBUG-S5.1] Multi-suburb comparison requested:', questionAnalysis.targetAreas);

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

  const compareReply = `Here's a side-by-side comparison:\n\n${results.join("\n\n")}`;

  return NextResponse.json({
    reply: compareReply,
    comparedSuburbs: questionAnalysis.targetAreas
  });
}
// ============================
// [DEBUG-S5.2] STATE-LEVEL QUERY HANDLING
// ============================

if (questionAnalysis.state && (!questionAnalysis.targetAreas || questionAnalysis.targetAreas.length === 0)) {
  console.log('[DEBUG-S5.2] State-level query detected:', questionAnalysis.state);

  const stateReply = `You're asking about ${questionAnalysis.topic} across all of ${questionAnalysis.state}. Right now, I specialize in suburb-level data. Would you like me to suggest a few suburbs in ${questionAnalysis.state} to explore further?`;

  return NextResponse.json({ 
    reply: stateReply,
    state: questionAnalysis.state
  });
}

    let area = questionAnalysis.targetArea;
    const topic = questionAnalysis.topic;

    // STEP 2️⃣ — Detect suburb if not already set
    if (!area) {
      const suburbDetection = await detectSuburb(userInput);
      if (suburbDetection.possible_suburb) {
        area = suburbDetection.possible_suburb;
        console.log('[DEBUG] Suburb auto-detected:', area);
      }
    }

    // Update context
    if (area) {
      updateContext({ suburb: area });
    }
    const context = getContext();
    console.log('[DEBUG] Current context:', context);

    let reply = '';

    // STEP 3️⃣ — Decide what to answer based on topic
    if (topic === 'price' && area) {
      reply = await answerMedianPrice(area);
    } else if (topic === 'crime' && area) {
      reply = await answerCrimeStats(area);
    } else if (topic === 'yield' && area) {
      reply = await answerRentalYield(area);
    } else if (topic === 'profile' && area) {
      reply = `Great! You requested a detailed profile for ${area}. Right now, we haven't implemented full profile in this new flow yet, but it's coming soon! Meanwhile, feel free to ask about prices, crime, rental yield, or other specific insights.`;
    } else if (topic === 'compare') {
      reply = `Comparison queries are coming soon! You can meanwhile ask individual suburb questions.`;
    } else {
      // Default: general guidance or fallback
      reply = await generateGeneralReply(messages, topic);
    }

    console.log('[DEBUG] Final AI reply:', reply);

    return NextResponse.json({ reply, context });
  } catch (err) {
    console.error('[ERROR] /api/ai-chat crashed:', err);
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
