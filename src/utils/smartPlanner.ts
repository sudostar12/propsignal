// src/utils/smartPlanner.ts
import OpenAI from "openai";
import { schemaRegistry, PT } from "./schemaRegistry";
//import { TableQuery } from "./queryFilters";
import type { TTableQuery } from "./queryFilters"; 
import type {
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions";

export type QueryAction =
  | "yield_latest"
  | "yield_series"
  | "price_rent_latest"
  | "bedroom_snapshot"
  | "compare_nearby";

export type FilterPlan = {
  tableQueries: TTableQuery[];  // generic pulls the model wants
  // optional: what metric to derive after fetch
  derive?: Array<"yield_pct">;                 // add more later (growth, etc.)
};

// Keep your existing make_query_plan tool.
// ADD a second tool that returns generic table queries.
const filterTools: ChatCompletionTool[] = [
  {
    type: "function" as const,
    function: {
      name: "make_filter_plan",
      description:
        "Return generic tableQueries (median_price / median_rentals) with select & filters. Use bedroom when specified by user. Prefer bedroom=NULL (rollup) if bedroom not specified.",
      parameters: {
        type: "object",
        properties: {
          tableQueries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id:      { type: "string" },
                table:   { type: "string", enum: ["median_price","median_rentals"] },
                select:  { type: "array", items: { type: "string" } },
                filters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      col:   { type:"string", enum: ["suburb","postcode","state","year","propertyType","bedroom"] },
                      op:    { type:"string", enum: ["eq","in","between","is_null","not_null"] },
                      value: { type:["string","number","null"] },
                      values:{ type:"array", items: { type:["string","number","null"] } }
                    },
                    required: ["col","op"]
                  }
                },
                orderBy: {
                  type: "object",
                  properties: { col:{type:"string",enum:["year"]}, dir:{type:"string",enum:["asc","desc"]} }
                },
                limit:   { type:"integer" }
              },
              required: ["id","table","select"]
            }
          },
          derive: { type: "array", items: { type: "string", enum: ["yield_Pct"] } }
        },
        required: ["tableQueries"]
      }
    }
  }
] as const;

// New entry point (optional) to ask only for filters when free-form requests arrive
export async function planFiltersOnly(
  messages: { role: "user" | "assistant" | "system"; content: string }[]
) {
  const toolChoice: ChatCompletionToolChoiceOption = {
    type: "function",
    function: { name: "make_filter_plan" },
  };

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages,
    tools: filterTools,          // ✅ typed as ChatCompletionTool[]
    tool_choice: toolChoice,     // ✅ typed as ChatCompletionToolChoiceOption
  });

  const call = resp.choices[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  const args = JSON.parse(call.function.arguments || "{}");
  return args as FilterPlan;
}

export type QueryPlan = {
  actions: QueryAction[];
  suburb?: string;
  state?: string;
  propertyTypes?: PT[];
  bedroom?: number | null;
  bedrooms?: number[] | null;
  years?: { lastN?: number; from?: number; to?: number };
  compare?: { nearby?: boolean; suburbs?: string[] };
  wantMarkdown?: boolean;
  
  // ✅ NEW: Support for all query types
  intent?: 'rental_yield' | 'crime_stats' | 'median_price' | 'price_growth' | 'new_projects' | 'suburb_profile' | 'demographics';
  dataNeeded?: string[]; // e.g., ['crime', 'price', 'yield', 'demographics']
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Ask GPT to produce a typed QueryPlan via function calling. */
export async function planUserQuery(
  messages: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<QueryPlan> {
  const planTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "make_query_plan",
      description:
        "Create a QueryPlan for Australian property analytics. If the user asks for a bedroom (e.g., '3BR unit'), set bedroom to that integer. If they ask multiple (e.g., '4BR vs 3BR'), set bedrooms to the list. Otherwise use bedroom=null rollups.",
      parameters: {
        type: "object",
        properties: {
          actions: {
            type: "array",
            items: { type: "string", enum: ["yield_latest","yield_series","price_rent_latest","bedroom_snapshot","compare_nearby"] },
          },
          suburb: { type: "string" },
          state: { type: "string", description: "VIC/NSW/QLD…" },
          propertyTypes: {
            type: "array",
            items: { type: "string", enum: ["house","unit"] },
          },
          bedroom:  { type: "integer", nullable: true },
          bedrooms: { type: "array", nullable: true, items: { type: "integer" } },
          years: {
            type: "object",
            properties: {
              lastN: { type: "integer" },
              from:  { type: "integer" },
              to:    { type: "integer" },
            },
          },
          compare: {
            type: "object",
            properties: {
              nearby:  { type: "boolean" },
              suburbs: { type: "array", items: { type: "string" } },
            },
          },
          wantMarkdown: { type: "boolean" },
        },
        required: ["actions"],
      },
    },
  },
];

  const system = [{
    role: "system" as const,
    content:
`You plan data fetches for an Australian property analytics agent.
- Tables: ${Object.keys(schemaRegistry.tables).join(", ")}.
- Column rules:
  • median_price: ${schemaRegistry.tables.median_price.columns.join(", ")}
  • median_rentals: ${schemaRegistry.tables.median_rentals.columns.join(", ")}
- propertyType: ${schemaRegistry.enums.propertyType.join(" | ")}.
- If user mentions a bedroom (e.g., '4 bedroom house'), set bedroom to that integer.
- If user asks for yields, include "yield_latest" and default "yield_series" with lastN=3 unless user asks otherwise.
- If user asks for '3BR price' or 'rent for 2BR unit', include "bedroom_snapshot".
- If user asks to compare or mentions nearby, include "compare_nearby".
- Always return a single call to make_query_plan.`,
  }];

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [...system, ...messages],
    tools: planTools,
    tool_choice: { type: "function", function: { name: "make_query_plan" } },
  });

  const tool = resp.choices[0]?.message?.tool_calls?.[0];
  if (!tool) {
    console.warn("[planner] No plan produced; returning safe default.");
    return { actions: ["yield_latest", "yield_series", "price_rent_latest"], wantMarkdown: true };
  }

  const args = JSON.parse(tool.function.arguments || "{}");

// Normalize defaults
if (!args.propertyTypes?.length) args.propertyTypes = ["house","unit"];
if (!args.years) args.years = { lastN: 3 };

// Multi-bedroom hygiene
// Multi–bedroom hygiene (fix: Number.isInteger)
if (Array.isArray(args.bedrooms)) {
  args.bedrooms = Array.from(
    new Set(
      (args.bedrooms as unknown[])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && Number.isInteger(n))
    )
  );
  if (!args.bedroom && args.bedrooms.length === 1) {
    args.bedroom = args.bedrooms[0];
  }
}

// If asking for bedroom snapshots, also fetch medians for header context
if (Array.isArray(args.actions) &&
    args.actions.includes("bedroom_snapshot") &&
    !args.actions.includes("price_rent_latest")) {
  args.actions.push("price_rent_latest");
}

if (!args.propertyTypes?.length) args.propertyTypes = ["house", "unit"];
  if (!args.years) args.years = { lastN: 3 };
  
  // ✅ NEW: If user is asking about non-yield topics, enhance the plan
  const userInput = messages[messages.length - 1]?.content || '';
  const lowerInput = userInput.toLowerCase();
  
  // Detect if this is NOT a rental yield question
  const isNonYieldQuery = 
    lowerInput.includes('crime') || 
    lowerInput.includes('safe') ||
    lowerInput.includes('growth') ||
    lowerInput.includes('project') ||
    lowerInput.includes('development') ||
    lowerInput.includes('demographic') ||
    lowerInput.includes('population') ||
    (!lowerInput.includes('yield') && !lowerInput.includes('rent') && lowerInput.includes('price'));
  
  if (isNonYieldQuery) {
    console.log('[planner] Non-yield query detected, using smartQuestionAnalyzer');
    
    // Import and use your existing smart analyzer
    const { analyzeUserQuestionSmart } = await import('./smartQuestionAnalyzer');
    const smartAnalysis = await analyzeUserQuestionSmart(userInput);
    
    // Enrich the plan with smart analysis
    args.intent = mapTopicToIntent(smartAnalysis.topic);
    args.dataNeeded = smartAnalysis.dataRequirements;
    
    console.log('[planner] Enhanced plan with smart analysis:', { intent: args.intent, dataNeeded: args.dataNeeded });
  } else {
    // Default to rental yield intent
    args.intent = 'rental_yield';
    args.dataNeeded = ['rentals', 'prices'];
  }
  
  return args as QueryPlan;
}

// ✅ NEW: Helper function to map topic to intent
function mapTopicToIntent(topic: string): QueryPlan['intent'] {
  const mapping: Record<string, QueryPlan['intent']> = {
    'crime': 'crime_stats',
    'price': 'median_price',
    'price_growth': 'price_growth',
    'yield': 'rental_yield',
    'projects': 'new_projects',
    'profile': 'suburb_profile',
    'demographics': 'demographics'
  };
  
  return mapping[topic] || 'suburb_profile';
}