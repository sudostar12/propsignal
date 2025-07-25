// /utils/fetchRentalData.ts

import { supabase } from '@/lib/supabaseClient';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Cache to avoid re-fetching state-level averages
const stateYieldCache: {[Key:string]: { house: number | null; unit: number | null; }} = {};

/**
 * Fetches and calculates state-level average yield for given year and state.
 * Uses cache to avoid redundant Supabase calls.
 */
// Add this at the top of your fetchRentalData.ts file (replace existing cache declaration)
//const stateYieldCache: { [key: string]: { house: number | null; unit: number | null; } } = {};

export async function getStateAverageYields(state: string, year: number) {
  const cacheKey = `${state}-${year}`;
    console.log(`[DEBUG fetchRentalData] Cache lookup for key: "${cacheKey}"`);
  console.log(`[DEBUG fetchRentalData] Cache contents:`, Object.keys(stateYieldCache));

  if (stateYieldCache[cacheKey]) {
    console.log(`[DEBUG fetchRentalData] ✅ Using cached state average yields for ${cacheKey}`);
    return stateYieldCache[cacheKey];
  }

  console.log(`[DEBUG fetchRentalData] ❌ Cache miss. Fetching state average yields for ${cacheKey}`);

  const [stateRentResp, statePriceResp] = await Promise.all([
    supabase.from('median_rentals').select('*').eq('state', state).eq('year', year),
    supabase.from('median_price').select('*').eq('state', state).eq('year', year)
  ]);

  console.log(`[DEBUG fetchRentalData] Raw rental data count:`, stateRentResp.data?.length || 0);
  console.log(`[DEBUG fetchRentalData] Raw price data count:`, statePriceResp.data?.length || 0);
  console.log(`[DEBUG fetchRentalData] Rental errors:`, stateRentResp.error);
  console.log(`[DEBUG fetchRentalData] Price errors:`, statePriceResp.error);

  const allRentData = stateRentResp.data || [];
  const allPriceData = statePriceResp.data || [];

  // Debug sample data
  if (allRentData.length > 0) {
    console.log(`[DEBUG fetchRentalData] Sample rental record:`, allRentData[0]);
  }
  if (allPriceData.length > 0) {
    console.log(`[DEBUG fetchRentalData] Sample price record:`, allPriceData[0]);
  }

  function computeAverageYield(propertyType: string): number | null {
    console.log(`[DEBUG fetchRentalData] Computing average yield for:`, propertyType);
    
    const rents = allRentData.filter(r => r.propertyType.toLowerCase() === propertyType);
    const prices = allPriceData.filter(p => p.propertyType.toLowerCase() === propertyType);

    console.log(`[DEBUG fetchRentalData] Filtered rents count:`, rents.length);
    console.log(`[DEBUG fetchRentalData] Filtered prices count:`, prices.length);

    const yields: number[] = [];
    let matchAttempts = 0;
    let successfulMatches = 0;

    // Since rental data has LGA and price data has suburb, we need to get LGA for each suburb
    // We'll use a simple approach: for each rent record, find ALL price records in the same state
    // and calculate yields, then average them by LGA
    
    const lgaYields: { [lga: string]: number[] } = {};

    rents.forEach(rent => {
      if (!rent.lga || !rent.medianRent) return;
      
      // Find all price records that might be in this LGA
      // For now, we'll use a broader matching approach since we don't have direct LGA-suburb mapping
      prices.forEach(price => {
        if (!price.suburb || !price.medianPrice) return;
        
        matchAttempts++;
        
        // Calculate yield for this rent-price combination
        const yld = ((rent.medianRent * 52) / price.medianPrice) * 100;
        
        if (yld > 0 && yld < 20) { // Reasonable yield range
          if (!lgaYields[rent.lga]) {
            lgaYields[rent.lga] = [];
          }
          lgaYields[rent.lga].push(yld);
          successfulMatches++;
          
          if (successfulMatches <= 10) { // Log first 10 successful matches
            console.log(`[DEBUG fetchRentalData] Valid yield: ${yld.toFixed(2)}% for LGA: ${rent.lga}, Suburb: ${price.suburb}`);
          }
        }
      });
    });

    // Calculate average yield across all LGAs
    Object.keys(lgaYields).forEach(lga => {
      const lgaAvg = lgaYields[lga].reduce((a, b) => a + b, 0) / lgaYields[lga].length;
      yields.push(lgaAvg);
      console.log(`[DEBUG fetchRentalData] LGA ${lga} average yield: ${lgaAvg.toFixed(2)}% (${lgaYields[lga].length} data points)`);
    });

    console.log(`[DEBUG fetchRentalData] Total match attempts:`, matchAttempts);
    console.log(`[DEBUG fetchRentalData] Successful matches:`, successfulMatches);
    console.log(`[DEBUG fetchRentalData] LGAs with data:`, Object.keys(lgaYields).length);
    console.log(`[DEBUG fetchRentalData] Final yield calculations:`, yields.length);
    
    if (!yields.length) {
      console.log(`[DEBUG fetchRentalData] No valid yields found for ${propertyType}`);
      return null;
    }
    
    const avg = yields.reduce((a, b) => a + b, 0) / yields.length;
    console.log(`[DEBUG fetchRentalData] State average yield for ${propertyType}:`, avg.toFixed(2));
    
    return parseFloat(avg.toFixed(1));
  }

  const house = computeAverageYield('house');
  const unit = computeAverageYield('unit');

  console.log(`[DEBUG fetchRentalData] Final state averages - House: ${house}, Unit: ${unit}`);

  // FIXED: Cache and return numbers, not strings
  const result = { house, unit };
  stateYieldCache[cacheKey] = result;
  return result;
}

/**
 * Generates executive summary using OpenAI based on user suburb vs nearby yields.
 */
export async function generateRentalYieldSummary({
  suburb,
  year,
  userHouseYield,
  userUnitYield,
  nearbyInsights,
  state,
  stateAvgHouseYield,
  stateAvgUnitYield,
}: {
  suburb: string;
  year: number;
  userHouseYield: number;
  userUnitYield?: number;
  nearbyInsights: {
    suburb: string;
    houseYield?: number;
    unitYield?: number;
  }[];
  state: string;
  stateAvgHouseYield?: number;
  stateAvgUnitYield?: number;
}) {
  console.log('[DEBUG-RYS1] Starting AI summary generation for suburb:', suburb);
  console.log('[DEBUG-RYS1] Input data:', {
    userHouseYield,
    userUnitYield,
    stateAvgHouseYield,
    stateAvgUnitYield,
    nearbyCount: nearbyInsights.length
  });

  const prompt = [
    {
      role: 'system' as const,
      content: `You are a smart Australian property investment analyst. Write a concise executive summary (max 50 words) comparing yields. Focus on:
                1. How the suburb compares to state averages
                2. Positioning vs nearby suburbs  
                3. Key trend insights
                4. Investment recommendation

        When Replying: 
          - Use paragraphs and line breaks to improve readability.
          - Group related ideas together.
          - Avoid long, dense blocks of text.
          -Keep it professional, data-driven and actionable. Don't mention unavailable data.`
    },
    {
      role: 'user' as const,
      content: `Suburb: ${suburb}
State: ${state}
Year: ${year}

User Yields:
- House: ${userHouseYield || 'N/A'}
- Unit: ${userUnitYield || 'N/A'}

State Average Yields:
- House: ${stateAvgHouseYield || 'N/A'}
- Unit: ${stateAvgUnitYield || 'N/A'}

Nearby:
${nearbyInsights.map(n => `- ${n.suburb}: House ${n.houseYield ?? 'N/A'}%, Unit ${n.unitYield ?? 'N/A'}%`).join('\n')}`
    }
  ];

  console.log('[DEBUG-RYS1] Calling OpenAI API with model: gpt-4o');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.5,
    messages: prompt
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}  

