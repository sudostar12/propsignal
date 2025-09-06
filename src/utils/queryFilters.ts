// Generic, safe query filters + compiler → Supabase
// Works for both tables: median_price, median_rentals

import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

// 1) Schema (only allow these columns + ops)
export const TableName = z.enum(["median_price", "median_rentals"]);
export const ColName = z.enum([
  "suburb", "postcode", "state", "year", "propertyType", "bedroom"
]);

export const Op = z.enum(["eq", "in", "between", "is_null", "not_null"]);

export const Filter = z.object({
  col: ColName,
  op: Op,
  value: z.unknown().optional(),
  values: z.array(z.unknown()).optional()
});

export const Select = z.array(z.enum([
  "suburb","postcode","state","year","propertyType","bedroom",
  "median_price","median_rent_weekly"   // only leaf metrics exposed
]));

export const OrderBy = z.object({
  col: ColName,
  dir: z.enum(["asc","desc"]).default("asc")
}).optional();

export const TableQuery = z.object({
  id: z.string(),                    // reference name
  table: TableName,
  select: Select,
  filters: z.array(Filter).default([]),
  orderBy: OrderBy,
  limit: z.number().int().positive().max(500).optional()
});

export type TTableQuery = z.infer<typeof TableQuery>;
export type TResultRow = Record<string, unknown>;

// 2) Compiler: TableQuery -> Supabase query
export async function runTableQuery(q: TTableQuery): Promise<TResultRow[]> {
  console.info("[queryFilters] runTableQuery", q.id, q.table);

  let sb = supabase.from(q.table).select(q.select.join(","));

  for (const f of q.filters) {
    switch (f.op) {
      case "eq":       sb = sb.eq(f.col, f.value); break;
      case "in":       sb = sb.in(f.col, (f.values ?? []).map(String)); break;
      case "between": {
        const [a,b] = f.values ?? [];
        if (a != null) sb = sb.gte(f.col, a);
        if (b != null) sb = sb.lte(f.col, b);
        break;
      }
      case "is_null":  sb = sb.is(f.col, null); break;
      case "not_null": sb = sb.not(f.col, "is", null); break;
      default: break;
    }
  }

  if (q.orderBy) sb = sb.order(q.orderBy.col, { ascending: q.orderBy.dir === "asc" });
  if (q.limit) sb = sb.limit(q.limit);

  const { data, error } = await sb;
  if (error) {
    console.error("[queryFilters] Supabase error", { id: q.id, error });
    return [];
  }
  
  // Use the two-step conversion TypeScript suggests
  if (Array.isArray(data)) {
    return data as unknown as TResultRow[];
  }
  
  return [];
}