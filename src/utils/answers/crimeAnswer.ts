// src/utils/crimeAnswer.ts

//import { fetchMedianPrice, fetchCrime, fetchRentals } from '@/utils/fetchSuburbData';
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