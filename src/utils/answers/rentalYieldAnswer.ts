// src/utils/answerFunctions.ts

//import { fetchMedianPrice, fetchCrime, fetchRentals } from '@/utils/fetchSuburbData';
import { supabase } from '@/lib/supabaseClient';

// =======================
// [DEBUG-RY1] Answer Rental Yield Function
// =======================
export async function answerRentalYield(lga: string) {
  console.log('[DEBUG-RY1.1] Fetching latest rental data for suburb:', lga);

  const { data, error } = await supabase
    .from("median_rentals")
    .select("*")
    .eq("lga", lga)
    .order("year", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error('[ERROR-RY1.1] No rental data found:', error);
    return `Sorry, I couldn't find rental yield data for ${lga}.`;
  }

  const latest = data[0];
  console.log('[DEBUG-RY1.2] Latest rental data found:', latest);

  const yieldFormatted = latest.rentalYield
    ? `${latest.rentalYield}%`
    : 'unknown yield';

  return `In ${latest.year}, the estimated rental yield in ${lga} was ${yieldFormatted}. Need further breakdown by property type or comparisons? Just ask!`;
}

