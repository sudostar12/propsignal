// src/utils/answers/priceGrowthAnswer.ts

import { fetchMedianPrice } from "@/utils/fetchSuburbData";

export interface PriceRecord {
  year: number;
  median_price: number;
}


// [DEBUG-PG1] Price growth answer function
export async function answerPriceGrowth(suburb: string, years: number = 5): Promise<string> {
  console.log("[DEBUG-PG1] Fetching median price data for:", suburb);

  const dataResult = await fetchMedianPrice(suburb);
  const prices = dataResult.data || [];

  // [DEBUG-PG2] Check dataset
  console.log("[DEBUG-PG2] Median price dataset length:", prices.length);

  if (prices.length === 0) {
    return `Sorry, I couldn't find historical price data for ${suburb}.`;
  }

  // Sort prices by year if you have "year" column, adjust as needed
  const sorted = prices
    .filter((p: any) => p.year)
    .sort((a: any, b: any) => a.year - b.year);

  // Find oldest and most recent price within N years
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - years;

  const startRecord = sorted.find((p: any) => p.year === startYear);
  const latestRecord = sorted.find((p: any) => p.year === currentYear - 1 || p.year === currentYear);

  if (!startRecord || !latestRecord) {
    return `I couldn't find enough data to calculate ${years}-year price growth for ${suburb}.`;
  }

  const startPrice = startRecord.median_price;
  const latestPrice = latestRecord.median_price;

  if (!startPrice || !latestPrice) {
    return `Missing price data to compute growth for ${suburb}.`;
  }

  const growthPercent = ((latestPrice - startPrice) / startPrice) * 100;
  console.log("[DEBUG-PG3] Price growth percent:", growthPercent);

  return `Over the past ${years} years, the median price in ${suburb} has changed from ~$${startPrice.toLocaleString()} to ~$${latestPrice.toLocaleString()}, representing an approximate growth of ${growthPercent.toFixed(1)}%.`;
}
