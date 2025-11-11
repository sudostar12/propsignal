// src/utils/answers/priceGrowthAnswer.ts

import { fetchMedianPrice } from "@/utils/fetchSuburbData";

/**
 * Interface for strong typing price records.
 */
export interface PriceRecord {
  year: number;
  medianPrice: number;
  propertyType: string;
}

/**
 * Answer function for price growth trends.
 * @param suburb - suburb name
 * @param requestedYears - number of years for growth trend (defaults to 3)
 * @returns string - formatted AI-friendly growth message
 */
export async function answerPriceGrowth(suburb: string, requestedYears: number = 3): Promise<string> {
  console.log("[DEBUG-PG1] Fetching median price data for:", suburb);

  const allRecords: PriceRecord[] = await fetchMedianPrice(suburb);
  console.log("[DEBUG-PG2] Median price dataset length:", allRecords.length);

  const latestYear = Math.max(...allRecords.map((r) => r.year));
  console.log("[DEBUG-PG2.1] Latest available year in data:", latestYear);

  const finalYears = Math.min(requestedYears, 3);
  const startYear = latestYear - finalYears + 1;
  console.log("[DEBUG-PG2.2] Final years range:", startYear, "to", latestYear);

  const filtered = allRecords.filter((r) => r.year >= startYear && r.year <= latestYear);
  console.log("[DEBUG-PG2.3] Filtered data count after year range filter:", filtered.length);

  const houseRecords = filtered.filter((r) => r.propertyType === "house").sort((a, b) => b.year - a.year);
  const unitRecords = filtered.filter((r) => r.propertyType === "unit").sort((a, b) => b.year - a.year);

  console.log("[DEBUG-PG3] House records count:", houseRecords.length);
  console.log("[DEBUG-PG3] Unit records count:", unitRecords.length);

    // ✅ Robust growth calc with per-year aggregation (median), compatible with older TS targets
  const calcGrowth = (records: PriceRecord[]): number | null => {
    const cleaned = records
      .filter(
        (r) =>
          typeof r.year === "number" &&
          Number.isFinite(r.medianPrice) &&
          r.medianPrice > 0
      )
      .sort((a, b) => a.year - b.year);

    if (cleaned.length < 2) {
      console.warn("[PG] Not enough valid records after cleaning:", cleaned);
      return null;
    }

    // 1️⃣ Bucket by year
    const buckets = new Map<number, number[]>();
    for (const r of cleaned) {
      if (!buckets.has(r.year)) buckets.set(r.year, []);
      (buckets.get(r.year) as number[]).push(r.medianPrice);
    }

    // 2️⃣ Helper: compute median of an array
    const median = (arr: number[]): number => {
      const sorted = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    // 3️⃣ Convert map entries into a normal array first to avoid iteration error
    const entriesArray = Array.from(buckets.entries());
    const byYear = new Map<number, number>();
    for (let i = 0; i < entriesArray.length; i++) {
      const [year, prices] = entriesArray[i];
      const med = median(prices);
      byYear.set(year, med);
      console.log(
        `[PG] Year ${year}: aggregated median from ${prices.length} rows = ${med}`
      );
    }

    // 4️⃣ Prefer explicit startYear → latestYear comparison
    const startVal = byYear.get(startYear);
    const endVal = byYear.get(latestYear);
    const pct = (from: number, to: number) => ((to - from) / from) * 100;

    if (startVal != null && endVal != null && startVal !== 0) {
      const g = pct(startVal, endVal);
      console.log(
        `[PG] Using aggregated ${startYear}->${latestYear}: ${g.toFixed(
          2
        )}% (start=${startVal}, end=${endVal})`
      );
      return g;
    }

    // 5️⃣ Fallback to earliest → latest available year
    const years = Array.from(byYear.keys()).sort((a, b) => a - b);
    if (years.length < 2) {
      console.warn("[PG] Not enough aggregated years to compute growth:", years);
      return null;
    }

    const earliestYear = years[0];
    const latestAvailYear = years[years.length - 1];
    const earliest = byYear.get(earliestYear)!;
    const latest = byYear.get(latestAvailYear)!;

    if (!earliest || earliest === 0) {
      console.warn(
        `[PG] Earliest value invalid. year=${earliestYear}, value=${earliest}`
      );
      return null;
    }

    const g = pct(earliest, latest);
    console.log(
      `[PG] Fallback aggregated ${earliestYear}->${latestAvailYear}: ${g.toFixed(
        2
      )}% (earliest=${earliest}, latest=${latest})`
    );
    return g;
  };




  const houseGrowth = calcGrowth(houseRecords);
  const unitGrowth = calcGrowth(unitRecords);

   // Helper: format message with more natural phrasing
  const formatGrowthMsg = (growth: number | null, label: string, emoji: string) => {
    if (growth === null) return `Not enough data to compute ${label} price trend.`;

    const absGrowth = Math.abs(growth).toFixed(1);

    let direction: string;
    if (growth > 0) direction = `edged up by ${absGrowth}%`;
    else if (growth < 0) direction = `slipped by ${absGrowth}%`;
    else direction = `remained stable`;

    const rangeText = `${startYear} and ${latestYear}`;

    return `${emoji} ${label.charAt(0).toUpperCase() + label.slice(1)} prices ${direction} between ${rangeText}.`;
  };

  const houseMsg = formatGrowthMsg(houseGrowth, "house", "🏠");
  const unitMsg  = formatGrowthMsg(unitGrowth,  "unit",  "🏢");

  const finalMsg = `${houseMsg}\n\n${unitMsg}\n\n⚡ Currently showing trends for the past 3 years. More detailed historical insights are coming soon.`;

  return finalMsg;
}