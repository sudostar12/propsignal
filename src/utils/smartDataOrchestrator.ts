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

// Define proper types
interface FetchedData {
  data: Record<string, unknown>;
  metadata: {
    fetchTimeMs: number;
    dataSourcesUsed: string[];
    targetAreas: string[];
    analysisType: string;
  };
}

interface SuburbRow {
  suburb: string;
}

interface RentalRecord {
  medianRent: number;
  propertyType: string;
  bedroom: string;
  year: number;
}

interface CrimeRecord {
  offenceCount: number;
  year: number;
}

interface PriceRecord {
  medianPrice: number;
  year: number;
}

interface YieldData {
  avgRent: number;
  latestPrice: number;
  yield_pct: number;
}

interface CrimeData {
  totalCrime: number;
}

interface SuburbAnalysis {
  suburb: string;
  score: number;
  yieldData: YieldData | null;
  crimeData: CrimeData | null;
}

// Export the new function
export { findTopSuburbsByCriteria };

// Dynamic data fetcher based on smart requirements
export async function fetchSmartRequiredData(analysis: SmartAnalyzedQuestion): Promise<FetchedData> {
  console.log('Fetching data based on analysis:', analysis);
  
  const fetchedData: Record<string, unknown> = {};
  const startTime = Date.now();
  
  // Fetch data for each requirement in parallel for better performance
  const fetchPromises = analysis.dataRequirements.map(async (dataType) => {
    console.log(`Fetching ${dataType}...`);
    
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
          console.log(`Unknown data type: ${dataType}`);
          data = { error: `Unknown data type: ${dataType}` };
      }
      
      return { dataType, data };
      
    } catch (error) {
      console.error(`Error fetching ${dataType}:`, error);
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
  console.log(`Data fetching completed in ${fetchTime}ms. Retrieved:`, Object.keys(fetchedData));
  
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
  fetchResult: FetchedData
): Promise<string> {
  console.log('Generating smart response...');
  
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

Provide a ${analysis.responseType} response that includes specific, actionable recommendations with data-backed insights.

CRITICAL REQUIREMENTS:
- Be brutally honest about market realities
- Use specific numbers from the data provided
- If data is missing, acknowledge this and explain the limitation
- Focus on Australian property market dynamics
- Consider current market conditions (interest rates, affordability, etc.)

Structure your response clearly with headings if it's a complex analysis.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: responsePrompt }],
      //temperature: 0.3,
    });

    const smartResponse = response.choices[0].message.content || 'Unable to generate response';
    console.log('Response generated');
    return smartResponse;

  } catch (error) {
    console.error('Error generating smart response:', error);
    return 'I apologize, but I encountered an error analyzing your property question. Please try rephrasing your question or contact support if this persists.';
  }
}

// ============ DATA FETCHER FUNCTIONS USING YOUR EXISTING LOGIC ============

async function fetchMedianPricesData(suburbs: string[], years?: number) {
  console.log('Fetching median prices for:', suburbs, 'years:', years);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        const currentYear = new Date().getFullYear();
        const minYear = years ? currentYear - years : currentYear - 1;
        const maxYear = currentYear;
        
        console.log(`Fetching median prices for ${suburb} from ${minYear} to ${maxYear}`);
        
        const priceData = await fetchMedianPrice(suburb, minYear, maxYear);
        const unifiedData = null;
        console.log(`Using standard price data for ${suburb} (unified metrics skipped)`);
        
        return {
          suburb,
          priceHistory: priceData,
          latestMetrics: unifiedData,
          yearsRequested: years || 1,
          dataPoints: priceData.length
        };
      })
    );
    
    console.log('Median prices fetched for all suburbs');
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
    console.error('Error fetching median prices:', error);
    return { success: false, error: 'Failed to fetch median price data', suburbs };
  }
}

async function fetchPriceGrowthData(suburbs: string[], years?: number) {
  console.log('Fetching price growth for:', suburbs, 'years:', years);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        const currentYear = new Date().getFullYear();
        const startYear = years ? currentYear - years : currentYear - 5;
        
        const priceData = await fetchMedianPrice(suburb, startYear, currentYear);
        const growthAnalysis = calculatePriceGrowth(priceData);
        
        return {
          suburb,
          priceHistory: priceData,
          growthAnalysis,
          yearsAnalyzed: years || 5
        };
      })
    );
    
    console.log('Price growth analysis completed');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('Error fetching price growth:', error);
    return { success: false, error: 'Failed to fetch price growth data', suburbs };
  }
}

async function fetchRentalYieldsData(suburbs: string[]) {
  console.log('Fetching rental yields for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        const priceData = await fetchMedianPrice(suburb);
        
        const latestPrice = (priceData && Array.isArray(priceData) && priceData.length > 0) 
          ? priceData[priceData.length - 1] 
          : null;
        
        const rentalData = await fetchRentals(suburb);
        
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
    
    console.log('Rental yields calculated');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('Error fetching rental yields:', error);
    return { success: false, error: 'Failed to fetch rental yield data', suburbs };
  }
}

async function fetchCrimeData(suburbs: string[]) {
  console.log('Fetching crime data for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        const crimeData = await fetchCrime(suburb);
        
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
    
    console.log('Crime data fetched and analyzed');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('Error fetching crime data:', error);
    return { success: false, error: 'Failed to fetch crime data', suburbs };
  }
}

async function fetchNewProjectsData(suburbs: string[]) {
  console.log('Fetching new projects for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
        const projectData = await fetchProjects(suburb);
        
        return {
          suburb,
          projects: projectData.data,
          projectCount: projectData.data?.length || 0
        };
      })
    );
    
    console.log('New projects data fetched');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('Error fetching new projects:', error);
    return { success: false, error: 'Failed to fetch new projects data', suburbs };
  }
}

async function fetchDemographicsData(suburbs: string[]) {
  console.log('Fetching demographics for:', suburbs);
  
  try {
    const results = await Promise.all(
      suburbs.map(async (suburb) => {
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
    
    console.log('Demographics data fetched');
    return { success: true, suburbs, data: results };
    
  } catch (error) {
    console.error('Error fetching demographics:', error);
    return { success: false, error: 'Failed to fetch demographics data', suburbs };
  }
}

// Placeholder functions for data types not yet implemented in your system
async function fetchTransportData(suburbs: string[]) {
  console.log('Transport data not yet implemented');
  return { success: false, message: 'Transport scoring not yet available', suburbs };
}

async function fetchSchoolData(suburbs: string[]) {
  console.log('School data not yet implemented');
  return { success: false, message: 'School ratings not yet available', suburbs };
}

async function fetchMarketActivityData(suburbs: string[]) {
  console.log('Market activity data not yet implemented');
  return { success: false, message: 'Market activity data not yet available', suburbs };
}

async function fetchInfrastructureData(suburbs: string[]) {
  console.log('Infrastructure data not yet implemented');
  return { success: false, message: 'Infrastructure data not yet available', suburbs };
}

async function fetchComparableSalesData(suburbs: string[]) {
  console.log('Comparable sales data not yet implemented');
  return { success: false, message: 'Comparable sales data not yet available', suburbs };
}

async function fetchZoningChangesData(suburbs: string[]) {
  console.log('Zoning changes data not yet implemented');
  return { success: false, message: 'Zoning changes data not yet available', suburbs };
}

// ============ DATA-DRIVEN SUBURB SEARCH FUNCTION ============

async function getSmartSuburbPool(): Promise<string[]> {
  console.log('Getting intelligent suburb pool based on criteria');
  
  try {
    const { data: suburbsWithData, error } = await supabase
      .from('median_price')
      .select('suburb')
      .not('suburb', 'is', null)
      .not('suburb', 'in', '("Melbourne","Sydney","Brisbane","Adelaide","Perth")')
      .limit(20);
    
    if (error || !suburbsWithData) {
      console.log('Database query failed, using fallback suburbs');
      return ['Bendigo', 'Ballarat', 'Warrnambool', 'Traralgon', 'Geelong', 'Frankston', 'Werribee'];
    }
    
    const dataSuburbs = suburbsWithData.slice(0, 12).map((s: SuburbRow) => s.suburb);
    const goodPerformers = ['Bendigo', 'Ballarat', 'Warrnambool'];
    
    const combinedSuburbs = Array.from(new Set([...dataSuburbs, ...goodPerformers])).slice(0, 15);
    console.log(`Selected ${combinedSuburbs.length} data-driven suburbs:`, combinedSuburbs);
    
    return combinedSuburbs;
  } catch (error) {
    console.error('Error getting smart suburb pool:', error);
    return ['Bendigo', 'Ballarat', 'Warrnambool', 'Traralgon', 'Geelong'];
  }
}

async function findTopSuburbsByCriteria(): Promise<{
  suburbs: string[];
  success: boolean;
  fallback: boolean;
}> {
  console.log('Finding top suburbs - simplified approach');
  
  const mvpSuburbs: string[] = await getSmartSuburbPool();
  
  console.log(`Analyzing ${mvpSuburbs.length} curated suburbs`);
  
  try {
    const suburbPromises = mvpSuburbs.map(async (suburb: string) => {
      let score = 0;
      let yieldData: YieldData | null = null;
      let crimeData: CrimeData | null = null;
      
      try {
        const timeoutPromise = new Promise<SuburbAnalysis>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        );
        
        const analysisPromise = (async (): Promise<SuburbAnalysis> => {
          const promises = [
            fetchRentals(suburb),
            fetchCrime(suburb),
            fetchMedianPrice(suburb)
          ];
          
          const [rentalResult, crimeResult, priceResult] = await Promise.all(promises);
          
          // Type-safe checks for rental data
          if (rentalResult && 'data' in rentalResult && rentalResult.data && 
              Array.isArray(rentalResult.data) && rentalResult.data.length > 0 && 
              Array.isArray(priceResult) && priceResult.length > 0) {
            
            const validRentals = rentalResult.data.filter((r: RentalRecord) => 
              r && typeof r.medianRent === 'number' && r.medianRent > 0
            );
            
            if (validRentals.length > 0) {
              const avgRent = validRentals.reduce((sum: number, r: RentalRecord) => 
                sum + r.medianRent, 0
              ) / validRentals.length;
              
              const latestPrice = (priceResult[priceResult.length - 1] as PriceRecord)?.medianPrice;
              
              if (avgRent > 0 && latestPrice > 0) {
                const yield_pct = (avgRent * 52 / latestPrice) * 100;
                yieldData = { avgRent, latestPrice, yield_pct };
                
                if (yield_pct > 5) score += 40;
                else if (yield_pct > 4) score += 30;
                else if (yield_pct > 3) score += 20;
              }
            }
          }
          
          // Type-safe checks for crime data
          if (crimeResult && 'suburbData' in crimeResult && crimeResult.suburbData && 
              Array.isArray(crimeResult.suburbData) && crimeResult.suburbData.length > 0) {
            
            const totalCrime = crimeResult.suburbData.reduce((sum: number, c: CrimeRecord) => 
              sum + (c?.offenceCount || 0), 0
            );
            crimeData = { totalCrime };
            
            if (totalCrime < 1000) score += 30;
            else if (totalCrime < 2000) score += 20;
            else if (totalCrime < 4000) score += 10;
          }
          
          return { suburb, score, yieldData, crimeData };
        })();
        
        return await Promise.race([analysisPromise, timeoutPromise]);
        
      } catch {
  console.log(`${suburb} timed out or failed, skipping`);
  return { suburb, score: 0, yieldData: null, crimeData: null };
}
    });
    
    const results = await Promise.all(suburbPromises);
    
    const topSuburbs = results
      .filter((r: SuburbAnalysis) => r.score > 20)
      .sort((a: SuburbAnalysis, b: SuburbAnalysis) => b.score - a.score)
      .slice(0, 4)
      .map((r: SuburbAnalysis) => {
        const yieldStr = r.yieldData ? `${r.yieldData.yield_pct.toFixed(1)}%` : 'N/A';
        const crimeStr = r.crimeData ? r.crimeData.totalCrime.toString() : 'N/A';
        console.log(`${r.suburb}: ${r.score} points (yield: ${yieldStr}, crime: ${crimeStr})`);
        return r.suburb;
      });
    
    return {
      suburbs: topSuburbs.length > 0 ? topSuburbs : ['Box Hill', 'Doncaster', 'Frankston'],
      success: topSuburbs.length > 0,
      fallback: topSuburbs.length === 0
    };
    
  } catch (error) {
    console.error('Error in simplified search:', error);
    return {
      suburbs: ['Box Hill', 'Doncaster', 'Frankston'],
      success: false,
      fallback: true
    };
  }
}

// ============ HELPER ANALYSIS FUNCTIONS ============

function calculatePriceGrowth(priceData: PriceRecord[]) {
  if (!priceData || priceData.length < 2) {
    return { error: 'Insufficient data for growth calculation' };
  }
  
  try {
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
    console.error('Error calculating price growth:', error);
    return { error: 'Failed to calculate price growth' };
  }
}

function calculateRentalYield(priceRecord: PriceRecord | null, rentalData: RentalRecord[]) {
  if (!priceRecord?.medianPrice || !rentalData || rentalData.length === 0) {
    return { error: 'Insufficient data for yield calculation' };
  }
  
  try {
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
    console.error('Error calculating rental yield:', error);
    return { error: 'Failed to calculate rental yield' };
  }
}

function analyzeCrimeData(crimeData: CrimeRecord[]) {
  if (!crimeData || crimeData.length === 0) {
    return { error: 'No crime data available' };
  }
  
  try {
    const sortedData = crimeData.sort((a, b) => (a.year || 0) - (b.year || 0));
    
    const totalOffences = sortedData.reduce((sum, record) => sum + (record.offenceCount || 0), 0);
    const averagePerYear = totalOffences / sortedData.length;
    
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
    console.error('Error analyzing crime data:', error);
    return { error: 'Failed to analyze crime data' };
  }
}