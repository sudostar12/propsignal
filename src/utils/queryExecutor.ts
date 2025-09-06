// src/utils/smartExecutor.ts
import type { QueryPlan } from "./smartPlanner";
import { schemaRegistry } from "./schemaRegistry";
import {
  getRollupLatestPriceRent,
  getSuburbRentalYields,
  getLatestSuburbRentalYields,
  getNearbySuburbsYields,
  getLatestBedPriceRent,
  getStateAverageYields,
} from "@/utils/fetchRentalData";

export async function executePlan(plan: QueryPlan) {
  console.log("[executor] plan:", JSON.stringify(plan));
  const suburb = plan.suburb;
  const state = plan.state;
  if (!suburb) {
    return { error: "No suburb detected. Please specify a suburb (e.g., 'Doncaster VIC')." };
  }

  const out: Record<string, any> = { suburb, state, plan };

  // Headline rollup price/rent (needed for context)
  if (plan.actions.includes("price_rent_latest")) {
    out.latestPR = await getRollupLatestPriceRent(suburb, state);
  }

  // Yields (rollup)
  if (plan.actions.includes("yield_latest")) {
    const { year, price, rent } = out.latestPR ?? (await getRollupLatestPriceRent(suburb, state));
    const calc = (rw?: number|null, pr?: number|null) =>
      rw && pr ? Number((((rw*52)/pr)*100).toFixed(1)) : null;
    out.latestYieldYear = year;
    out.latestYield = {
      house: calc(rent?.house, price?.house),
      unit:  calc(rent?.unit,  price?.unit),
    };
  }

  if (plan.actions.includes("yield_series")) {
    const series = await getSuburbRentalYields(suburb, state);
    const lastN = plan.years?.lastN ?? 3;
    const years = [...new Set(series.map(s=>s.year))].sort((a,b)=>a-b).slice(-lastN);
    out.yieldSeries = ["house","unit"].map(pt => ({
      propertyType: pt,
      points: years.map(y => {
        const row = series.find(s => s.year===y && s.propertyType===pt);
        return { year: y, value: row?.yieldPct ?? null };
      })
    }));
  }

  // Bedroom snapshot (if asked)
  if (plan.actions.includes("bedroom_snapshot")) {
    const prefs = {
      house: schemaRegistry.prefs.houseBedrooms,
      unit:  schemaRegistry.prefs.unitBedrooms,
    };
    const hPrefs = plan.bedroom ? [plan.bedroom, ...prefs.house.filter(x=>x!==plan.bedroom)] : prefs.house;
    const uPrefs = plan.bedroom ? [plan.bedroom, ...prefs.unit.filter(x=>x!==plan.bedroom)]  : prefs.unit;

    out.bedroomHouse = await getLatestBedPriceRent(suburb, state, "house", hPrefs);
    out.bedroomUnit  = await getLatestBedPriceRent(suburb, state, "unit",  uPrefs);
  }

  // Nearby (rollup, same latest year)
  if (plan.actions.includes("compare_nearby") && plan.compare?.suburbs?.length) {
    const latestYr = out.latestYieldYear ??
                     (await getLatestSuburbRentalYields(suburb, state)).year;
    const nb = await getNearbySuburbsYields(plan.compare.suburbs!, latestYr, state);
    out.nearbyCompare = { year: latestYr, rows: Object.entries(nb).map(([s,v]) => ({ suburb: s, house: v.house ?? null, unit: v.unit ?? null })) };
  }

  // Capital-city averages from your Melbourne rows
  if (out.latestYieldYear) {
    out.capitalAvg = await getStateAverageYields(state || "VIC", out.latestYieldYear);
  }

  return out;
}
