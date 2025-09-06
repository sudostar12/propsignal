import { fetchMedianPrice, fetchRentals, fetchRentalYield } from '@/utils/fetchSuburbData';
import { getContext } from "@/utils/contextManager";
import {
  getStateAverageYields,
  getSuburbRentalYields,
  getLatestSuburbRentalYields,
  getNearbySuburbsYields,
  getLatestBedPriceRent,
  generateRentalYieldSummary
} from '@/utils/fetchRentalData';

export async function answerRentalYield(suburb: string, lga: string) {
  console.log('[DEBUG-RY1] Starting rental yield calculation for suburb:', suburb, 'LGA:', lga);

  // Step 1: Fetch suburb-level median price
  const suburbPriceRecords = await fetchMedianPrice(suburb);
  if (!suburbPriceRecords || suburbPriceRecords.length === 0) {
    console.error('[ERROR-RY1] No price data found for suburb:', suburb);
    return `Sorry, I couldn't find price data for ${suburb}.`;
  }

  // Use the latest year price (prefers House for display)
  const latestYear = Math.max(...suburbPriceRecords.map(r => r.year));
  const latestSuburbRecord = suburbPriceRecords.find(r => r.year === latestYear && r.propertyType === 'house');
  if (!latestSuburbRecord || !latestSuburbRecord.medianPrice) {
    console.error('[ERROR-RY1] No valid median price record for suburb in latest year:', suburb);
    return `Sorry, I couldn't find recent price data for ${suburb}.`;
  }

  const medianPrice = latestSuburbRecord.medianPrice;
  console.log('[DEBUG-RY1] Suburb median price:', medianPrice);

  // Step 2: Fetch suburb-level median rent (kept for display; yields no longer computed from this)
  const { data: rentalData, error: rentError } = await fetchRentals(suburb);
  if (rentError || !rentalData || rentalData.length === 0) {
    console.error('[ERROR-RY1] No rental data found for suburb:', suburb, rentError);
    return `Sorry, I couldn't find rental data for ${suburb}.`;
  }

  // Use the latest year rent
  const latestRentalYear = Math.max(...rentalData.map(r => r.year));
  const latestRentalRecord = rentalData.find(r => r.year === latestRentalYear && r.propertyType.toLowerCase() === 'house');
  if (!latestRentalRecord || !latestRentalRecord.medianRent) {
    console.error('[ERROR-RY1] No valid rental data for suburb in latest year:', suburb);
    return `Sorry, I couldn't find recent rental data for ${suburb}.`;
  }

  const weeklyRent = latestRentalRecord.medianRent;
  console.log('[DEBUG-RY1] Suburb median weekly rent:', weeklyRent);

// Step 3: Check for pre-calculated rental yields in median_rentals table first
  console.log('[DEBUG-RY1] Checking for pre-calculated rental yields in median_rentals');
  const { data: preCalculatedYields, error: yieldError } = await fetchRentalYield(suburb, latestRentalYear);
  
  let latestYieldHouse = null;
  let latestYieldUnit = null;
  let latestYieldYear = latestRentalYear;
  let usePreCalculated = false;

  // Check if we found pre-calculated yields
  if (!yieldError && preCalculatedYields && preCalculatedYields.length > 0) {
    console.log('[DEBUG-RY1] Found pre-calculated yields:', preCalculatedYields.length, 'records');
    
    // Extract house and unit yields from pre-calculated data
    const houseYieldRecord = preCalculatedYields.find(r => r.propertyType.toLowerCase() === 'house');
    const unitYieldRecord = preCalculatedYields.find(r => r.propertyType.toLowerCase() === 'unit');
    
    if (houseYieldRecord && houseYieldRecord.rentalYield) {
      latestYieldHouse = houseYieldRecord.rentalYield;
      latestYieldYear = houseYieldRecord.year;
      usePreCalculated = true;
      console.log('[DEBUG-RY1] Using pre-calculated house yield:', latestYieldHouse);
    }
    
    if (unitYieldRecord && unitYieldRecord.rentalYield) {
      latestYieldUnit = unitYieldRecord.rentalYield;
      latestYieldYear = unitYieldRecord.year;
      usePreCalculated = true;
      console.log('[DEBUG-RY1] Using pre-calculated unit yield:', latestYieldUnit);
    }
  } else {
    console.log('[DEBUG-RY1] No pre-calculated yields found, will use rental_yields calculation');
  }

  // Step 4: For any missing yields, fall back to rental_yields calculation
  if (latestYieldHouse === null || latestYieldUnit === null) {
    console.log('[DEBUG-RY1] Getting yields from rental_yields for missing values');
    const { year: calcYieldYear, house: calcYieldHouse, unit: calcYieldUnit } =
      await getLatestSuburbRentalYields(suburb);

    // Use calculated values only for missing yields
    if (latestYieldHouse === null && calcYieldHouse != null) {
      latestYieldHouse = calcYieldHouse;
      latestYieldYear = calcYieldYear ?? latestRentalYear;
      console.log('[DEBUG-RY1] Using calculated house yield:', latestYieldHouse);
    }
    
    if (latestYieldUnit === null && calcYieldUnit != null) {
      latestYieldUnit = calcYieldUnit;
      latestYieldYear = calcYieldYear ?? latestRentalYear;
      console.log('[DEBUG-RY1] Using calculated unit yield:', latestYieldUnit);
    }
  }

  console.log('[DEBUG-RY1] Final yields - House:', latestYieldHouse, 'Unit:', latestYieldUnit, 'Year:', latestYieldYear);

  // Prefer house yield for headline if available, else unit; else N/A
  const estimatedYield =
    latestYieldHouse != null ? Number(latestYieldHouse).toFixed(1)
    : latestYieldUnit != null ? Number(latestYieldUnit).toFixed(1)
    : 'N/A';

  // Use a single canonical year for "latest" yield sections downstream
  const latestYearForYields = latestYieldYear ?? latestRentalYear;

  // Step 4: Compute yield trend using rental_yields
  const currentYear = latestYearForYields;
  const trendStartYear = currentYear - 4;

  const yieldTrends: { [key: string]: string[] } = { house: [], unit: [] };

  // Pull yield series directly from rental_yields
  const series = await getSuburbRentalYields(suburb);
  console.log('[rentalYieldAnswer] yield series count', { suburb, count: series.length });

  // Build last 5 years trend using rental_yields (skip missing years)
  ['house', 'unit'].forEach((propertyType) => {
    for (let year = trendStartYear; year <= currentYear; year++) {
      const row = series.find(r =>
        r.year === year && (r.propertyType || '').toLowerCase() === propertyType
      );
      if (row && typeof row.yieldPct === 'number') {
        yieldTrends[propertyType].push(`${year}: ${row.yieldPct.toFixed(1)}%`);
      }
    }
  });

  const houseTrend = yieldTrends.house.length ? `• 🏠 **House**: ${yieldTrends.house.join(', ')}` : '';
  const unitTrend = yieldTrends.unit.length ? `• 🏢 **Unit**: ${yieldTrends.unit.join(', ')}` : '';

const trendSection = houseTrend || unitTrend
  ? `\n\n📈 **3-Year Yield Trend**\n${[houseTrend, unitTrend].filter(Boolean).join('\n')}`
  : '';

// ✅ Move context/state UP so it's available to the bedroom snapshot and later blocks
const context = getContext();
const state = context?.state || 'VIC'; // Default to VIC if no state found
console.log('[DEBUG-RY1] Using state:', state);

// 🛏️ Bedroom snapshot (non-breaking add-on)
const HOUSE_PREF = [4, 3, 2];  // recommended order for houses
const UNIT_PREF  = [2, 1, 3];  // recommended for units

const bedHouse = await getLatestBedPriceRent(suburb, state, 'house', HOUSE_PREF);
const bedUnit  = await getLatestBedPriceRent(suburb, state, 'unit',  UNIT_PREF);

const bedLines: string[] = [];
if (bedHouse) {
  bedLines.push(`- 🏠 **House (${bedHouse.bedroom}BR, ${bedHouse.year})** — Price: $${bedHouse.price.toLocaleString()} | Rent: $${Number(bedHouse.rentWeekly).toLocaleString()}/wk`);
}
if (bedUnit) {
  bedLines.push(`- 🏢 **Unit (${bedUnit.bedroom}BR, ${bedUnit.year})** — Price: $${bedUnit.price.toLocaleString()} | Rent: $${Number(bedUnit.rentWeekly).toLocaleString()}/wk`);
}

const bedroomSection = bedLines.length
  ? `\n\n\n🛏️ **Bedroom snapshot**\n${bedLines.join('\n')}`
  : '';


  // Step 7: Compare yield with up to 2 nearby suburbs (suburb-level yield from rental_yields)
  const nearbySuburbs = context?.nearbySuburbs || [];
  const maxNearby = 2;
  const nearbyYields: string[] = [];
  const nearbyInsights: {
    suburb: string;
    houseYield?: number;
    unitYield?: number;
  }[] = []; // for GPT summary
  let nearbyCount = 0;

  // Use the same “latest” year as the main suburb for apples-to-apples comparison
  const nbMap = await getNearbySuburbsYields(nearbySuburbs, latestYearForYields, state);
  console.log('[rentalYieldAnswer] nearby yields map', { keys: Object.keys(nbMap) });

  for (const nSuburb of nearbySuburbs) {
    if (nearbyCount >= maxNearby) break;
    const rec = nbMap[nSuburb];
    if (!rec) continue;

    const yh = typeof rec.house === 'number' ? Number(rec.house).toFixed(1) : null;
    const yu = typeof rec.unit  === 'number' ? Number(rec.unit).toFixed(1)  : null;

    if (yh || yu) {
      if (yh && yu) {
        nearbyYields.push(`• **${nSuburb}** → 🏠 House: ${yh}%, 🏢 Unit: ${yu}%`);
        nearbyInsights.push({ suburb: nSuburb, houseYield: Number(yh), unitYield: Number(yu) });
        nearbyCount++;
      } else if (yh) {
        nearbyYields.push(`• **${nSuburb}** → 🏠 House: ${yh}%`);
        nearbyInsights.push({ suburb: nSuburb, houseYield: Number(yh) });
        nearbyCount++;
      } else if (yu) {
        nearbyYields.push(`• **${nSuburb}** → 🏢 Unit: ${yu}%`);
        nearbyInsights.push({ suburb: nSuburb, unitYield: Number(yu) });
        nearbyCount++;
      }
    }
  }

  const nearbySection = nearbyYields.length
    ? `\n\n\n🔎 **Nearby suburbs perspective**\n${nearbyYields.join('\n')}`
    : '';

  // Step 5: Capital-city averages from rental_yields (state + suburb='Melbourne', propertyType in ['house-all','unit-all'])
  const { house: stateAvgHouse, unit: stateAvgUnit } =
    await getStateAverageYields(state, latestYearForYields);

  console.log('[DEBUG-RY1] Capital-city averages - House:', stateAvgHouse, 'Unit:', stateAvgUnit);

  // Step 6: Exec Summary from AI (kept as-is)
  const userUnit = yieldTrends.unit?.at(-1) || null;

  const summary = await generateRentalYieldSummary({
    suburb,
    year: currentYear,
    userHouseYield: parseFloat(estimatedYield),
    userUnitYield: userUnit ? parseFloat(userUnit.replace(/.*:\s/, '').replace('%', '')) : undefined,
    nearbyInsights,
    state,
    stateAvgHouseYield: typeof stateAvgHouse === 'number' ? stateAvgHouse : undefined,
    stateAvgUnitYield: typeof stateAvgUnit === 'number' ? stateAvgUnit : undefined
  });

// Step 8: Build reply (kept your original structure; just show both yields + nicer rent format)
const cat = (v: number | null | undefined) => {
  if (v == null || Number.isNaN(Number(v))) return '';
  const n = Number(v);
  return n >= 5 ? '🟢 High' : n >= 4 ? '🟡 Moderate' : n >= 3 ? '🟠 Low' : '🔴 Very Low';
};

const houseHeadline = latestYieldHouse != null
  ? `${Number(latestYieldHouse).toFixed(1)}% (${cat(latestYieldHouse)})`
  : 'N/A';
const unitHeadline = latestYieldUnit != null
  ? `${Number(latestYieldUnit).toFixed(1)}% (${cat(latestYieldUnit)})`
  : 'N/A';

  // ⬇️ ADD directly below houseHeadline / unitHeadline
const delta = (v: number | null | undefined, avg: number | null | undefined): number | null => {
  if (v == null || avg == null || Number.isNaN(Number(v)) || Number.isNaN(Number(avg))) return null;
  return Number(v) - Number(avg); // percentage points
};

const arrow = (n: number) => (n > 0 ? '▲' : n < 0 ? '▼' : '■');

const dH = delta(latestYieldHouse, stateAvgHouse);
const dU = delta(latestYieldUnit,  stateAvgUnit);

const deltaLine =
  (dH != null || dU != null)
    ? `\n↕️ **Vs capital-city avg** — House: ${dH != null ? `${dH.toFixed(1)} pp ${arrow(dH)}` : 'N/A'}, Unit: ${dU != null ? `${dU.toFixed(1)} pp ${arrow(dU)}` : 'N/A'}\n`
    : '';


const reply =
`**Rental Insights for ${suburb}**

- Median Weekly Rent (${latestRentalYear}): $${Number(weeklyRent).toLocaleString()}
- Median House Price (${latestYear}): $${medianPrice.toLocaleString()}
- Estimated Gross Yield — House: ${houseHeadline}
- Estimated Gross Yield — Unit: ${unitHeadline}
${deltaLine}
${trendSection}${nearbySection}${bedroomSection}

🧭 **Summary**
\n${summary}

💡 Data uses suburb-level insights for indicative analysis.`;

  console.log('[DEBUG-RY1] Final reply built for', suburb);
  return reply;
}
