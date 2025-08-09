// src/utils/questionAnalyzer.ts

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type AnalyzedQuestion = {
  topic: string; // e.g., "price", "crime", "yield", "profile", "compare", "general", "price_growth", "projects", "lifestyle"
  targetArea: string | null;
};

export async function analyzeUserQuestion(userInput: string) {

  const analysisPrompt = `
You are PropSignal AI's query analyzer. Extract user question details and return JSON ONLY.

Example format:
{
  "topic": "price",
  "targetAreas": ["Doncaster", "Melton"],
  "compare": false,
  "years": 5,
  "state": "Victoria"
}

Topics can include:
- "price": Questions about median house/unit prices
- "crime": Questions about safety, crime rate, offences
- "yield": Questions about rental return, rent-to-value ratios
- "price_growth": Questions about price trends or growth over time
- "projects": New housing developments or infrastructure
- "compare": Comparing two or more suburbs
- "profile": Basic overview of a specific suburb (if no other specific topic fits)
- "lifestyle": Questions about vibe, community feel, suitability for families or professionals
- "general": Very vague or generic questions without a strong signal

Always return JSON object only — no extra text or markdown.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      { role: "system", content: analysisPrompt },
      { role: "user", content: userInput }
    ]
  });

  try {
    let jsonText = response.choices[0]?.message?.content || "{}";

    // Remove any wrapping ```json ... ``` if present
    jsonText = jsonText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    return JSON.parse(jsonText);
  } catch (e) {
    console.error("[ERROR] Failed to parse question analysis:", e);
    return { topic: "general", targetAreas: [], compare: false, state: null };
  }
}

