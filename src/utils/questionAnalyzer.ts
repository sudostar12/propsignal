// src/utils/questionAnalyzer.ts

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Backward-compatible type:
 * - Prefer `targetAreas` (array), keep `targetArea` (singular) for legacy code.
 */
export type AnalyzedQuestion = {
  topic: string;                 // e.g., "price", "crime", "yield", "profile", "compare", "general", "price_growth", "projects", "lifestyle"
  targetAreas?: string[];        // preferred
  compare?: boolean;
  years?: number;
  state?: string | null;
  // legacy/compat
  targetArea?: string | null;    // deprecated, left for compatibility
};

// --- Lightweight conversational memory for topic (no external changes needed) ---
let __lastTopic: string | null = null;
const setLastTopic = (t: string | null) => { __lastTopic = t; if (t) console.log("[QA] setLastTopic:", t); };
const getLastTopic = () => __lastTopic;

// Topics your app understands (align with your codebase)
const ALLOWED_TOPICS = [
  "price",
  "crime",
  "yield",
  "price_growth",
  "projects",
  "compare",
  "profile",
  "lifestyle",
  "general",
] as const;
type AllowedTopic = (typeof ALLOWED_TOPICS)[number];

// Map common synonyms to your internal topics (tiny normalization)
const NORMALIZE: Record<string, AllowedTopic> = {
  price: "price",
  prices: "price",
  value: "price",
  valuation: "price",
  median: "price",
  growth: "price_growth",
  trend: "price_growth",
  trends: "price_growth",
  yield: "yield",
  rental_yield: "yield",
  rent_yield: "yield",
  crime: "crime",
  safety: "crime",
  projects: "projects",
  infrastructure: "projects",
  compare: "compare",
  vs: "compare",
  profile: "profile",
  overview: "profile",
  lifestyle: "lifestyle",
  general: "general",
};

const FOLLOW_UP_RE = /^(what about|how about|and|vs|versus|compare( with| to)?|compared to)\b/i;

/**
 * Phase-1 improved analyzer:
 * - Uses JSON response_format for clean outputs
 * - Hints the model with the previous topic
 * - Inherits previous topic on short follow-ups if model returns ambiguous/general/profile
 * - Validates and normalizes the result
 *
 * No signature changes; safe drop-in replacement.
 */
export async function analyzeUserQuestion(userInput: string): Promise<AnalyzedQuestion> {
  const prevTopic = getLastTopic();
  const looksLikeFollowUp = FOLLOW_UP_RE.test(userInput.trim());

  // System prompt kept tight and deterministic
  const analysisPrompt = `
You are PropSignal AI's query analyzer. Extract user question details and return JSON ONLY.

Return a single JSON object exactly in this shape (no markdown, no extra text):
{
  "topic": "<one of: price, crime, yield, price_growth, projects, compare, profile, lifestyle, general>",
  "targetAreas": ["<suburb or locality names, if any>"],
  "compare": <true|false>,
  "years": <number or null>,
  "state": "<state name or null>"
}

Rules:
- "price": questions about median house/unit prices
- "price_growth": questions about price trends or growth over time
- "yield": rental yield / rent-to-value
- "crime": safety, crime rate, offences
- "projects": new housing or infrastructure projects
- "compare": explicit comparison requests
- "profile": overview when nothing else fits
- "lifestyle": vibe/community/family suitability
- "general": vague/unspecified queries

Context:
- Previous topic (if any): ${prevTopic ?? "none"}
- If the user message is a short follow-up like "what about <suburb>" and a previous topic exists, prefer inheriting the previous topic unless the user clearly changed the intent.

Always return valid JSON only.
`.trim();

  // Call OpenAI with strict JSON response
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: analysisPrompt },
      { role: "user", content: userInput }
    ],
  });

  // Parse safely
  let parsed: any = {};
  try {
    parsed = JSON.parse(resp.choices?.[0]?.message?.content ?? "{}");
  } catch (e) {
    console.error("[ERROR] Failed to parse analyzer JSON:", e);
    parsed = {};
  }

  // Normalize & validate
  let topicRaw = (parsed.topic ?? "").toString().toLowerCase().trim();
  // Normalize synonyms to your allowed set
  topicRaw = NORMALIZE[topicRaw] ?? topicRaw;
  if (!ALLOWED_TOPICS.includes(topicRaw as AllowedTopic)) {
    topicRaw = "general";
  }

  // Ensure array
  let targetAreas: string[] = Array.isArray(parsed.targetAreas)
    ? parsed.targetAreas.map((s: any) => (s ?? "").toString().trim()).filter(Boolean)
    : [];

  const compare: boolean = Boolean(parsed.compare);
  const years: number | undefined =
    typeof parsed.years === "number" && Number.isFinite(parsed.years) ? parsed.years : undefined;
  const state: string | null =
    typeof parsed.state === "string" && parsed.state.trim() ? parsed.state.trim() : null;

  // Inherit previous topic for short follow-ups if AI returned ambiguous topics
  const ambiguous = topicRaw === "general" || topicRaw === "profile";
  const shortFollowUp = looksLikeFollowUp || (targetAreas.length > 0 && userInput.trim().split(/\s+/).length <= 4);

  if (prevTopic && ambiguous && shortFollowUp) {
    console.log(`[QA] Inheriting previous topic "${prevTopic}" for follow-up:`, userInput);
    topicRaw = prevTopic;
  }

  // Persist the topic for the next turn
  setLastTopic(topicRaw);

  // Backward-compat: also set singular targetArea (first item or null)
  const result: AnalyzedQuestion = {
    topic: topicRaw,
    targetAreas,
    compare,
    years,
    state,
    targetArea: targetAreas[0] ?? null,
  };

  console.log("[QA] Analysis result:", result);
  return result;
}
