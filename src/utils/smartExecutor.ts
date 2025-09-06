// src/utils/smartExecutor.ts
// Executes a typed QueryPlan using ONLY helpers from fetchRentalData.ts

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

type PT = "house" | "unit";
type YieldSeriesPoint = { year: number; value: number | null };
type YieldSeries = { propertyType: PT; points: YieldSeriesPoint[] };
type SeriesRow = { year: number; propertyType: string; yieldPct: number };

export async function executePlan(plan: QueryPlan) {
  console.log("[executor] plan:", JSON.stringify(plan));
  const suburb = plan.suburb;
  const state = plan.state;
  if (!suburb) {
    return { error: "No suburb detected. Please specify a suburb (e.g., 'Doncaster VIC')." };
  }

  const out: Record<string, any> = { suburb, state, plan };

  // --- Headline rollup price & rent (bedroom = NULL) ---
  if (plan.actions.includes("price_rent_latest")) {
    out.latestPR = await getRollupLatestPriceRent(suburb, state);
  }

  // --- Yields (latest from rollups) ---
  if (plan.actions.includes("yield_latest")) {
    const pr = out.latestPR ?? (await getRollupLatestPriceRent(suburb, state));
    const { year, price, rent } = pr || {};
    const calc = (rw?: number | null, prc?: number | null): number | null =>
      typeof rw === "number" && typeof prc === "number" && prc > 0
        ? Number((((rw * 52) / prc) * 100).toFixed(1))
        : null;

    out.latestYieldYear = typeof year === "number" ? year : null;
    out.latestYield = {
      house: calc(rent?.house, price?.house),
      unit: calc(rent?.unit, price?.unit),
    };
  }

  // --- Yield series (last N years) ---
  if (plan.actions.includes("yield_series")) {
    const series: SeriesRow[] = await getSuburbRentalYields(suburb, state);

    const lastN = plan.years?.lastN ?? 3;
    const years: number[] = Array.from(new Set(series.map((s) => s.year)))
      .sort((a, b) => a - b)
      .slice(-lastN);

    const pointsFor = (pt: PT): YieldSeriesPoint[] =>
      years.map((y) => {
        const row = series.find(
          (s) => s.year === y && (s.propertyType || "").toLowerCase() === pt
        );
        return { year: y, value: row?.yieldPct ?? null };
      });

    const result: YieldSeries[] = (["house", "unit"] as PT[]).map((pt) => ({
      propertyType: pt,
      points: pointsFor(pt),
    }));

    out.yieldSeries = result;
  }

  // --- Bedroom snapshot (if asked) ---
  if (plan.actions.includes("bedroom_snapshot")) {
    // Convert readonly prefs to mutable arrays to satisfy TS
    const baseHousePrefs: number[] = Array.from(schemaRegistry.prefs.houseBedrooms as readonly number[]);
    const baseUnitPrefs: number[] = Array.from(schemaRegistry.prefs.unitBedrooms as readonly number[]);

    const asked = typeof plan.bedroom === "number" ? plan.bedroom : null;

    const hPrefs: number[] = asked != null
      ? [asked, ...baseHousePrefs.filter((x) => x !== asked)]
      : baseHousePrefs;

    const uPrefs: number[] = asked != null
      ? [asked, ...baseUnitPrefs.filter((x) => x !== asked)]
      : baseUnitPrefs;

    out.bedroomHouse = await getLatestBedPriceRent(suburb, state, "house", hPrefs);
    out.bedroomUnit = await getLatestBedPriceRent(suburb, state, "unit", uPrefs);
  }

  // --- Nearby compare (rollups, same latest year) ---
  if (plan.actions.includes("compare_nearby") && plan.compare?.suburbs?.length) {
    let compareYear: number | null =
      typeof out.latestYieldYear === "number" ? out.latestYieldYear : null;

    if (compareYear == null) {
      const latest = await getLatestSuburbRentalYields(suburb, state);
      compareYear = typeof latest?.year === "number" ? latest.year : null;
    }
    if (compareYear == null) {
      compareYear = new Date().getFullYear(); // final guard
    }

    const nb = await getNearbySuburbsYields(plan.compare.suburbs!, compareYear, state);
    out.nearbyCompare = {
      year: compareYear,
      rows: Object.entries(nb).map(([s, v]) => ({
        suburb: s,
        house: typeof v.house === "number" ? Number(v.house) : null,
        unit: typeof v.unit === "number" ? Number(v.unit) : null,
      })),
    };
  }

  // --- Capital-city (Melbourne) averages for the same year ---
  if (typeof out.latestYieldYear === "number") {
    out.capitalAvg = await getStateAverageYields(state || "VIC", out.latestYieldYear);
  }

  return out;
}
