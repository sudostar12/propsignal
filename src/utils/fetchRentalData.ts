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

// 🔁 REPLACE the whole getStateAverageYields with this
export async function getStateAverageYields(state: string, year: number) {
  const cacheKey = `${state}-${year}`;
  console.log(`[DEBUG fetchRentalData] getStateAverageYields cache lookup`, { cacheKey });

  if (stateYieldCache[cacheKey]) {
    console.log(`[DEBUG fetchRentalData] ✅ cache hit`, stateYieldCache[cacheKey]);
    return stateYieldCache[cacheKey];
  }

  console.log(`[DEBUG fetchRentalData] ❌ cache miss — querying rental_yields`, { state, year });

  const { data, error } = await supabase
    .from('rental_yields')
    .select('propertyType, yieldPct')
    .eq('state', state)
    .eq('suburb', 'Melbourne')           // capital city proxy
    .eq('year', year)
    .in('propertyType', ['house-all', 'unit-all']);

  if (error) {
    console.error('[ERROR fetchRentalData] rental_yields capital city avg query failed', { state, year, error });
    return { house: null, unit: null };
  }

  const houseRow = data?.find(r => (r.propertyType || '').toLowerCase() === 'house-all');
  const unitRow  = data?.find(r => (r.propertyType || '').toLowerCase() === 'unit-all');

  const result = {
    house: (typeof houseRow?.yieldPct === 'number') ? houseRow.yieldPct : null,
    unit:  (typeof unitRow?.yieldPct  === 'number') ? unitRow.yieldPct  : null
  };

  stateYieldCache[cacheKey] = result;
  console.log('[DEBUG fetchRentalData] capital city averages via rental_yields', result);

  return result;
}

// 📈 Yields time series for a suburb (optionally scope by state)
export async function getSuburbRentalYields(
  suburb: string,
  state?: string
): Promise<Array<{ year: number; propertyType: string; yieldPct: number }>> {
  console.info('[fetchRentalData] getSuburbRentalYields start', { suburb, state });

  let query = supabase
    .from('rental_yields')
    .select('year, propertyType, yieldPct')
    .eq('suburb', suburb)
    .order('year', { ascending: true });

  if (state) query = query.eq('state', state);

  const { data, error } = await query;

  if (error) {
    console.error('[ERROR fetchRentalData] getSuburbRentalYields failed', { suburb, state, error });
    return [];
  }

  console.info('[fetchRentalData] getSuburbRentalYields rows', data?.length ?? 0);
  return (data ?? []).map(r => ({
    year: Number(r.year),
    propertyType: String(r.propertyType),
    yieldPct: typeof r.yieldPct === 'number' ? r.yieldPct : Number(r.yieldPct)
  }));
}

// 🕒 Latest-year yields for a suburb (house & unit if present)
export async function getLatestSuburbRentalYields(
  suburb: string,
  state?: string
): Promise<{ year: number | null; house: number | null; unit: number | null }> {
  console.info('[fetchRentalData] getLatestSuburbRentalYields start', { suburb, state });

  // get all years, pick max in code to avoid relying on DB-specific max(...) + group tricks
  const rows = await getSuburbRentalYields(suburb, state);
  if (!rows.length) return { year: null, house: null, unit: null };

  const latestYear = rows.reduce((max, r) => Math.max(max, r.year), rows[0].year);
  const house = rows.find(r => r.year === latestYear && r.propertyType.toLowerCase() === 'house')?.yieldPct ?? null;
  const unit  = rows.find(r => r.year === latestYear && r.propertyType.toLowerCase() === 'unit')?.yieldPct ?? null;

  console.info('[fetchRentalData] getLatestSuburbRentalYields result', { latestYear, house, unit });
  return { year: latestYear, house, unit };
}

// 🧩 Batch yields for a set of nearby suburbs for a specific year
export async function getNearbySuburbsYields(
  suburbs: string[],
  year: number,
  state?: string
): Promise<Record<string, { house?: number; unit?: number }>> {
  console.info('[fetchRentalData] getNearbySuburbsYields start', { suburbsCount: suburbs.length, year, state });

  if (!suburbs.length) return {};

  let query = supabase
    .from('rental_yields')
    .select('suburb, propertyType, yieldPct')
    .in('suburb', suburbs)
    .eq('year', year);

  if (state) query = query.eq('state', state);

  const { data, error } = await query;

  if (error) {
    console.error('[ERROR fetchRentalData] getNearbySuburbsYields failed', { year, state, error });
    return {};
  }

  const out: Record<string, { house?: number; unit?: number }> = {};
  (data ?? []).forEach(r => {
    const s = String(r.suburb);
    out[s] ||= {};
    const pt = (r.propertyType || '').toLowerCase();
    if (pt === 'house' && typeof r.yieldPct === 'number') out[s].house = r.yieldPct;
    if (pt === 'unit'  && typeof r.yieldPct === 'number') out[s].unit  = r.yieldPct;
  });

  console.info('[fetchRentalData] getNearbySuburbsYields map built', { keys: Object.keys(out).length });
  return out;
}

/*// 📦 Fetch latest price+rent for preferred bedrooms (same year), per propertyType
export async function getLatestBedPriceRent(
  suburb: string,
  state: string | undefined,
  propertyType: 'house' | 'unit',
  bedroomPrefs: number[]
): Promise<{ year: number, bedroom: number, price: number, rentWeekly: number } | null> {
  console.info('[fetchRentalData] getLatestBedPriceRent start', { suburb, state, propertyType, bedroomPrefs });

  // Pull candidate rows for the preferred bedrooms
  let pQ = supabase
    .from('median_price')
    .select('year, "propertyType", bedroom, medianPrice')
    .eq('suburb', suburb)
    .in('bedroom', bedroomPrefs)
    .eq('propertyType', propertyType)
    .order('year', { ascending: false });
  if (state) pQ = pQ.eq('state', state);
  const { data: pRows, error: pErr } = await pQ;

  let rQ = supabase
    .from('median_rentals')
    .select('year, "propertyType", bedroom, medianRent')
    .eq('suburb', suburb)
    .in('bedroom', bedroomPrefs)
    .eq('propertyType', propertyType)
    .order('year', { ascending: false });
  if (state) rQ = rQ.eq('state', state);
  const { data: rRows, error: rErr } = await rQ;

  if (pErr) console.error('[ERROR fetchRentalData] getLatestBedPriceRent price query failed', { suburb, state, propertyType, pErr });
  if (rErr) console.error('[ERROR fetchRentalData] getLatestBedPriceRent rent query failed', { suburb, state, propertyType, rErr });

  if (!pRows?.length || !rRows?.length) return null;

  // Build quick lookups: latest year available per bedroom for price & rent
  const latestYearBy = (rows: any[], bed: number) =>
    rows.filter(x => x.bedroom === bed).map(x => Number(x.year)).sort((a,b)=>b-a)[0];

  let best: { year: number, bedroom: number } | null = null;

  for (const bed of bedroomPrefs) {
    const yp = latestYearBy(pRows, bed);
    const yr = latestYearBy(rRows, bed);
    if (yp && yr) {
      const commonYear = Math.min(yp, yr); // ensure both exist for same year
      if (!best || commonYear > best.year) best = { year: commonYear, bedroom: bed };
    }
  }

  if (!best) return null;

  const priceRec = pRows.find(x => x.bedroom === best!.bedroom && Number(x.year) === best!.year);
  const rentRec  = rRows.find(x => x.bedroom === best!.bedroom && Number(x.year) === best!.year);
  if (!priceRec?.medianPrice || !rentRec?.medianRent) return null;

  const out = {
    year: best.year,
    bedroom: best.bedroom,
    price: Number(priceRec.medianPrice),
    rentWeekly: Number(rentRec.medianRent)
  };
  console.info('[fetchRentalData] getLatestBedPriceRent result', { suburb, propertyType, ...out });
  return out;
}
  */

// ⬇️ Add these two helpers somewhere above generateRentalYieldSummary()


/** Latest rollup (bedroom=NULL) price+rent per propertyType for a suburb. */
export async function getRollupLatestPriceRent(suburb: string, state?: string): Promise<{
  year: number | null;
  price: { house: number | null; unit: number | null };
  rent:  { house: number | null; unit: number | null };
}> {
  console.info("[fetchRentalData] getRollupLatestPriceRent start", { suburb, state });

  let pQ = supabase.from("median_price")
    .select('year, "propertyType", medianPrice')
    .eq("suburb", suburb)
    .is("bedroom", null)
    .in("propertyType", ["house", "unit"])
    .order("year", { ascending: false });
  if (state) pQ = pQ.eq("state", state);
  const { data: pRows, error: pErr } = await pQ;

  let rQ = supabase.from("median_rentals")
    .select('year, "propertyType", medianRent')
    .eq("suburb", suburb)
    .is("bedroom", null)
    .in("propertyType", ["house", "unit"])
    .order("year", { ascending: false });
  if (state) rQ = rQ.eq("state", state);
  const { data: rRows, error: rErr } = await rQ;

  if (pErr) console.error("[fetchRentalData] price latest error", pErr);
  if (rErr) console.error("[fetchRentalData] rent latest error", rErr);

  const latestYear = Math.max(
    ...[(pRows||[]).map(r=>Number(r.year)), ...(rRows||[]).map(r=>Number(r.year))].flat().filter(Boolean)
  );
  
  const pickPrice = (rows: { year: number; propertyType?: string; medianPrice?: number }[], pt: string) => 
    rows.find(r => r.propertyType?.toLowerCase()===pt && Number(r.year)===latestYear);
  
  const pickRent = (rows: { year: number; propertyType?: string; medianRent?: number }[], pt: string) => 
    rows.find(r => r.propertyType?.toLowerCase()===pt && Number(r.year)===latestYear);

  return {
    year: isFinite(latestYear) ? latestYear : null,
    price: {
      house: pickPrice(pRows||[], "house")?.medianPrice ?? null,
      unit:  pickPrice(pRows||[], "unit")?.medianPrice ?? null,
    },
    rent: {
      house: pickRent(rRows||[], "house")?.medianRent ?? null,
      unit:  pickRent(rRows||[], "unit")?.medianRent ?? null,
    },
  };
}

/** Bedroom snapshot (latest year where BOTH price & rent exist for the chosen bedroom). */
export async function getLatestBedPriceRent(
  suburb: string,
  state: string | undefined,
  propertyType: "house" | "unit",
  bedroomPrefs: number[]
): Promise<{ year: number; bedroom: number; price: number; rentWeekly: number; impliedYield: number } | null> {
  console.info("[fetchRentalData] getLatestBedPriceRent start", { suburb, state, propertyType, bedroomPrefs });

  let pQ = supabase.from("median_price")
    .select('year, "propertyType", bedroom, medianPrice')
    .eq("suburb", suburb)
    .eq("propertyType", propertyType)
    .in("bedroom", bedroomPrefs)
    .order("year", { ascending: false });
  if (state) pQ = pQ.eq("state", state);
  const { data: pRows, error: pErr } = await pQ;

  let rQ = supabase.from("median_rentals")
    .select('year, "propertyType", bedroom, medianRent')
    .eq("suburb", suburb)
    .eq("propertyType", propertyType)
    .in("bedroom", bedroomPrefs)
    .order("year", { ascending: false });
  if (state) rQ = rQ.eq("state", state);
  const { data: rRows, error: rErr } = await rQ;

  if (pErr) console.error("[fetchRentalData] bed price query error", pErr);
  if (rErr) console.error("[fetchRentalData] bed rent query error", rErr);
  if (!pRows?.length || !rRows?.length) return null;

  const latestYearBy = (rows: { bedroom: number; year: number }[], b: number) =>
  rows.filter(x=>x.bedroom===b).map(x=>Number(x.year)).sort((a,b)=>b-a)[0];

  let best: { year:number; bedroom:number } | null = null;
  for (const b of bedroomPrefs) {
    const yp = latestYearBy(pRows, b);
    const yr = latestYearBy(rRows, b);
    if (yp && yr) {
      const common = Math.min(yp, yr);
      if (!best || common > best.year) best = { year: common, bedroom: b };
    }
  }
  if (!best) return null;

  const priceRow = pRows.find(x => x.bedroom===best!.bedroom && Number(x.year)===best!.year);
  const rentRow  = rRows.find(x => x.bedroom===best!.bedroom && Number(x.year)===best!.year);
  if (!priceRow?.medianPrice || !rentRow?.medianRent) return null;

  const implied = Number((((Number(rentRow.medianRent)*52)/Number(priceRow.medianPrice))*100).toFixed(1));

  return { year: best.year, bedroom: best.bedroom, price: Number(priceRow.medianPrice), rentWeekly: Number(rentRow.medianRent), impliedYield: implied };
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
      content: `You are a smart Australian property investment analyst. Write a concise executive summary (max 40 words) comparing yields. Focus on:
                1. How the suburb compares to metro averages
                2. Positioning vs nearby suburbs  
                3. Key trend insights
                

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

Metro Average Yields:
- House: ${stateAvgHouseYield || 'N/A'}
- Unit: ${stateAvgUnitYield || 'N/A'}

Nearby:
${nearbyInsights.map(n => `- ${n.suburb}: House ${n.houseYield ?? 'N/A'}%, Unit ${n.unitYield ?? 'N/A'}%`).join('\n')}`
    }
  ];

  console.log('[DEBUG-RYS1] Calling OpenAI API with model: gpt-5-mini');

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    temperature: 0.5,
    messages: prompt
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}  

