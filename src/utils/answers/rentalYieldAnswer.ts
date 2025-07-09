import { fetchMedianPrice, fetchRentals } from '@/utils/fetchSuburbData';

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

  // Step 4: Build reply
  const reply = `📊 Rental Insights for ${suburb}

• Median Weekly Rent (LGA level): $${weeklyRent}
• Median House Price (Suburb level): $${medianPrice.toLocaleString()}
• Estimated Gross Yield: ${estimatedYield}% (indicative only, based on LGA rent)

💬 More suburb-specific rental data coming soon!`;

  return reply;
}