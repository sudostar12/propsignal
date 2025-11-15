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
  
  // ✅ Support for all query types including search
  intent?: 'rental_yield' | 'crime_stats' | 'median_price' | 'price_growth' | 'new_projects' | 'suburb_profile' | 'demographics' | 'suburb_search';
  dataNeeded?: string[];
  analysisType?: 'single_suburb' | 'comparison' | 'search' | 'market_overview' | 'trend_analysis';
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

**CRITICAL RULE: NEVER invent or assume suburb names. Only extract suburbs explicitly mentioned by the user.**

Examples:
- "What suburbs are best for families?" → suburb: undefined (NO specific suburb mentioned)
- "Tell me about Doncaster" → suburb: "Doncaster" 
- "Crime in Box Hill" → suburb: "Box Hill"
- "What is the basis of your analysis?" → suburb: undefined (meta question, no suburb)


- Tables: ${Object.keys(schemaRegistry.tables).join(", ")}.
- Column rules:
  • median_price: ${schemaRegistry.tables.median_price.columns.join(", ")}
  • median_rentals: ${schemaRegistry.tables.median_rentals.columns.join(", ")}
- propertyType: ${schemaRegistry.enums.propertyType.join(" | ")}.

**CRITICAL: If the user does NOT mention a specific suburb name, DO NOT invent one. Leave suburb as null or undefined.**
**Examples:**
  - "What suburbs are best for families?" → suburb: undefined (no specific suburb mentioned)
  - "Tell me about Doncaster" → suburb: "Doncaster" (specific suburb mentioned)
  - "Crime rate in Box Hill" → suburb: "Box Hill" (specific suburb mentioned)

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
  
    if (!args.propertyTypes?.length) args.propertyTypes = ["house", "unit"];
  if (!args.years) args.years = { lastN: 3 };
  
  // ✅ Simple suburb check - if no suburb detected, mark as search
  if (!args.suburb || args.suburb === 'undefined') {
    args.intent = 'suburb_search';
    args.analysisType = 'search';
    console.log('[planner] No suburb detected - marking as search query');
  } else {
    // Default to rental yield for specific suburb queries
    args.intent = 'rental_yield';
    console.log('[planner] Suburb detected - defaulting to rental yield');
  }
  
  return args as QueryPlan;
}