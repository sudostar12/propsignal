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

  const calcGrowth = (records: PriceRecord[]) => {
    if (records.length < 2) return null;
    const latest = records[0].medianPrice;
    const earliest = records[records.length - 1].medianPrice;
    if (!earliest || earliest === 0) return null;
    return ((latest - earliest) / earliest) * 100;
  };

  const houseGrowth = calcGrowth(houseRecords);
  const unitGrowth = calcGrowth(unitRecords);

  const houseMsg = houseGrowth !== null
    ? `🏠 House prices grew by ${houseGrowth.toFixed(1)}% from ${startYear} to ${latestYear}.`
    : `Not enough data to compute growth for houses.`;

  const unitMsg = unitGrowth !== null
    ? `🏢 Unit prices grew by ${unitGrowth.toFixed(1)}% from ${startYear} to ${latestYear}.`
    : `Not enough data to compute growth for units.`;

  const finalMsg = `${houseMsg}\n\n${unitMsg}\n\n⚡ I currently provide trends for up to 3 years only. More in-depth historical insights will be available soon!`;

  return finalMsg;
}