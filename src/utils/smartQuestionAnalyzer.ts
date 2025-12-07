// src/utils/smartQuestionAnalyzer.ts

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type SmartAnalyzedQuestion = {
  // Enhanced analysis fields
  topic: string;
  targetAreas: string[];
  compare: boolean;
  years?: number;
  state: string | null;
  
  // New smart fields
  dataRequirements: string[]; // What data sources are needed
  analysisComplexity: 'simple' | 'moderate' | 'complex'| 'none';
  responseType: 'factual' | 'analytical' | 'advisory';
  contextualFactors: string[]; // Additional context needed
  confidence: number; // How confident the AI is in this analysis (0-100)
  analysisType: 'single_suburb' | 'comparison' | 'search' | 'market_overview' | 'trend_analysis'| 'meta_question';
};

export async function analyzeUserQuestionSmart(userInput: string): Promise<SmartAnalyzedQuestion> {
  console.log('🔍 [SMART] Analyzing user question:', userInput);

  const enhancedAnalysisPrompt = `
You are PropSignal AI's advanced query analyzer. Analyze this property question and determine exactly what data and analysis is needed.

AVAILABLE DATA SOURCES:
- median_prices: Current median house/unit prices
- price_growth: Historical price trends and growth rates
- rental_yields: Rental return percentages and investment metrics  
- crime_data: Safety statistics and crime rates
- new_projects: Development applications and new constructions
- demographics: Population, age, income, education data
- transport_scores: Public transport accessibility ratings
- school_ratings: School catchments and performance
- market_activity: Sales volumes, days on market, auction clearance
- infrastructure: Planned roads, rail, hospitals, shopping centers
- zoning_changes: Rezoning applications and planning changes
- comparable_sales: Recent sales data for price benchmarking

USER QUESTION: "${userInput}"

IMPORTANT: If a suburb is mentioned, you MUST determine its state:
- Use your knowledge of Australian geography to identify which state the suburb is in
- Common Victorian suburbs: Doncaster, Box Hill, Frankston, Melton, Werribee, Dandenong, Hawthorn, Richmond, etc.
- Common NSW suburbs: Parramatta, Bondi, Penrith, Liverpool, Campbelltown, etc.
- Common QLD suburbs: Surfers Paradise, Broadbeach, Southport, etc.
- If you know the suburb, set state to "Victoria", "New South Wales", or "Queensland"
- If uncertain, set state to null

Return JSON with this exact structure:
{
  "topic": "price_growth", 
  "targetAreas": ["Doncaster", "Melton"],
  "compare": true,
  "years": 5,
  "state": "Victoria",
  "dataRequirements": ["median_prices", "price_growth", "demographics"],
  "analysisComplexity": "moderate",
  "responseType": "analytical", 
  "contextualFactors": ["investment_focus", "growth_areas"],
  "confidence": 85
  "analysisType": "comparison"
}

TOPIC CATEGORIES:
- price: Current median prices
- price_growth: Price trends over time  
- crime: Safety and security
- yield: Rental returns and investment metrics
- projects: New developments and infrastructure
- compare: Multi-suburb comparison
- profile: Comprehensive suburb overview
- lifestyle: Livability and community vibe
- investment: Investment-focused analysis
- market_trends: Market dynamics and forecasts
- planning: Future development and zoning
- methodology: Questions about how analysis works, data sources, basis of analysis
- general: Greetings, general chat, unclear questions

ANALYSIS TYPE values:
- single_suburb: Analysis of one specific suburb
- comparison: Comparing multiple suburbs
- search: Finding/recommending suburbs
- market_overview: Broad market analysis
- trend_analysis: Historical trend analysis
- meta_question: Questions about the system itself (methodology, data sources)

RESPONSE TYPE:
- factual: Just the data/facts
- analytical: Data plus interpretation and insights  
- advisory: Analysis plus recommendations and next steps

CONTEXTUAL FACTORS (include if relevant):
- first_home_buyer: First home buyer considerations
- investment_focus: Investment property analysis
- family_friendly: Family considerations (schools, parks, safety)
- growth_areas: High growth potential focus
- budget_conscious: Affordability and value focus
- luxury_market: Premium property segment
- downsizing: Older buyers looking to downsize
- transport_dependent: Public transport priority

CONFIDENCE: Rate 0-100 how confident you are in this analysis

Return ONLY valid JSON, no markdown or extra text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        { role: "system", content: enhancedAnalysisPrompt },
        { role: "user", content: userInput }
      ]
    });

    let jsonText = response.choices[0]?.message?.content || "{}";
    
    // Clean up JSON response
    jsonText = jsonText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    const analyzed = JSON.parse(jsonText);
    console.log('✅ [SMART] Analysis completed:', analyzed);
    return analyzed;

  } catch (error) {
    console.error('❌ [SMART] Failed to parse smart question analysis:', error);
    
    // Enhanced fallback
    return {
      topic: "general",
      targetAreas: [],
      compare: false,
      state: null,
      dataRequirements: ["median_prices"],
      analysisComplexity: "simple",
      responseType: "factual",
      contextualFactors: [],
      confidence: 20,
      analysisType: "single_suburb"
    };
  }
}