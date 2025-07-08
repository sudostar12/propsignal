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

        finalReply = `Here's a side-by-side comparison:\n\n${results.join("\n\n")}`;
    }
  
// ============================
// [DEBUG-S5.2] STATE-LEVEL QUERY HANDLING
// ============================

else {
      if (!area) {
        const suburbDetection = await detectSuburb(userInput);
        if (suburbDetection.possible_suburb) {
          area = suburbDetection.possible_suburb;
          console.log('[DEBUG] Suburb auto-detected:', area);
        }
      }

if (area) {
  console.log('[DEBUG] Looking up LGA and State for suburb:', area);
  const { data: suburbInfo, error: suburbError } = await supabase
    .from('lga_suburbs')
    .select('lga, state')
    .eq('suburb', area)
    .single();

  if (suburbError) {
    console.error('[ERROR] Failed to lookup suburb details:', suburbError);
  } else if (suburbInfo) {
    lga = suburbInfo.lga;
    state = suburbInfo.state;
    console.log('[DEBUG] Found LGA:', lga, 'State:', state);
  }
}


      if (area) {
        updateContext({ suburb: area });
      }

      const context = getContext();
      console.log('[DEBUG] Current context:', context);

      if (topic === 'price' && area) {
        finalReply = await answerMedianPrice(area);
      } else if (topic === 'crime' && area) {
        finalReply = await answerCrimeStats(area);
      } else if (topic === 'yield' && area) {
        finalReply = await answerRentalYield(area);
      }  else if (topic === 'price_growth' && area) {
        finalReply = await answerPriceGrowth(area, questionAnalysis.years || 5);
      } else if (topic === 'projects' && area) {
        finalReply = await answerNewProjects(area);
      } else if (topic === 'profile' && area) {
        finalReply = `Great! You requested a detailed profile for ${area}. Right now, we haven't implemented full profile in this new flow yet, but it's coming soon! Meanwhile, feel free to ask about prices, crime, rental yield, or other specific insights.`;
      } else if (topic === 'compare') {
        finalReply = `Comparison queries are coming soon! You can meanwhile ask individual suburb questions.`;
      } else {
        finalReply = await generateGeneralReply(messages, topic);
        isVague = true;
      }
    }

 // ===============================
    // ✅ Central Logging Block
    // ===============================
    console.log('[DEBUG-LOG] Preparing to log to database');
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
      console.error('[ERROR-LOG] Logging failed:', error);
    } else {
      console.log('[DEBUG-LOG] Conversation logged successfully, UUID:', data?.[0]?.uuid);
    }

    return NextResponse.json({ reply: finalReply, uuid: data?.[0]?.uuid || null });
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
