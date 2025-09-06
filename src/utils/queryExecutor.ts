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

// Define proper types for the execution result
interface ExecutionResult {
  suburb: string;
  state?: string;
  plan: QueryPlan;
  error?: string;
  latestPR?: {
    year: number | null;
    price: { house: number | null; unit: number | null };
    rent: { house: number | null; unit: number | null };
  };
  latestYieldYear?: number | null;
  latestYield?: {
    house: number | null;
    unit: number | null;
  };
  yieldSeries?: Array<{
    propertyType: string;
    points: Array<{ year: number; value: number | null }>;
  }>;
  bedroomHouse?: unknown;
  bedroomUnit?: unknown;
  nearbyCompare?: {
    year: number | null;
    rows: Array<{ suburb: string; house: number | null; unit: number | null }>;
  };
  capitalAvg?: {
    house: number | null;
    unit: number | null;
  };
}

export async function executePlan(plan: QueryPlan): Promise<ExecutionResult | { error: string }> {
  console.log("[executor] plan:", JSON.stringify(plan));
  const suburb = plan.suburb;
  const state = plan.state;
  if (!suburb) {
    return { error: "No suburb detected. Please specify a suburb (e.g., 'Doncaster VIC')." };
  }

  const out: ExecutionResult = { suburb, state, plan };

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
  const seriesYears = series.map(s => s.year).filter((year): year is number => typeof year === 'number');
  const years = Array.from(new Set(seriesYears)).sort((a, b) => a - b).slice(-lastN);
  out.yieldSeries = ["house","unit"].map(pt => ({
    propertyType: pt,
    points: years.map(y => {
      const row = series.find(s => s.year === y && s.propertyType === pt);
      return { year: y, value: row?.yieldPct ?? null };
    })
  }));
}

  // Bedroom snapshot (if asked)
  if (plan.actions.includes("bedroom_snapshot")) {
    const housePrefs = Array.isArray(schemaRegistry.prefs.houseBedrooms) ? schemaRegistry.prefs.houseBedrooms as number[] : [];
    const unitPrefs = Array.isArray(schemaRegistry.prefs.unitBedrooms) ? schemaRegistry.prefs.unitBedrooms as number[] : [];
    
    const hPrefs: number[] = plan.bedroom 
      ? [plan.bedroom, ...housePrefs.filter(x => x !== plan.bedroom)] 
      : housePrefs;
    const uPrefs: number[] = plan.bedroom 
      ? [plan.bedroom, ...unitPrefs.filter(x => x !== plan.bedroom)] 
      : unitPrefs;

    out.bedroomHouse = await getLatestBedPriceRent(suburb, state, "house", hPrefs);
    out.bedroomUnit  = await getLatestBedPriceRent(suburb, state, "unit",  uPrefs);
  }

  // Nearby (rollup, same latest year)
if (plan.actions.includes("compare_nearby") && plan.compare?.suburbs?.length) {
  const latestYr: number | null = out.latestYieldYear ??
                   (await getLatestSuburbRentalYields(suburb, state)).year;
  
  if (latestYr !== null) {
    const nb = await getNearbySuburbsYields(plan.compare.suburbs!, latestYr, state);
    const nearbyRows = Object.entries(nb).map(([suburbName, yieldData]: [string, unknown]) => ({ 
      suburb: suburbName, 
      house: (yieldData as { house?: number; unit?: number }).house ?? null, 
      unit: (yieldData as { house?: number; unit?: number }).unit ?? null 
    }));
    out.nearbyCompare = { 
      year: latestYr, 
      rows: nearbyRows
    };
  }
}

  // Capital-city averages from your Melbourne rows
  if (out.latestYieldYear) {
    out.capitalAvg = await getStateAverageYields(state || "VIC", out.latestYieldYear);
  }

  return out;
}