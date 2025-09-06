import { z } from "zod";
import { TableQuery, runTableQuery } from "./queryFilters";

const FilterPlanSchema = z.object({
  tableQueries: z.array(TableQuery),
  derive: z.array(z.enum(["yield_pct"])).optional()
});
export type ExecutedBundle = Record<string, any[]>;

export async function executeFilterPlan(rawPlan: any): Promise<{ bundle: ExecutedBundle; derived?: Record<string, any[]> }> {
  const plan = FilterPlanSchema.safeParse(rawPlan);
  if (!plan.success) {
    console.error("[dynamicExecutor] invalid filter plan", plan.error);
    return { bundle: {} };
  }

  const bundle: ExecutedBundle = {};
  for (const tq of plan.data.tableQueries) {
    bundle[tq.id] = await runTableQuery(tq);
  }

  // Optional derived metrics (we keep generic)
  const derived: Record<string, any[]> = {};
  if (plan.data.derive?.includes("yield_pct")) {
    // If the plan named the pulls "price" and "rent", compute yield on shared keys (year, propertyType, bedroom)
    const price = bundle["price"] || bundle["prices"] || [];
    const rent  = bundle["rent"]  || bundle["rents"]  || [];
    const key = (r: any) => [r.suburb,r.state,r.year,r.propertyType,r.bedroom ?? null].join("|");
    const priceMap = new Map(price.map(r => [key(r), r]));
    const out: any[] = [];
    for (const rr of rent) {
      const pr = priceMap.get(key(rr));
      if (pr && typeof rr.median_rent_weekly === "number" && typeof pr.median_price === "number" && pr.median_price > 0) {
        out.push({
          suburb: rr.suburb, state: rr.state, year: rr.year, propertyType: rr.propertyType, bedroom: rr.bedroom ?? null,
          yieldPct: Number((((rr.median_rent_weekly * 52) / pr.median_price) * 100).toFixed(1))
        });
      }
    }
    derived["yield_pct"] = out;
  }

  return { bundle, derived };
}
