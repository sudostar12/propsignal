// src/app/api/ai-chat-smart/route.ts


//import { analyzeUserQuestionSmart } from '@/utils/smartQuestionAnalyzer';
//import { fetchSmartRequiredData, generateSmartResponse } from '@/utils/smartDataOrchestrator';
//import { supabase } from '@/lib/supabaseClient';

// Import existing utilities for fallback compatibility

//import { getSuggestionsForTopic } from '@/utils/suggestions';
//import { detectSuburb } from '@/utils/detectSuburb';
//import { generateGeneralReply } from '@/utils/detectIntent';

// src/app/api/ai-chat-smart/route.ts
// Smart planner → executor → formatter pipeline
// - All DB I/O goes through fetchRentalData helpers (no raw SQL here)
// - Returns the same response shape as /api/ai-chat

import { NextResponse } from "next/server";
import { planUserQuery } from "@/utils/smartPlanner";
import { executePlan } from "@/utils/smartExecutor";
import { formatMarkdownReply, FormatterResult } from "@/utils/responseFormatter";
import { generateRentalYieldSummary } from "@/utils/fetchRentalData";
import { getContext } from '@/utils/contextManager';
//import { planFiltersOnly } from "@/utils/smartPlanner";
//import { executeFilterPlan } from "@/utils/dynamicExecutor";

// Safe UUID for both Node/Edge
function safeUUID(): string {
  try {
    
    return (globalThis.crypto?.randomUUID?.() as string) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages ?? [];
    const useSmartSystem = body?.useSmartSystem ?? true;

    console.log("[ai-chat-smart] POST received", {
      messagesLen: Array.isArray(messages) ? messages.length : 0,
      useSmartSystem,
    });

    // 1) PLAN — build a typed QueryPlan from the conversation
    const plan = await planUserQuery(messages);
    console.log("[ai-chat-smart] plan", plan);

    // Optionally enrich plan with nearby suburbs from your context
    const ctx = typeof getContext === "function" ? getContext() : undefined;
    if (plan?.compare?.nearby && (!plan.compare.suburbs || plan.compare.suburbs.length === 0)) {
      const nb = ctx?.nearbySuburbs || [];
      if (nb.length) {
        plan.compare.suburbs = nb.slice(0, 2);
        console.log("[ai-chat-smart] injected nearby from context", plan.compare.suburbs);
      }
    }

    // 2) EXECUTE — run the plan via your fetchRentalData helpers (no raw SQL)
    const result = await executePlan(plan);
    if (result?.error) {
      console.warn("[ai-chat-smart] execution error", result.error);
      return NextResponse.json({
        reply: `Sorry, I couldn't process that. ${result.error}`,
        uuid: safeUUID(),
        suggestions: ["Specify a suburb and state, e.g., 'Doncaster VIC 3108'"],
        showCopy: true,
        allowFeedback: true,
        clarificationNeeded: true,
        smartMetadata: { plan, result },
      });
    }
// Type assertion after confirming no error
const successResult = result as Record<string, unknown>;

// 3) SUMMARY — reuse your existing OpenAI summary builder
const yearForSummary =
  (successResult.latestYieldYear as number | null) ??
  ((successResult.latestPR as { year?: number })?.year) ??
  new Date().getFullYear();

const nearbyInsights = ((successResult.nearbyCompare as { rows?: unknown[] })?.rows || []).map((r: unknown) => {
  const row = r as { suburb: string; house?: number; unit?: number };
  return {
    suburb: row.suburb,
    houseYield: typeof row.house === "number" ? row.house : undefined,
    unitYield: typeof row.unit === "number" ? row.unit : undefined,
  };
});

const latestYield = successResult.latestYield as { house?: number; unit?: number } | undefined;
const capitalAvg = successResult.capitalAvg as { house?: number; unit?: number } | undefined;

// Only call generateRentalYieldSummary if we have at least house yield data
const houseYield = typeof latestYield?.house === "number" ? latestYield.house : undefined;

let summary: string;

if (houseYield !== undefined) {
  summary = await generateRentalYieldSummary({
    suburb: plan.suburb!,
    year: yearForSummary,
    userHouseYield: houseYield, // Now guaranteed to be number
    userUnitYield: typeof latestYield?.unit === "number" ? latestYield.unit : undefined,
    nearbyInsights,
    state: plan.state || "VIC",
    stateAvgHouseYield: typeof capitalAvg?.house === "number" ? capitalAvg.house : undefined,
    stateAvgUnitYield: typeof capitalAvg?.unit === "number" ? capitalAvg.unit : undefined,
  });
} else {
  // Fallback summary when no house yield data is available
  summary = "Unable to generate yield analysis - insufficient house yield data available.";
}

if (houseYield !== undefined) {
  summary = await generateRentalYieldSummary({
    suburb: plan.suburb!,
    year: yearForSummary,
    userHouseYield: houseYield,
    userUnitYield: typeof latestYield?.unit === "number" ? latestYield.unit : undefined,
    nearbyInsights,
    state: plan.state || "VIC",
    stateAvgHouseYield: typeof capitalAvg?.house === "number" ? capitalAvg.house : undefined,
    stateAvgUnitYield: typeof capitalAvg?.unit === "number" ? capitalAvg.unit : undefined,
  });
} else {
  summary = "Unable to generate yield analysis - insufficient house yield data available.";
}

// 4) FORMAT — produce your standard markdown body
const markdown = `${formatMarkdownReply(plan.suburb!, successResult as FormatterResult)}
 
🧭 **Summary**
${summary}

💡 Data uses suburb-level rollups (bedroom = null) plus bedroom snapshots when requested.`;

    // 5) RESPOND — exact shape your UI expects
    return NextResponse.json({
      reply: markdown,
      uuid: safeUUID(),
      suggestions: [
        "Show 5-year trends for both types",
        "Compare with 2 nearby suburbs",
        "Give 4BR vs 3BR house snapshot",
      ],
      showCopy: true,
      allowFeedback: true,
      clarificationNeeded: false,
      smartMetadata: { plan, result },
    });
  } catch (err: unknown) {
    console.error("[ai-chat-smart] fatal error", err);
    return NextResponse.json(
      {
        reply: "Sorry, something went wrong while planning/executing your request.",
        uuid: safeUUID(),
        suggestions: [],
        showCopy: true,
        allowFeedback: true,
        clarificationNeeded: true,
        smartMetadata: { error: err instanceof Error ? err.message : String(err) },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "ai-chat-smart" });
}
