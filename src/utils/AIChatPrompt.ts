// utils/AIChatPrompt.ts

// Type definitions for better type safety and debugging
type HousePrice = {
  medianPrice?: number;
  year?: number;
  propertyType?: string;
  suburb?: string;
};

type Rental = {
  medianRent?: number;
  year?: number;
  propertyType?: string;
  bedroom?: string; // 2BHK, 3BHK, 4BHK
  lga?: string;
};

type Crime = {
  offenceCount?: number;
  year?: number;
  suburb?: string;
};

type Project = {
  project?: string;
  description?: string;
  investment?: string;
  status?: string;
  lga?: string;
};

type Demographics = {
  medianAge?: number;
  totalPopulation?: number;
  culturalDiversity?: string;
  householdIncome?: number;
  year?: number;
};

type Population = {
  year?: number;
  totalPersons?: number;
  SA2Name?: string;
  SA2Code?: string;
};

type HouseholdForecast = {
  year?: number; // 2021, 2026, 2031, or 2036
  householdType?: string;
  households?: number;
  region?: string; // SA2 region name
};

type DataSets = {
  house_prices: HousePrice[];
  rentals: Rental[];
  crime: Crime[];
  projects: Project[];
  demographics: Demographics[];
  population: Population[];
  household_forecast: HouseholdForecast[];
};

// CHANGE 1: Added housePrice, unitPrice, and propertyType fields for accurate median price tracking
interface CalculatedMetrics {
  averagePrice: number | null;
  priceGrowth: number | null;
  averageRent: number | null;
  rentalYield: number | null;
  totalCrime: number;
  crimeGrowth: number | null;
  populationGrowth: number | null;
  medianAge: number | null;
  medianIncome: number | null;
  householdGrowthRate: number | null;
  totalHouseholdGrowth: number | null;
  familyDemandGrowth: number | null;
  housePrice: number | null; // ADDED: Separate house price tracking
  unitPrice: number | null;  // ADDED: Separate unit price tracking
  propertyType: string;       // ADDED: Primary property type used
}

export function AIChatPrompt(
  possible_suburb: string | null, 
  detected_intent: string | null, 
  data: DataSets,
  lga?: string,
  state?: string
): string {
  console.log('[DEBUG] AIChatPrompt - Starting prompt generation');
  console.log('[DEBUG] AIChatPrompt - Input params:', { 
    possible_suburb, 
    detected_intent, 
    lga, 
    state,
    dataKeys: Object.keys(data),
    dataCounts: {
      house_prices: data.house_prices?.length || 0,
      rentals: data.rentals?.length || 0,
      crime: data.crime?.length || 0,
      projects: data.projects?.length || 0,
      demographics: data.demographics?.length || 0,
      population: data.population?.length || 0,
    }
  });

  // Build memory context for continuity
  let memory_context = '';
  if (possible_suburb) {
    memory_context += `The user is asking about ${possible_suburb}`;
    if (lga && state) {
      memory_context += ` (located in ${lga}, ${state})`;
    }
    memory_context += '.';
  }
  if (detected_intent && detected_intent !== 'unsure') {
    memory_context += ` User intent: ${detected_intent}.`;
  }
  console.log('[DEBUG] AIChatPrompt - Memory context:', memory_context);

  // Calculate comprehensive data metrics
  const metrics = calculateDataMetrics(data);
  console.log('[DEBUG] AIChatPrompt - Calculated metrics:', metrics);

  // Generate data summary with more intelligence
  const data_summary = generateDataSummary(data, metrics, possible_suburb);
  console.log('[DEBUG] AIChatPrompt - Data summary length:', data_summary.length);

  // Determine response tone based on intent
  const toneGuidance = getToneGuidance(detected_intent);
  console.log('[DEBUG] AIChatPrompt - Tone guidance:', toneGuidance);

  // Build the comprehensive AI prompt
  const prompt = `You are PropSignal AI, Australia's most trusted property intelligence assistant.

Your mission: Provide data-driven, actionable property insights that help Australians make informed real estate decisions.

🔒 STRICT GUARDRAILS:
- NEVER mention your training data, AI architecture, OpenAI, APIs, or technical limitations
- NEVER provide specific financial advice - keep insights general and data-focused
- NEVER speculate beyond available data - be honest about data gaps
- NEVER reference internal processes or prompt engineering

🎯 RESPONSE TONE: ${toneGuidance}

📍 LOCATION CONTEXT:
${memory_context}

📊 KEY DATA INSIGHTS:
${data_summary}

📈 CALCULATED METRICS:
${formatMetricsForAI(metrics)}

🗂️ AVAILABLE DATASETS:
${formatDataForAI(data)}

📝 RESPONSE STRUCTURE (MANDATORY):

## 🎯 Quick Take
One compelling sentence about ${possible_suburb}'s investment or lifestyle appeal.

## 📈 Property Market Performance
### Recent Price Trends (Focus on Last 3 Years)
- **CRITICAL**: Use the EXACT median prices from the data - Houses: ${metrics.housePrice ? '$' + metrics.housePrice.toLocaleString() : 'N/A'}, Units: ${metrics.unitPrice ? '$' + metrics.unitPrice.toLocaleString() : 'N/A'}
- These are the current ${new Date().getFullYear()} median prices - do NOT average or modify these figures
- Calculate and show 3-year trend analysis using the priceGrowth metric: ${metrics.priceGrowth ? metrics.priceGrowth + '% average annual' : 'trend data unavailable'}
- Compare to ${state || 'state'} averages where possible
- Note any significant price movements, plateaus, or acceleration in recent years
- Use longer-term data (2009-2023) only for historical context, not current predictions

### Rental Market Strength
- Current rental rates and yield potential
- Rental demand indicators and vacancy trends
- ROI assessment for investors

## 👥 Community & Demographics  
### Population Profile
- Age demographics and household composition
- Population growth trends and migration patterns
- Cultural diversity and community characteristics

### Economic Indicators
- Household income levels and employment patterns
- Socioeconomic trends affecting property demand

## 🏗️ Infrastructure & Development
### Current Projects
- Major infrastructure investments and timelines
- Transport improvements and connectivity upgrades
- Commercial and residential developments

### Future Growth Drivers
**IMPORTANT: Use the household forecast data to provide AI-driven analysis:**
- Analyze household growth forecasts across the 5-year intervals (2021→2026→2031→2036) to predict property demand
- Identify which household types (families vs singles vs couples) are growing fastest over the 15-year period
- Connect household growth patterns to property investment opportunities (houses vs units)
- Calculate how household demand growth translates to property value potential
- Compare family household growth vs total household growth to identify target markets
- Use the calculated metrics (householdGrowthRate from 2021-2036, familyDemandGrowth) to support your analysis
- Provide specific insights: "With X% total household growth over 15 years and Y% family demand increase, this suggests Z for property investors"
- Mention planned projects and government investments in context of these demographic forecast trends
- Note that these are official VIC government forecasts using 5-year intervals, making them highly reliable for investment planning

## ⚠️ Risk Assessment
### Crime & Safety
- Current crime statistics and recent trends
- Safety perception and community concerns
- Year-on-year changes in crime patterns

### Market Risks
- Oversupply concerns or demand pressures
- Economic factors affecting the local market
- Infrastructure gaps or community challenges

## 🧠 Investment Intelligence
Provide clear ratings using traffic light system:

**Capital Growth Potential:** 🟢 Strong / 🟡 Moderate / 🔴 Weak
**Rental Yield:** 🟢 Strong / 🟡 Moderate / 🔴 Weak  
**Risk Level:** 🟢 Low / 🟡 Moderate / 🔴 High
**Market Liquidity:** 🟢 High / 🟡 Moderate / 🔴 Low

**Best Suited For:** [e.g., First-home buyers, Long-term investors, Yield-focused buyers]

**Watch List:** Key indicators to monitor for future opportunities or risks.

---

FORMATTING REQUIREMENTS:
- Use markdown headers exactly as shown above
- Include relevant emojis but limit to 1 per section
- Provide specific numbers when available
- If data is missing, acknowledge gaps honestly
- End with actionable next steps or follow-up questions
- Keep total response under 800 words for readability

DATA QUALITY NOTE: Base all insights on the provided datasets. If data is limited, focus on available information and suggest what additional research might be valuable.`;

  console.log('[DEBUG] AIChatPrompt - Final prompt length:', prompt.length, 'characters');
  return prompt.trim();
}

/**
 * Calculate comprehensive metrics from raw data with optimized trend analysis
 */
function calculateDataMetrics(data: DataSets): CalculatedMetrics {
  console.log('[DEBUG] calculateDataMetrics - Starting optimized calculations');
  console.log('[DEBUG] calculateDataMetrics - Raw house_prices data:', data.house_prices);

  // Get current year data (most recent available)
  const allPrices = data.house_prices?.filter(p => p.year && p.medianPrice) || [];
  console.log('[DEBUG] calculateDataMetrics - Filtered prices:', allPrices);
  
  // Find the latest year available
  const latestYear = Math.max(...allPrices.map(p => p.year || 0));
  console.log('[DEBUG] calculateDataMetrics - Latest year found:', latestYear);
  
  // Get current year data by property type
  const currentYearPrices = allPrices.filter(p => p.year === latestYear);
  console.log('[DEBUG] calculateDataMetrics - Current year prices:', currentYearPrices);
  
  // Separate by property type
  const housePrice = currentYearPrices.find(p => 
    p.propertyType?.toLowerCase().includes('house') || 
    p.propertyType?.toLowerCase().includes('dwelling')
  )?.medianPrice;
  
  const unitPrice = currentYearPrices.find(p => 
    p.propertyType?.toLowerCase().includes('unit') || 
    p.propertyType?.toLowerCase().includes('apartment')
  )?.medianPrice;
  
  console.log('[DEBUG] calculateDataMetrics - House price:', housePrice, 'Unit price:', unitPrice);
  
  // CHANGE 2: Modified to keep both house and unit prices separate, plus track property type
  let averagePrice = null;
  let propertyType = '';
  
  if (housePrice && unitPrice) {
    // If both exist, use house price as primary but keep both for summary
    averagePrice = housePrice;
    propertyType = 'house';
    console.log('[DEBUG] calculateDataMetrics - Using house price as primary:', averagePrice, 'Unit price available:', unitPrice);
  } else if (housePrice) {
    averagePrice = housePrice;
    propertyType = 'house';
    console.log('[DEBUG] calculateDataMetrics - Using house price only:', averagePrice);
  } else if (unitPrice) {
    averagePrice = unitPrice;
    propertyType = 'unit';
    console.log('[DEBUG] calculateDataMetrics - Using unit price only:', averagePrice);
  }

  // OPTIMIZED TREND ANALYSIS - Focus on last 3 years for efficiency and relevance
  let priceGrowth = null;
  if (latestYear && averagePrice) {
    // Get last 3 years of data for the same property type
    const recentYears = [latestYear - 2, latestYear - 1, latestYear];
    const recentData = allPrices.filter(p => 
      recentYears.includes(p.year || 0) && 
      (propertyType === 'house' ? 
        (p.propertyType?.toLowerCase().includes('house') || p.propertyType?.toLowerCase().includes('dwelling')) :
        (p.propertyType?.toLowerCase().includes('unit') || p.propertyType?.toLowerCase().includes('apartment'))
      )
    ).sort((a, b) => (a.year || 0) - (b.year || 0));
    
    console.log('[DEBUG] calculateDataMetrics - Recent 3-year data for', propertyType, ':', recentData);
    
    if (recentData.length >= 2) {
      const firstRecord = recentData[0];
      const lastRecord = recentData[recentData.length - 1];
      
      console.log('[DEBUG] calculateDataMetrics - Growth calculation:', firstRecord.year, firstRecord.medianPrice, 'to', lastRecord.year, lastRecord.medianPrice);
      
      if (firstRecord.medianPrice && lastRecord.medianPrice && firstRecord.year && lastRecord.year) {
        const years = lastRecord.year - firstRecord.year;
        if (years > 0) {
          // Calculate average annual growth over the period
          priceGrowth = Math.round(((lastRecord.medianPrice - firstRecord.medianPrice) / firstRecord.medianPrice) * 100 / years * 100) / 100;
          console.log('[DEBUG] calculateDataMetrics - Calculated average annual price growth:', priceGrowth, '% over', years, 'years');
        }
      }
    }
  }

  // Rental calculations - use latest year data
  const allRentals = data.rentals?.filter(r => r.year && r.medianRent) || [];
  console.log('[DEBUG] calculateDataMetrics - Raw rentals data:', allRentals);
  
  const latestRentalYear = Math.max(...allRentals.map(r => r.year || 0));
  console.log('[DEBUG] calculateDataMetrics - Latest rental year:', latestRentalYear);
  
  const currentRentals = allRentals.filter(r => r.year === latestRentalYear);
  console.log('[DEBUG] calculateDataMetrics - Current year rentals:', currentRentals);
  
  // Get rental by property type (prefer house rental)
  const houseRental = currentRentals.find(r => 
    r.propertyType?.toLowerCase().includes('house') || 
    r.propertyType?.toLowerCase().includes('dwelling')
  )?.medianRent;
  
  const unitRental = currentRentals.find(r => 
    r.propertyType?.toLowerCase().includes('unit') || 
    r.propertyType?.toLowerCase().includes('apartment')
  )?.medianRent;
  
  console.log('[DEBUG] calculateDataMetrics - House rental:', houseRental, 'Unit rental:', unitRental);
  
  const averageRent = houseRental || unitRental || null;
  console.log('[DEBUG] calculateDataMetrics - Selected rental:', averageRent);

  // Rental yield calculation (weekly rent * 52 / purchase price * 100)
  const rentalYield = averagePrice && averageRent 
    ? Math.round(((averageRent * 52) / averagePrice) * 100 * 100) / 100 // Round to 2 decimal places
    : null;
  console.log('[DEBUG] calculateDataMetrics - Calculated rental yield:', rentalYield, '%');

  // Crime calculations - simplified for offenceCount, year, suburb only
  const allCrime = data.crime?.filter(c => c.year && c.offenceCount) || [];
  console.log('[DEBUG] calculateDataMetrics - Raw crime data:', allCrime);
  console.log('[DEBUG] calculateDataMetrics - Crime data length:', allCrime.length);
  
  if (allCrime.length > 0) {
    console.log('[DEBUG] calculateDataMetrics - Sample crime record:', allCrime[0]);
  }
  
  let totalCrime = 0;
  let crimeGrowth = null;
  
  if (allCrime.length > 0) {
    // Focus on recent years only (last 3 years for efficiency)
    const recentCrime = allCrime.filter(c => c.year && c.year >= 2021);
    console.log('[DEBUG] calculateDataMetrics - Recent crime data (2021+):', recentCrime.length, 'records');
    
    if (recentCrime.length > 0) {
      const latestCrimeYear = Math.max(...recentCrime.map(c => c.year || 0));
      console.log('[DEBUG] calculateDataMetrics - Latest crime year:', latestCrimeYear);
      
      const currentCrime = recentCrime.filter(c => c.year === latestCrimeYear);
      
      // Sum up all offence counts for the latest year
      totalCrime = currentCrime.reduce((sum, c) => sum + (c.offenceCount || 0), 0);
      console.log('[DEBUG] calculateDataMetrics - Current year total crime:', totalCrime);
      
      // Crime growth (compare to previous year)
      if (latestCrimeYear > 2021) {
        const previousCrime = recentCrime.filter(c => c.year === latestCrimeYear - 1);
        const previousTotal = previousCrime.reduce((sum, c) => sum + (c.offenceCount || 0), 0);
        
        console.log('[DEBUG] calculateDataMetrics - Previous year total crime:', previousTotal);
        
        if (previousTotal > 0 && totalCrime >= 0) {
          crimeGrowth = Math.round(((totalCrime - previousTotal) / previousTotal) * 100);
          console.log('[DEBUG] calculateDataMetrics - Crime growth:', crimeGrowth, '%');
        }
      }
    }
  }

  // Population growth - use latest year data (OPTIMIZED - no age groups)
  console.log('[DEBUG] calculateDataMetrics - Raw population data length:', data.population?.length || 0);
  
  // Filter to get unique years with total population data
  const populationByYear = data.population?.filter(p => 
    p.year && p.totalPersons
  ) || [];
  
  console.log('[DEBUG] calculateDataMetrics - Population data with totals:', populationByYear.length, 'records');
  
  let populationGrowth = null;
  if (populationByYear.length >= 2) {
    // Focus on recent 3-year trend for efficiency and relevance
    const recentPopData = populationByYear
      .filter(p => p.year && p.year >= 2021) // Last 3 years only
      .sort((a, b) => (a.year || 0) - (b.year || 0));
    
    console.log('[DEBUG] calculateDataMetrics - Recent population data (2021-2023):', recentPopData);
    
    if (recentPopData.length >= 2) {
      const first = recentPopData[0];
      const last = recentPopData[recentPopData.length - 1];
      
      console.log('[DEBUG] calculateDataMetrics - Population growth calc:', first.year, first.totalPersons, 'to', last.year, last.totalPersons);
      
      if (first.totalPersons && last.totalPersons && first.year && last.year) {
        const years = last.year - first.year;
        if (years > 0) {
          // Calculate average annual population growth
          populationGrowth = Math.round(((last.totalPersons - first.totalPersons) / first.totalPersons) * 100 / years * 100) / 100;
          console.log('[DEBUG] calculateDataMetrics - Population growth:', populationGrowth, '% average annual over', years, 'years');
        }
      }
    }
  }

  // Demographics - use latest year data
  const latestDemo = data.demographics
    ?.filter(d => d.year)
    ?.sort((a, b) => (b.year || 0) - (a.year || 0))[0];
  console.log('[DEBUG] calculateDataMetrics - Latest demographics:', latestDemo);

  // Household forecast calculations
  console.log('[DEBUG] calculateDataMetrics - Household forecast data:', data.household_forecast);
  
  let householdGrowthRate = null;
  let totalHouseholdGrowth = null;
  let familyDemandGrowth = null;
  
  if (data.household_forecast && data.household_forecast.length > 0) {
    // Calculate total household growth from 2021 to 2036 (using available forecast years)
    const totalHouseholds = data.household_forecast.filter(h => h.householdType === 'total households');
    console.log('[DEBUG] calculateDataMetrics - Total household forecasts:', totalHouseholds);
    
    if (totalHouseholds.length >= 2) {
      // Get baseline (2021) and final projection (2036)
      const baseline = totalHouseholds.find(h => h.year === 2021)?.households;
      const final2036 = totalHouseholds.find(h => h.year === 2036)?.households;
      
      console.log('[DEBUG] calculateDataMetrics - Household growth:', '2021:', baseline, 'to 2036:', final2036);
      
      if (baseline && final2036 && baseline > 0) {
        const yearsDiff = 2036 - 2021; // 15 years
        totalHouseholdGrowth = Math.round(((final2036 - baseline) / baseline) * 100);
        householdGrowthRate = Math.round((totalHouseholdGrowth / yearsDiff) * 100) / 100;
        
        console.log('[DEBUG] calculateDataMetrics - Total household growth:', totalHouseholdGrowth, '% over', yearsDiff, 'years');
        console.log('[DEBUG] calculateDataMetrics - Annual household growth rate:', householdGrowthRate, '% per year');
      }
      
      // Also calculate near-term growth (2021 to 2026)
      const year2026 = totalHouseholds.find(h => h.year === 2026)?.households;
      if (baseline && year2026 && baseline > 0) {
        const nearTermGrowth = Math.round(((year2026 - baseline) / baseline) * 100);
        console.log('[DEBUG] calculateDataMetrics - Near-term growth (2021-2026):', nearTermGrowth, '%');
      }
    }
    
    // Calculate family demand growth (families with children + single parents)
    const familyTypes = ['couple family with children', 'one-parent family'];
    const familyData2021 = data.household_forecast.filter(h => h.year === 2021 && familyTypes.includes(h.householdType || ''));
    const familyData2036 = data.household_forecast.filter(h => h.year === 2036 && familyTypes.includes(h.householdType || ''));
    
    console.log('[DEBUG] calculateDataMetrics - Family data 2021:', familyData2021);
    console.log('[DEBUG] calculateDataMetrics - Family data 2036:', familyData2036);
    
    if (familyData2021.length >= 2 && familyData2036.length >= 2) {
      const families2021 = familyData2021.reduce((sum, h) => sum + (h.households || 0), 0);
      const families2036 = familyData2036.reduce((sum, h) => sum + (h.households || 0), 0);
      
      console.log('[DEBUG] calculateDataMetrics - Family households:', families2021, 'to', families2036);
      
      if (families2021 > 0 && families2036 > 0) {
        familyDemandGrowth = Math.round(((families2036 - families2021) / families2021) * 100);
        console.log('[DEBUG] calculateDataMetrics - Family demand growth:', familyDemandGrowth, '%');
      }
    }
  }

  // CHANGE 3: Added housePrice, unitPrice, and propertyType to the returned metrics
  const metrics: CalculatedMetrics = {
    averagePrice,
    priceGrowth,
    averageRent,
    rentalYield,
    totalCrime,
    crimeGrowth,
    populationGrowth,
    medianAge: latestDemo?.medianAge || null,
    medianIncome: latestDemo?.householdIncome || null,
    householdGrowthRate,
    totalHouseholdGrowth,
    familyDemandGrowth,
    // ADDED: Separate price tracking for accurate display
    housePrice: housePrice || null,
    unitPrice: unitPrice || null,
    propertyType,
  };

  console.log('[DEBUG] calculateDataMetrics - Results:', metrics);
  return metrics;
}

/**
 * Generate intelligent data summary with accurate pricing
 */
function generateDataSummary(data: DataSets, metrics: CalculatedMetrics, suburb: string | null): string {
  console.log('[DEBUG] generateDataSummary - Creating summary for:', suburb);
  console.log('[DEBUG] generateDataSummary - Using metrics:', metrics);
  
  let summary = '';

  // Get latest year data for accurate reporting
  const allPrices = data.house_prices?.filter(p => p.year && p.medianPrice) || [];
  const latestYear = Math.max(...allPrices.map(p => p.year || 0));
  
  console.log('[DEBUG] generateDataSummary - Latest year:', latestYear);
  console.log('[DEBUG] generateDataSummary - House price:', metrics.housePrice, 'Unit price:', metrics.unitPrice);

  // CHANGE 4: Modified to use exact database values instead of potentially incorrect calculations
  // ACCURATE Price summary - show exactly what's in the database
  if (metrics.housePrice && metrics.unitPrice) {
    summary += `${latestYear} median prices: Houses $${metrics.housePrice.toLocaleString()}, Units $${metrics.unitPrice.toLocaleString()}`;
  } else if (metrics.housePrice) {
    summary += `${latestYear} median house price: $${metrics.housePrice.toLocaleString()}`;
  } else if (metrics.unitPrice) {
    summary += `${latestYear} median unit price: $${metrics.unitPrice.toLocaleString()}`;
  }
  
  if (metrics.priceGrowth !== null) {
    const trend = metrics.priceGrowth > 0 ? 'growth' : 'decline';
    summary += ` (${Math.abs(metrics.priceGrowth)}% average annual ${trend} over recent years)`;
  }
  if (summary) summary += '. ';

  // Rental summary
  if (metrics.averageRent) {
    summary += `Weekly rent: $${metrics.averageRent}`;
    if (metrics.rentalYield) {
      summary += ` (${metrics.rentalYield}% yield)`;
    }
    summary += '. ';
  }

  // Population summary
  if (metrics.populationGrowth !== null) {
    const direction = metrics.populationGrowth > 0 ? 'growing' : 'declining';
    summary += `Population ${direction} at ${Math.abs(metrics.populationGrowth)}% annually. `;
  }

  // Crime summary
  if (metrics.totalCrime > 0) {
    summary += `${metrics.totalCrime} total offences recorded`;
    if (metrics.crimeGrowth !== null) {
      const trend = metrics.crimeGrowth > 0 ? 'increase' : 'decrease';
      summary += ` (${Math.abs(metrics.crimeGrowth)}% ${trend} year-on-year)`;
    }
    summary += '. ';
  }

  // Projects summary
  if (data.projects && data.projects.length > 0) {
    const projectCount = data.projects.length;
    summary += `${projectCount} infrastructure project${projectCount > 1 ? 's' : ''} planned or underway. `;
  }

  // Household forecast summary
  if (metrics.totalHouseholdGrowth !== null && metrics.householdGrowthRate !== null) {
    summary += `Household forecasts show ${metrics.householdGrowthRate}% annual growth (${metrics.totalHouseholdGrowth}% total from 2021-2036). `;
  }
  
  if (metrics.familyDemandGrowth !== null) {
    const direction = metrics.familyDemandGrowth > 0 ? 'increasing' : 'decreasing';
    summary += `Family household demand ${direction} by ${Math.abs(metrics.familyDemandGrowth)}% through 2036. `;
  }

  console.log('[DEBUG] generateDataSummary - Final summary:', summary);
  return summary || 'Limited data available for comprehensive analysis.';
}

/**
 * Get tone guidance based on user intent
 */
function getToneGuidance(intent: string | null): string {
  const toneMap: Record<string, string> = {
    'invest': 'Professional, numbers-focused, ROI-driven. Emphasize capital growth potential, yields, and market fundamentals.',
    'live': 'Warm, lifestyle-focused, family-oriented. Highlight community feel, amenities, schools, and quality of life.',
    'rent': 'Practical, affordability-conscious, tenant-focused. Emphasize rental costs, availability, and value for money.',
    'unsure': 'Helpful, exploratory, educational. Present balanced overview covering investment, lifestyle, and rental perspectives.'
  };
  
  return toneMap[intent || 'unsure'] || toneMap['unsure'];
}

/**
 * Format metrics for AI consumption
 */
function formatMetricsForAI(metrics: CalculatedMetrics): string {
  const items = [];
  
  // CHANGE 5: Updated to show separate house and unit prices instead of averaged price
  if (metrics.housePrice) items.push(`House Price: $${metrics.housePrice.toLocaleString()}`);
  if (metrics.unitPrice) items.push(`Unit Price: $${metrics.unitPrice.toLocaleString()}`);
  if (metrics.priceGrowth !== null) items.push(`Price Growth: ${metrics.priceGrowth}%/year`);
  if (metrics.averageRent) items.push(`Avg Rent: $${metrics.averageRent}/week`);
  if (metrics.rentalYield) items.push(`Rental Yield: ${metrics.rentalYield}%`);
  if (metrics.totalCrime) items.push(`Total Crime: ${metrics.totalCrime} offences`);
  if (metrics.crimeGrowth !== null) items.push(`Crime Trend: ${metrics.crimeGrowth}%`);
  if (metrics.populationGrowth !== null) items.push(`Population Growth: ${metrics.populationGrowth}%`);
  if (metrics.medianAge) items.push(`Median Age: ${metrics.medianAge}`);
  if (metrics.medianIncome) items.push(`Median Income: ${metrics.medianIncome.toLocaleString()}`);
  if (metrics.householdGrowthRate) items.push(`Household Growth: ${metrics.householdGrowthRate}%/year`);
  if (metrics.totalHouseholdGrowth) items.push(`Total Growth (2021-2036): ${metrics.totalHouseholdGrowth}%`);
  if (metrics.familyDemandGrowth) items.push(`Family Demand Growth: ${metrics.familyDemandGrowth}%`);
  
  return items.join(' | ') || 'No calculated metrics available';
}

/**
 * Format raw data for AI analysis
 */
function formatDataForAI(data: DataSets): string {
  const sections: string[] = [];
  
  Object.entries(data).forEach(([key, values]) => {
    if (values && values.length > 0) {
      sections.push(`${key}: ${values.length} records`);
    }
  });
  
  return sections.join(', ') || 'No datasets available';
}