// src/utils/answerFunctions.ts

import { fetchMedianPrice, fetchCrime, fetchRentals } from '@/utils/fetchSuburbData';
import { supabase } from '@/lib/supabaseClient';


// =======================
// [DEBUG-F4.1] Answer Crime Stats Function
// =======================
export async function answerCrimeStats(suburb: string) {
  console.log('[DEBUG-F4.1] Fetching latest crime data for suburb:', suburb);

  const { data, error } = await supabase
    .from("crime_stats")
    .select("*")
    .eq("suburb", suburb)
    .order("year", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('[ERROR-F4.1] No crime data found:', error);
    return `Sorry, I couldn't find crime data for ${suburb}.`;
  }

  const latest = data[0];
  console.log('[DEBUG-F4.1] Latest crime data found:', latest);

  return `In ${latest.year}, ${suburb} reported ${latest.offenceCount} offences. Let me know if you'd like to explore trends or compare with other suburbs.`;
}

// =======================
// [DEBUG-F5.1] Answer Median Price Function
// =======================
export async function answerMedianPrice(suburb: string) {
  console.log('[DEBUG-F5.1] Fetching latest price data for suburb:', suburb);

  const { data, error } = await supabase
    .from("median_prices")
    .select("*")
    .eq("suburb", suburb)
    .order("year", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('[ERROR-F5.1] No price data found:', error);
    return `Sorry, I couldn't find median price data for ${suburb}.`;
  }

  const latest = data[0];
  console.log('[DEBUG-F5.1] Latest price data found:', latest);

  const priceFormatted = latest.medianPrice
    ? `$${latest.medianPrice.toLocaleString()}`
    : 'unknown price';

  return `As of ${latest.year}, the median price in ${suburb} is ${priceFormatted}. Let me know if you'd like to see trends or compare to nearby areas.`;
}

// =======================
// [DEBUG-F6.1] Answer Rental Yield Function
// =======================
export async function answerRentalYield(suburb: string) {
  console.log('[DEBUG-F6.1] Fetching latest rental data for suburb:', suburb);

  const { data, error } = await supabase
    .from("rental_stats")
    .select("*")
    .eq("suburb", suburb)
    .order("year", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('[ERROR-F6.1] No rental data found:', error);
    return `Sorry, I couldn't find rental yield data for ${suburb}.`;
  }

  const latest = data[0];
  console.log('[DEBUG-F6.1] Latest rental data found:', latest);

  const yieldFormatted = latest.rentalYield
    ? `${latest.rentalYield}%`
    : 'unknown yield';

  return `In ${latest.year}, the estimated rental yield in ${suburb} was ${yieldFormatted}. Need further breakdown by property type or comparisons? Just ask!`;
}

