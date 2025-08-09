import { fetchMedianPrice, fetchRentals } from '@/utils/fetchSuburbData';
import { getContext } from "@/utils/contextManager";
import { getStateAverageYields, generateRentalYieldSummary } from '@/utils/fetchRentalData';

export async function answerRentalYield(suburb: string, lga: string) {
  console.log('[DEBUG-RY1] Starting rental yield calculation for suburb:', suburb, 'LGA:', lga);

  // Step 1: Fetch suburb-level median price
  const suburbPriceRecords = await fetchMedianPrice(suburb);
  if (!suburbPriceRecords || suburbPriceRecords.length === 0) {
    console.error('[ERROR-RY1] No price data found for suburb:', suburb);
    return `Sorry, I couldn't find price data for ${suburb}.`;
  }

  // Use the latest year price
  const latestYear = Math.max(...suburbPriceRecords.map(r => r.year));
  const latestSuburbRecord = suburbPriceRecords.find(r => r.year === latestYear && r.propertyType === 'house');
  if (!latestSuburbRecord || !latestSuburbRecord.medianPrice) {
    console.error('[ERROR-RY1] No valid median price record for suburb in latest year:', suburb);
    return `Sorry, I couldn't find recent price data for ${suburb}.`;
  }

  const medianPrice = latestSuburbRecord.medianPrice;
  console.log('[DEBUG-RY1] Suburb median price:', medianPrice);

  // Step 2: Fetch LGA-level median rent
  const { data: rentalData, error: rentError } = await fetchRentals(lga);
  if (rentError || !rentalData || rentalData.length === 0) {
    console.error('[ERROR-RY1] No rental data found for LGA:', lga, rentError);
    return `Sorry, I couldn't find rental data for ${lga}.`;
  }

  // Use the latest year rent
  const latestRentalYear = Math.max(...rentalData.map(r => r.year));
  const latestRentalRecord = rentalData.find(r => r.year === latestRentalYear && r.propertyType.toLowerCase() === 'house');
  if (!latestRentalRecord || !latestRentalRecord.medianRent) {
    console.error('[ERROR-RY1] No valid rental data for LGA in latest year:', lga);
    return `Sorry, I couldn't find recent rental data for ${lga}.`;
  }

  const weeklyRent = latestRentalRecord.medianRent;
  console.log('[DEBUG-RY1] LGA median weekly rent:', weeklyRent);

  // Step 3: Calculate approximate gross yield
  const annualRent = weeklyRent * 52;
  const estimatedYield = medianPrice > 0 ? ((annualRent / medianPrice) * 100).toFixed(1) : 'N/A';


// Step 4: Compute 3-year yield trend for both property types
const currentYear = latestRentalYear;
const trendStartYear = currentYear - 4;

const yieldTrends: { [key: string]: string[] } = {
  house: [],
  unit: [],
};

['house', 'unit'].forEach((propertyType) => {
  for (let year = trendStartYear; year <= currentYear; year++) {
    const rentRec = rentalData.find(r => r.year === year && r.propertyType.toLowerCase() === propertyType);
    const priceRec = suburbPriceRecords.find(p => p.year === year && p.propertyType.toLowerCase() === propertyType);

    if (rentRec?.medianRent && priceRec?.medianPrice) {
      const yieldPct = ((rentRec.medianRent * 52) / priceRec.medianPrice) * 100;
      yieldTrends[propertyType].push(`${year}: ${yieldPct.toFixed(1)}%`);
    }
  }
});

const houseTrend = yieldTrends.house.length ? `• 🏠 **House**: ${yieldTrends.house.join(', ')}` : '';
const unitTrend = yieldTrends.unit.length ? `• 🏢 **Unit**: ${yieldTrends.unit.join(', ')}` : '';

const trendSection = houseTrend || unitTrend
  ? `\n📈 **3-Year Yield Trend**\n${[houseTrend, unitTrend].filter(Boolean).join('\n')}`
  : '';


  
// Step 7: Compare yield with up to 2 nearby suburbs (same LGA rent, different suburb price)
  const context = getContext();
  const state = context?.state || 'VIC'; // Default to VIC if no state found
  console.log('[DEBUG-RY1] Using state:', state);
const nearbySuburbs = context?.nearbySuburbs || [];
const maxNearby = 2;
const nearbyYields: string[] = [];
const nearbyInsights: {
  suburb: string;
  houseYield?: number;
  unitYield?: number;
}[] = []; // for GPT summary
let nearbyCount = 0;

for (const nSuburb of nearbySuburbs) {
  if (nearbyCount >= maxNearby) break;

  const records = await fetchMedianPrice(nSuburb);
  const house = records.find(r => r.year === latestYear && r.propertyType.toLowerCase() === 'house');
  const unit = records.find(r => r.year === latestYear && r.propertyType.toLowerCase() === 'unit');

  if (house?.medianPrice && unit?.medianPrice) {
   const yieldHouse = parseFloat(((weeklyRent * 52) / house.medianPrice * 100).toFixed(1));
const yieldUnit = parseFloat(((weeklyRent * 52) / unit.medianPrice * 100).toFixed(1));


        //Push raw data for GPT summary
    nearbyInsights.push({
      suburb: nSuburb,
      houseYield: yieldHouse,
      unitYield: yieldUnit
    });
    nearbyYields.push(
      `• **${nSuburb}** → 🏠 House: ${yieldHouse}%, 🏢 Unit: ${yieldUnit}%`
    );

    nearbyCount++;
  }
}

const nearbyMsg = nearbyYields.length
  ? `\n\n🔎 **Nearby Suburbs**\n\n${nearbyYields.map(line => `• ${line}`).join('\n')}`
  : "";

// Step 5: State-level averages
  const { house: stateAvgHouse, unit: stateAvgUnit } = await getStateAverageYields(state, currentYear);
  console.log('[DEBUG-RY1] State averages - House:', stateAvgHouse, 'Unit:', stateAvgUnit);

  // Step 6: Exec Summary from AI
  //const userHouse = yieldTrends.house?.at(-1) || null; - not used. 
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

// Step 8: Build reply
// Step 9: Build reply with yield context
const yieldValue = parseFloat(estimatedYield);
const yieldCategory = yieldValue >= 5 ? "🟢 High" : 
                     yieldValue >= 3.5 ? "🟡 Moderate" : "🔴 Low";

console.log('[DEBUG-RY1] Yield categorization:', { estimatedYield, yieldValue, yieldCategory });
const stateAvgDisplay = typeof stateAvgHouse === 'number' ? ` vs ${state} avg: ${stateAvgHouse}%` : '';

const reply = `📊 **Rental Insights for ${suburb}**

- Median Weekly Rent: $${weeklyRent}
- Median House Price: $${medianPrice.toLocaleString()}
- Estimated Gross Yield: ${estimatedYield}% (${yieldCategory})${stateAvgDisplay}

${summary ? `🔍 **Executive Summary**\n${summary}\n` : ''}
${trendSection}${nearbyMsg}

💡 Data combines LGA and suburb level insights for indicative analysis.`;

console.log('[DEBUG-RY1] Final reply generated successfully');
return reply;

}