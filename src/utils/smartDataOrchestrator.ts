// src/utils/smartDataOrchestrator.ts

import { SmartAnalyzedQuestion } from './smartQuestionAnalyzer';
import OpenAI from 'openai';

// Import your existing data fetching functions
import { 
  fetchMedianPrice, 
  fetchDemographics, 
  fetchPopulation, 
  fetchRentals, 
  fetchProjects, 
  fetchCrime, 
  fetchHouseholdForecast
} from './fetchSuburbData';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
// Export the new function
export { findTopSuburbsByCriteria };


// Dynamic data fetcher based on smart requirements
export async function fetchSmartRequiredData(analysis: SmartAnalyzedQuestion) {
  console.log('📡 [SMART] Fetching data based on analysis:', analysis);
  
  const fetchedData: Record<string, any> = {};
  const startTime = Date.now();
  
  // Fetch data for each requirement in parallel for better performance
  const fetchPromises = analysis.dataRequirements.map(async (dataType) => {
    console.log(`🔄 [SMART] Fetching ${dataType}...`);
    
    try {
      let data;
      
      switch (dataType) {
        case 'median_prices':
          data = await fetchMedianPricesData(analysis.targetAreas, analysis.years);
          break;
        case 'price_growth':
          data = await fetchPriceGrowthData(analysis.targetAreas, analysis.years);
          break;
        case 'rental_yields':
          data = await fetchRentalYieldsData(analysis.targetAreas);
          break;
        case 'crime_data':
          data = await fetchCrimeData(analysis.targetAreas);
          break;
        case 'new_projects':
          data = await fetchNewProjectsData(analysis.targetAreas);
          break;
        case 'demographics':
          data = await fetchDemographicsData(analysis.targetAreas);
          break;
        case 'transport_scores':
          data = await fetchTransportData(analysis.targetAreas);
          break;
        case 'school_ratings':
          data = await fetchSchoolData(analysis.targetAreas);
          break;
        case 'market_activity':
          data = await fetchMarketActivityData(analysis.targetAreas);
          break;
        case 'infrastructure':
          data = await fetchInfrastructureData(analysis.targetAreas);
          break;
        case 'comparable_sales':
          data = await fetchComparableSalesData(analysis.targetAreas);
          break;
        case 'zoning_changes':
          data = await fetchZoningChangesData(analysis.targetAreas);
          break;
        default:
          console.log(`⚠️ [SMART] Unknown data type: ${dataType}`);
          data = { error: `Unknown data type: ${dataType}` };
      }
      
      return { dataType, data };
      
    } catch (error) {
      console.error(`❌ [SMART] Error fetching ${dataType}:`, error);
      return { dataType, data: { error: `Failed to fetch ${dataType} data: ${error}` } };
    }
  });
  
  // Wait for all data fetching to complete
  const results = await Promise.all(fetchPromises);
  
  // Organize results into the fetchedData object
  results.forEach(({ dataType, data }) => {
    fetchedData[dataType] = data;
  });
  
  const fetchTime = Date.now() - startTime;
  console.log(`✅ [SMART] Data fetching completed in ${fetchTime}ms. Retrieved:`, Object.keys(fetchedData));
  
  return {
    data: fetchedData,
    metadata: {
      fetchTimeMs: fetchTime,
      dataSourcesUsed: Object.keys(fetchedData),
      targetAreas: analysis.targetAreas,
      analysisType: analysis.analysisComplexity
    }
  };
}

// Generate intelligent response based on all fetched data
export async function generateSmartResponse(
  originalQuestion: string,
  analysis: SmartAnalyzedQuestion,
  fetchResult: any
): Promise<string> {
  console.log('🧠 [SMART] Generating smart response...');
  
  const responsePrompt = `
You are an expert Australian property advisor with 20+ years experience. You provide brutally honest, data-driven advice.

USER QUESTION: "${originalQuestion}"

ANALYSIS: ${JSON.stringify(analysis, null, 2)}

AVAILABLE DATA: ${JSON.stringify(fetchResult.data, null, 2)}

INSTRUCTIONS:
- Response type: ${analysis.responseType}
- Analysis complexity: ${analysis.analysisComplexity}
- Contextual factors: ${analysis.contextualFactors.join(', ')}
- AI confidence in analysis: ${analysis.confidence}%

Provide a ${analysis.responseType} response that:

For SEARCH queries like "find suburbs with X", "show me suburbs with Y", "suburbs that have Z":
- targetAreas: []
- analysisType: "search"
- Include relevant criteria in contextualFactors

${analysis.responseType === 'factual' ? `
- States the key facts and numbers clearly
- Answers the question directly with data
- Keeps explanations brief and to the point
- Lists specific figures where available
` : analysis.responseType === 'analytical' ? `
- Presents the data with clear interpretation
- Explains trends, patterns, and what they mean
- Provides context about market dynamics
- Compares suburbs if multiple areas involved
- Highlights significant insights from the data
` : `
- Gives comprehensive analysis with data-backed insights
- Provides specific, actionable recommendations
- Highlights opportunities and risks clearly
- Suggests concrete next steps
- Considers the contextual factors: ${analysis.contextualFactors.join(', ')}
- Addresses different scenarios or buyer types
`}

${analysis.compare ? `
This is a COMPARISON analysis. Structure your response to clearly compare the suburbs across the relevant metrics.
Create a clear comparison table or structured comparison.
` : ''}

${analysis.analysisType === 'search' ? `
This is a SEARCH query. The user wants to FIND suburbs that match their criteria.

CRITICAL: Focus on RECOMMENDING the TOP suburbs that meet their criteria. 
- Rank suburbs by how well they match the criteria
- Highlight the BEST options with specific numbers
- Don't waste time analyzing suburbs that don't meet the criteria
- Provide actionable recommendations for the top performers
- Structure as: "Top 3 Suburbs for [criteria]" with specific data for each
` : ''}

CRITICAL REQUIREMENTS:
- Be brutally honest about market realities
- Use specific numbers from the data provided
- If data is missing, acknowledge this and explain the limitation
- Focus on Australian property market dynamics
- Consider current market conditions (interest rates, affordability, etc.)

${analysis.confidence < 60 ? `
NOTE: The AI confidence in understanding this question is only ${analysis.confidence}%. 
If the question seems unclear, ask for clarification while still providing the best analysis possible with available data.
` : ''}

Structure your response clearly with headings if it's a complex analysis.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: responsePrompt }],
      temperature: 0.3,
    });

    const smartResponse = response.choices[0].message.content || 'Unable to generate response';
    console.log('✅ [SMART] Response generated');
    return smartResponse;

  } catch (error) {
    console.error('❌ [SMART] Error generating smart response:', error);
    return 'I apologize, but I encountered an error analyzing your property question. Please try rephrasing your question or contact support if this persists.';
  }
}

// ============ DATA FETCHER FUNCTIONS USING YOUR EXISTING LOGIC ============

async function fetchMedianPricesData(suburbs: string[], years?: number) {
  console.log('📊 [SMART] Fetching median prices for:', suburbs, 'years:', years);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        // Determine year range based on analysis
        const currentYear = new Date().getFullYear();
        const minYear = years ? currentYear - years : currentYear - 1;
        const maxYear = currentYear;
        
        console.log(`🏠 [SMART] Fetching median prices for ${suburb} from ${minYear} to ${maxYear}`);
        
        // Use your existing fetchMedianPrice function
        const priceData = await fetchMedianPrice(suburb, minYear, maxYear);
        // Skip unified metrics for now in smart system
let unifiedData = null;
console.log(`📊 [SMART] Using standard price data for ${suburb} (unified metrics skipped)`);
        return {
          suburb,
          priceHistory: priceData,
          latestMetrics: unifiedData,
          yearsRequested: years || 1,
          dataPoints: priceData.length
        };
      })
    );
    
    console.log('✅ [SMART] Median prices fetched for all suburbs');
    return { 
      success: true, 
      suburbs, 
      data: results,
      summary: {
        totalDataPoints: results.reduce((sum, r) => sum + r.dataPoints, 0),
        yearsAnalyzed: years || 1
      }
    };
    
  } catch (error) {
    console.error('❌ [SMART] Error fetching median prices:', error);
    return { success: false, error: 'Failed to fetch median price data', suburbs };
  }
}

async function fetchPriceGrowthData(suburbs: string[], years?: number) {
  console.log('📈 [SMART] Fetching price growth for:', suburbs, 'years:', years);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        // Get historical price data using your existing function
        const currentYear = new Date().getFullYear();
        const startYear = years ? currentYear - years : currentYear - 5; // Default 5 years
        
        const priceData = await fetchMedianPrice(suburb, startYear, currentYear);
        
        // Calculate growth rates
        const growthAnalysis = calculatePriceGrowth(priceData);
        
        return {
          suburb,
          priceHistory: priceData,
          growthAnalysis,
          yearsAnalyzed: years || 5
        };
      })
    );
    
    console.log('✅ [SMART] Price growth analysis completed');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('❌ [SMART] Error fetching price growth:', error);
    return { success: false, error: 'Failed to fetch price growth data', suburbs };
  }
}

async function fetchRentalYieldsData(suburbs: string[]) {
  console.log('🏠 [SMART] Fetching rental yields for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        // Get median prices for yield calculation with null safety
        const priceData = await fetchMedianPrice(suburb);
        
        // Check if priceData is valid and has elements
        const latestPrice = (priceData && Array.isArray(priceData) && priceData.length > 0) 
          ? priceData[priceData.length - 1] 
          : null;
        
        // Get rental data using your existing function
        // Note: fetchRentals expects LGA, so we'll use suburb as approximation
        const rentalData = await fetchRentals(suburb);
        
        // Calculate yield if we have both price and rental data
        const yieldCalculation = calculateRentalYield(
          latestPrice, 
          rentalData?.data || []
        );
        
        return {
          suburb,
          currentMedianPrice: latestPrice,
          rentalData: rentalData?.data || [],
          calculatedYield: yieldCalculation,
          hasValidPriceData: !!latestPrice,
          hasValidRentalData: !!(rentalData?.data && rentalData.data.length > 0)
        };
      })
    );
    
    console.log('✅ [SMART] Rental yields calculated');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('❌ [SMART] Error fetching rental yields:', error);
    return { success: false, error: 'Failed to fetch rental yield data', suburbs };
  }
}

async function fetchCrimeData(suburbs: string[]) {
  console.log('🚔 [SMART] Fetching crime data for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        // Use your existing fetchCrime function
        const crimeData = await fetchCrime(suburb);
        
        // Add null check before analyzing crime data
        const crimeAnalysis = crimeData.suburbData && Array.isArray(crimeData.suburbData) 
          ? analyzeCrimeData(crimeData.suburbData)
          : { error: 'No crime data available for this suburb' };
        
        return {
          suburb,
          rawCrimeData: crimeData.suburbData || [],
          crimeAnalysis,
          dataAvailable: !!(crimeData.suburbData && crimeData.suburbData.length > 0)
        };
      })
    );
    
    console.log('✅ [SMART] Crime data fetched and analyzed');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('❌ [SMART] Error fetching crime data:', error);
    return { success: false, error: 'Failed to fetch crime data', suburbs };
  }
}

async function fetchNewProjectsData(suburbs: string[]) {
  console.log('🏗️ [SMART] Fetching new projects for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        // Use your existing fetchProjects function
        const projectData = await fetchProjects(suburb);
        
        return {
          suburb,
          projects: projectData.data,
          projectCount: projectData.data?.length || 0
        };
      })
    );
    
    console.log('✅ [SMART] New projects data fetched');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('❌ [SMART] Error fetching new projects:', error);
    return { success: false, error: 'Failed to fetch new projects data', suburbs };
  }
}

async function fetchDemographicsData(suburbs: string[]) {
  console.log('👥 [SMART] Fetching demographics for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        // Use your existing fetchDemographics and fetchPopulation functions
        const demographicsData = await fetchDemographics(suburb);
        const populationData = await fetchPopulation(suburb);
        const householdForecast = await fetchHouseholdForecast(suburb);
        
        return {
          suburb,
          demographics: demographicsData.data,
          population: populationData.data,
          householdForecast: householdForecast.data
        };
      })
    );
    
    console.log('✅ [SMART] Demographics data fetched');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('❌ [SMART] Error fetching demographics:', error);
    return { success: false, error: 'Failed to fetch demographics data', suburbs };
  }
}

// Placeholder functions for data types not yet implemented in your system
async function fetchTransportData(suburbs: string[]) {
  console.log('🚊 [SMART] Transport data not yet implemented');
  return { success: false, message: 'Transport scoring not yet available', suburbs };
}

async function fetchSchoolData(suburbs: string[]) {
  console.log('🏫 [SMART] School data not yet implemented');
  return { success: false, message: 'School ratings not yet available', suburbs };
}

async function fetchMarketActivityData(suburbs: string[]) {
  console.log('📊 [SMART] Market activity data not yet implemented');
  return { success: false, message: 'Market activity data not yet available', suburbs };
}

async function fetchInfrastructureData(suburbs: string[]) {
  console.log('🏗️ [SMART] Infrastructure data not yet implemented');
  return { success: false, message: 'Infrastructure data not yet available', suburbs };
}

async function fetchComparableSalesData(suburbs: string[]) {
  console.log('🏡 [SMART] Comparable sales data not yet implemented');
  return { success: false, message: 'Comparable sales data not yet available', suburbs };
}

async function fetchZoningChangesData(suburbs: string[]) {
  console.log('🗺️ [SMART] Zoning changes data not yet implemented');
  return { success: false, message: 'Zoning changes data not yet available', suburbs };
}

// ============ DATA-DRIVEN SUBURB SEARCH FUNCTION ============

// Add this NEW function before findTopSuburbsByCriteria
async function getSmartSuburbPool(criteria: string[]): Promise<string[]> {
  console.log('🎯 [SMART] Getting intelligent suburb pool based on criteria');
  
  try {
    
    // Get Victorian suburbs only, exclude major cities with high crime
const { data: suburbsWithData, error } = await supabase
  .from('median_price')
  .select('suburb')
  .not('suburb', 'is', null)
  .not('suburb', 'in', '("Melbourne","Sydney","Brisbane","Adelaide","Perth")') // Exclude major cities as they have high crime rates
  .limit(20); // Reduced for speed
    
    if (error || !suburbsWithData) {
      console.log('⚠️ [SMART] Database query failed, using fallback suburbs');
      // Fallback to curated list only if database fails
      return ['Bendigo', 'Ballarat', 'Warrnambool', 'Traralgon', 'Geelong', 'Frankston', 'Werribee'];
    }
    
    // Mix of recent data suburbs + known good performers
    const dataSuburbs = suburbsWithData.slice(0, 12).map((s: any) => s.suburb);
    const goodPerformers = ['Bendigo', 'Ballarat', 'Warrnambool'];
    
    // Combine and deduplicate
    const combinedSuburbs = Array.from(new Set([...dataSuburbs, ...goodPerformers])).slice(0, 15);
    console.log(`📊 [SMART] Selected ${combinedSuburbs.length} data-driven suburbs:`, combinedSuburbs);
    
    return combinedSuburbs;
  } catch (error) {
    console.error('❌ [SMART] Error getting smart suburb pool:', error);
    return ['Bendigo', 'Ballarat', 'Warrnambool', 'Traralgon', 'Geelong'];
  }
}

async function findTopSuburbsByCriteria(criteria: string[], contextualFactors: string[]): Promise<{
  suburbs: string[];
  success: boolean;
  fallback: boolean;
}> {
  console.log('🔍 [SMART-MVP] Finding top suburbs - simplified approach');
  
  
  // Dynamic suburb selection based on available data
const mvpSuburbs: string[] = await getSmartSuburbPool(criteria);
  
  console.log(`📊 [SMART-MVP] Analyzing ${mvpSuburbs.length} curated suburbs`);
  
  try {
    // Quick parallel analysis with timeouts
const suburbPromises = mvpSuburbs.map(async (suburb: string) => {
  let score: number = 0;
  let yieldData: { avgRent: number; latestPrice: number; yield_pct: number } | null = null;
  let crimeData: { totalCrime: number } | null = null;
  
  try {
    // Set timeout for each suburb (2 seconds max)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 2000)
    );
    
    const analysisPromise = (async () => {
      // Fast parallel fetch
      const promises: [Promise<any>, Promise<any>, Promise<any>] = [
        criteria.includes('rental_yields') ? fetchRentals(suburb) : Promise.resolve(null),
        criteria.includes('crime_data') ? fetchCrime(suburb) : Promise.resolve(null),
        criteria.includes('rental_yields') ? fetchMedianPrice(suburb) : Promise.resolve(null)
      ];
      
      const [rentalResult, crimeResult, priceResult] = await Promise.all(promises);
      
      // Quick yield calculation
      if (rentalResult?.data && Array.isArray(rentalResult.data) && rentalResult.data.length > 0 && 
          priceResult && Array.isArray(priceResult) && priceResult.length > 0) {
        
        const validRentals = rentalResult.data.filter((r: any) => r && typeof r.medianRent === 'number' && r.medianRent > 0);
        if (validRentals.length > 0) {
          const avgRent: number = validRentals.reduce((sum: number, r: any) => sum + r.medianRent, 0) / validRentals.length;
          const latestPrice: number = priceResult[priceResult.length - 1]?.medianPrice;
          
          if (avgRent > 0 && latestPrice > 0) {
            const yield_pct: number = (avgRent * 52 / latestPrice) * 100;
            yieldData = { avgRent, latestPrice, yield_pct };
            
            if (yield_pct > 5) score += 40;
            else if (yield_pct > 4) score += 30;
            else if (yield_pct > 3) score += 20;
          }
        }
      }
      
      // Quick crime check - FIXED THRESHOLDS
      if (crimeResult?.suburbData && Array.isArray(crimeResult.suburbData) && crimeResult.suburbData.length > 0) {
        const totalCrime: number = crimeResult.suburbData.reduce((sum: number, c: any) => sum + (c?.offenceCount || 0), 0);
        crimeData = { totalCrime };
        
        // Much stricter crime thresholds for "low crime"
        if (totalCrime < 1000) score += 30;      // Actually low crime
        else if (totalCrime < 2000) score += 20; // Moderate crime  
        else if (totalCrime < 4000) score += 10; // Higher crime
        // No points for very high crime (>4000)
      }
      
      return { suburb, score, yieldData, crimeData };
    })();
    
    return await Promise.race([analysisPromise, timeoutPromise]);
    
  } catch (error) {
    console.log(`⚠️ [SMART-MVP] ${suburb} timed out or failed, skipping`);
    return { suburb, score: 0, yieldData: null, crimeData: null };
  }
});
    
    // Wait for all analysis
    const results = await Promise.all(suburbPromises);
    
    // Get top performers
    const topSuburbs: string[] = results
      .filter((r: any) => r.score > 20) // Must meet minimum criteria
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 4) // Top 4 only
      .map((r: any) => {
        const yieldStr: string = r.yieldData ? `${r.yieldData.yield_pct.toFixed(1)}%` : 'N/A';
        const crimeStr: string = r.crimeData ? r.crimeData.totalCrime.toString() : 'N/A';
        console.log(`🏆 [SMART-MVP] ${r.suburb}: ${r.score} points (yield: ${yieldStr}, crime: ${crimeStr})`);
        return r.suburb;
      });
    
    return {
      suburbs: topSuburbs.length > 0 ? topSuburbs : ['Box Hill', 'Doncaster', 'Frankston'],
      success: topSuburbs.length > 0,
      fallback: topSuburbs.length === 0
    };
    
  } catch (error) {
    console.error('❌ [SMART-MVP] Error in simplified search:', error);
    return {
      suburbs: ['Box Hill', 'Doncaster', 'Frankston'],
      success: false,
      fallback: true
    };
  }
}

// ============ HELPER ANALYSIS FUNCTIONS ============

function calculatePriceGrowth(priceData: any[]) {
  if (!priceData || priceData.length < 2) {
    return { error: 'Insufficient data for growth calculation' };
  }
  
  try {
    // Sort by year to ensure proper chronological order
    const sortedData = priceData.sort((a, b) => (a.year || 0) - (b.year || 0));
    
    const earliest = sortedData[0];
    const latest = sortedData[sortedData.length - 1];
    
    if (!earliest.medianPrice || !latest.medianPrice) {
      return { error: 'Missing price data for growth calculation' };
    }
    
    const totalGrowth = ((latest.medianPrice - earliest.medianPrice) / earliest.medianPrice) * 100;
    const yearsSpan = (latest.year || 0) - (earliest.year || 0);
    const annualizedGrowth = yearsSpan > 0 ? Math.pow((latest.medianPrice / earliest.medianPrice), (1 / yearsSpan)) - 1 : 0;
    
    return {
      startPrice: earliest.medianPrice,
      endPrice: latest.medianPrice,
      startYear: earliest.year,
      endYear: latest.year,
      totalGrowthPercent: Math.round(totalGrowth * 100) / 100,
      annualizedGrowthPercent: Math.round(annualizedGrowth * 10000) / 100,
      yearsSpan
    };
  } catch (error) {
    console.error('❌ [SMART] Error calculating price growth:', error);
    return { error: 'Failed to calculate price growth' };
  }
}

function calculateRentalYield(priceRecord: any, rentalData: any[]) {
  if (!priceRecord?.medianPrice || !rentalData || rentalData.length === 0) {
    return { error: 'Insufficient data for yield calculation' };
  }
  
  try {
    // Get the most recent rental data
    const recentRentals = rentalData
      .filter(r => r.medianRent && r.medianRent > 0)
      .sort((a, b) => (b.year || 0) - (a.year || 0));
    
    if (recentRentals.length === 0) {
      return { error: 'No valid rental data found' };
    }
    
    const latestRental = recentRentals[0];
    const weeklyRent = latestRental.medianRent;
    const annualRent = weeklyRent * 52;
    const purchasePrice = priceRecord.medianPrice;
    
    const grossYield = (annualRent / purchasePrice) * 100;
    
    return {
      weeklyRent,
      annualRent,
      purchasePrice,
      grossYieldPercent: Math.round(grossYield * 100) / 100,
      propertyType: latestRental.propertyType,
      bedroom: latestRental.bedroom,
      dataYear: latestRental.year
    };
  } catch (error) {
    console.error('❌ [SMART] Error calculating rental yield:', error);
    return { error: 'Failed to calculate rental yield' };
  }
}

function analyzeCrimeData(crimeData: any[]) {
  if (!crimeData || crimeData.length === 0) {
    return { error: 'No crime data available' };
  }
  
  try {
    // Sort by year
    const sortedData = crimeData.sort((a, b) => (a.year || 0) - (b.year || 0));
    
    const totalOffences = sortedData.reduce((sum, record) => sum + (record.offenceCount || 0), 0);
    const averagePerYear = totalOffences / sortedData.length;
    
    // Calculate trend if we have multiple years
    let trend = 'stable';
    if (sortedData.length >= 2) {
      const recent = sortedData[sortedData.length - 1].offenceCount || 0;
      const previous = sortedData[sortedData.length - 2].offenceCount || 0;
      
      if (recent > previous * 1.1) {
        trend = 'increasing';
      } else if (recent < previous * 0.9) {
        trend = 'decreasing';
      }
    }
    
    return {
      totalOffences,
      averagePerYear: Math.round(averagePerYear),
      trend,
      yearsCovered: sortedData.length,
      dataRange: {
        start: sortedData[0].year,
        end: sortedData[sortedData.length - 1].year
      }
    };
  } catch (error) {
    console.error('❌ [SMART] Error analyzing crime data:', error);
    return { error: 'Failed to analyze crime data' };
  }
}