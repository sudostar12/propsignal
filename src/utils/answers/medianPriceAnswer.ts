// src/utils/answerFunctions.ts

//import { fetchMedianPrice, fetchCrime, fetchRentals } from '@/utils/fetchSuburbData';
import { supabase } from '@/lib/supabaseClient';

// =======================
// [DEBUG-medianPriceAnswer.ts] Answer Median Price Function
// =======================
export async function answerMedianPrice(suburb: string) {
  console.log('[DEBUG-MP1.1] Fetching latest price data for suburb:', suburb);

  const { data, error } = await supabase
    .from("median_price")
    .select("*")
    .eq("suburb", suburb)
    .order("year", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('[ERROR-MP1.1] No price data found:', error);
    return `Sorry, I couldn't find median price data for ${suburb}.`;
  }

  const latest = data[0];
  console.log('[DEBUG-MP1.2] Latest price data found:', latest);

  const priceFormatted = latest.medianPrice
    ? `$${latest.medianPrice.toLocaleString()}`
    : 'unknown price';

  return `As of ${latest.year}, the median price in ${suburb} is ${priceFormatted}. 
  
  💬 Let me know if you'd like to explore other trends or dive deeper into any specific areas!`;
}