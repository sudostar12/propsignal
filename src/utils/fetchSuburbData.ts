//utils/fetchSuburbData.ts

import { supabase } from '@/lib/supabaseClient';
import type { PriceRecord } from "./answers/priceGrowthAnswer";

export async function fetchMedianPrice(suburb: string, minYear?: number, maxYear?: number): Promise<PriceRecord[]> {
 console.log("[DEBUG fetchSuburbData] fetchMedianPrice - Searching for suburb:", suburb);

  let query = supabase
    .from("median_price")
    .select("*")
    .eq("suburb", suburb);

  if (minYear && maxYear) {
    console.log("[DEBUG fetchSuburbData] fetchMedianPrice - Applying year range filter directly in query:", minYear, "to", maxYear);
    query = query.gte("year", minYear).lte("year", maxYear);
  }
      
     const { data, error } = await query;
    
    /* - TEMP commented - to test exact match functionality - delete if tested working - 08/07/2025

    // If no exact match, try case-insensitive with year filter
    if (!data || data.length === 0) {
      console.log('[DEBUG fetchSuburbData] fetchMedianPrice - Trying case-insensitive match...');
      const result = await supabase
        .from('median_price')
        .select('*')
        .ilike('suburb', suburb)
        .gte('year', startYear)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchMedianPrice - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    // If still no match, try partial match with year filter
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchMedianPrice - Trying partial match...');
      const result = await supabase
        .from('median_price')
        .select('*')
        .ilike('suburb', `%${suburb}%`)
        .gte('year', startYear)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchMedianPrice - Partial match results:', data?.length || 0, 'records');
    }
    */
   if (error || !data) {
  console.error('[ERROR] fetchMedianPrice - Database error:', error);
  return []; // Return empty array to match type
}

console.log('[DEBUG fetchSuburbData] fetchMedianPrice - Final results:', data.length, 'records found');
return data as PriceRecord[];
}

export async function fetchDemographics(suburb: string) {
  console.log('[DEBUG fetchSuburbData] fetchDemographics - Searching for suburb:', suburb);
  
  try {
    // Try exact match first
    let { data, error } = await supabase
      .from('sa2_demographics')
      .select('*')
      .eq('SA2Name', suburb);
    
    console.log('[DEBUG fetchSuburbData] fetchDemographics - Exact match results:', data?.length || 0, 'records');
    
    // If no exact match, try case-insensitive
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchDemographics - Trying case-insensitive match...');
      const result = await supabase
        .from('sa2_demographics')
        .select('*')
        .ilike('SA2Name', suburb);
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchDemographics - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    // If still no match, try partial match
    if (!data || data.length === 0) {
      console.log('[DEBUG fetchSuburbData] fetchDemographics - Trying partial match...');
      const result = await supabase
        .from('sa2_demographics')
        .select('*')
        .ilike('SA2Name', `%${suburb}%`);
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchDemographics - Partial match results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchDemographics - Database error:', error);
      return { data: null, error };
    }
    
    console.log('[DEBUG fetchSuburbData] fetchDemographics - Final results:', data?.length || 0, 'records found');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchDemographics - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchPopulation(suburb: string) {
  console.log('[DEBUG fetchSuburbData] fetchPopulation - Searching for suburb:', suburb);
  
  try {
    // Optimized query - get only unique year/totalPersons combinations
    let { data, error } = await supabase
      .from('sa2_population')
      .select('year, totalPersons, SA2Name, SA2Code')
      .eq('SA2Name', suburb)
      .not('totalPersons', 'is', null)
      .gte('year', 2021) // Only recent years for efficiency
      .order('year', { ascending: true });
    
    console.log('[DEBUG fetchSuburbData] fetchPopulation - Exact match results:', data?.length || 0, 'records');
    
    // If no exact match, try case-insensitive
    if (!data || data.length === 0) {
      console.log('[DEBUG fetchSuburbData] fetchPopulation - Trying case-insensitive match...');
      const result = await supabase
        .from('sa2_population')
        .select('year, totalPersons, SA2Name, SA2Code')
        .ilike('SA2Name', suburb)
        .not('totalPersons', 'is', null)
        .gte('year', 2021)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchPopulation - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchPopulation - Database error:', error);
      return { data: null, error };
    }
    
    // FIXED: Remove duplicates with proper typing instead of any[]
    interface PopulationRecord {
      year?: number;
      totalPersons?: number;
      SA2Name?: string;
      SA2Code?: string;
    }
    
    const uniqueData = data?.reduce((acc: PopulationRecord[], current: PopulationRecord) => {
      const existing = acc.find(item => 
        item.year === current.year && 
        item.SA2Name === current.SA2Name
      );
      if (!existing) {
        acc.push({
          year: current.year,
          totalPersons: current.totalPersons,
          SA2Name: current.SA2Name,
          SA2Code: current.SA2Code
        });
      }
      return acc;
    }, []) || [];
    
    console.log('[DEBUG fetchSuburbData] fetchPopulation - Final unique results:', uniqueData.length, 'records found');
    console.log('[DEBUG fetchSuburbData] fetchPopulation - Data:', uniqueData);

    return { data: uniqueData, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchPopulation - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchRentals(lga: string) {
  console.log('[DEBUG fetchSuburbData] fetchRentals - Searching for LGA:', lga);
  
  try {
    // OPTIMIZED: Only get last 5 years and specific bedroom configurations
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3; // Last 3 years
    
    console.log('[DEBUG fetchSuburbData] fetchRentals - Filtering for years:', startYear, 'to', currentYear);
    console.log('[DEBUG fetchSuburbData] fetchRentals - Target bedrooms: Houses (3BHK, 4BHK), Units (2BHK)');
    
    const { data, error } = await supabase
      .from('median_rentals')
      .select('*')
      .ilike('lga', `%${lga}%`)
      .gte('year', startYear) // Only last 3 years
      .or(
        // Houses: 3BHK and 4BHK only
        'and(propertyType.ilike.%house%,bedroom.in.("3BHK","4BHK")),' +
        // Units: 2BHK only  
        'and(propertyType.ilike.%unit%,bedroom.eq.2BHK)'
      )
      .order('year', { ascending: true });
    
    if (error) {
      console.error('[ERROR] fetchRentals - Database error:', error);
      return { data: null, error };
    }
    
    // Log the breakdown for debugging
    if (data && data.length > 0) {
      const houses = data.filter(r => r.propertyType?.toLowerCase().includes('house'));
      const units = data.filter(r => r.propertyType?.toLowerCase().includes('unit'));
      
      // FIXED: Get unique years with proper typing
      const years = Array.from(new Set(data.map((d: { year?: number }) => d.year).filter(Boolean))).sort();
      
      console.log('[DEBUG fetchSuburbData] fetchRentals - Results breakdown:');
      console.log('  - Houses (3BHK/4BHK):', houses.length, 'records');
      console.log('  - Units (2BHK):', units.length, 'records');
      console.log('  - Years covered:', years);
      console.log('  - Sample data:', data[0]);
    }
    
    console.log('[DEBUG fetchSuburbData] fetchRentals - Final results:', data?.length || 0, 'records found (last 5 years, targeted bedrooms)');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchRentals - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchProjects(lga: string) {
  console.log('[DEBUG fetchSuburbData] fetchProjects - Searching for LGA:', lga);
  
  try {
    const { data, error } = await supabase
      .from('lga_projects')
      .select('*')
      .ilike('lga', `%${lga}%`);
    
    if (error) {
      console.error('[ERROR] fetchProjects - Database error:', error);
      return { data: null, error };
    }
    
    console.log('[DEBUG fetchSuburbData] fetchProjects - Results:', data?.length || 0, 'records found');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchProjects - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchCrime(suburb: string) {
  console.log('[DEBUG fetchSuburbData] fetchCrime - Searching for suburb:', suburb);
  
  try {
    // OPTIMIZED: Only get recent years and specific columns
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4; // Last 5 years
    
    console.log('[DEBUG fetchSuburbData] fetchCrime - Filtering for years:', startYear, 'to', currentYear);
    
    let { data, error } = await supabase
      .from('crime_stats')
      .select('offenceCount, year, suburb') // Only needed columns
      .eq('suburb', suburb)
      .not('offenceCount', 'is', null) // Only records with crime data
      .gte('year', startYear) // Only recent years
      .order('year', { ascending: true });
    
    console.log('[DEBUG fetchSuburbData] fetchCrime - Exact match results:', data?.length || 0, 'records');
    
    // Try case-insensitive if no exact match
    if (!data || data.length === 0) {
      console.log('[DEBUG fetchSuburbData] fetchCrime - Trying case-insensitive match...');
      const result = await supabase
        .from('crime_stats')
        .select('offenceCount, year, suburb')
        .ilike('suburb', suburb)
        .not('offenceCount', 'is', null)
        .gte('year', startYear)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchCrime - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    // Try partial match if still no results
    if (!data || data.length === 0) {
      console.log('[DEBUG fetchSuburbData] fetchCrime - Trying partial match...');
      const result = await supabase
        .from('crime_stats')
        .select('offenceCount, year, suburb')
        .ilike('suburb', `%${suburb}%`)
        .not('offenceCount', 'is', null)
        .gte('year', startYear)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchCrime - Partial match results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchCrime - Database error:', error);
      return { data: null, error };
    }
    
    // Log sample data for debugging
    if (data && data.length > 0) {
      console.log('[DEBUG fetchSuburbData] fetchCrime - Sample record:', data[0]);
      // FIXED: Get unique years with proper typing
      const years = Array.from(new Set(data.map((d: { year?: number }) => d.year).filter(Boolean))).sort();
      console.log('[DEBUG fetchSuburbData] fetchCrime - Years available:', years);
      // FIXED: Reduce function with proper typing
      const totalOffences = data.reduce((sum: number, d: { offenceCount?: number }) => sum + (d.offenceCount || 0), 0);
      console.log('[DEBUG fetchSuburbData] fetchCrime - Total offences across all years:', totalOffences);
    }
    
    console.log('[DEBUG fetchSuburbData] fetchCrime - Final results:', data?.length || 0, 'records found (last 5 years)');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchCrime - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchHouseholdForecast(suburb: string) {
  console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Searching for suburb/region:', suburb);
  
  try {
    // First try exact match with suburb name
    let { data, error } = await supabase
      .from('vic_forecast_households')
      .select('*')
      .eq('region', suburb)
      .in('year', [2021, 2026, 2031, 2036])
      .order('year', { ascending: true });
    
    console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Exact match results:', data?.length || 0, 'records');
    
    // If no exact match, try case-insensitive
    if (!data || data.length === 0) {
      console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Trying case-insensitive match...');
      const result = await supabase
        .from('vic_forecast_households')
        .select('*')
        .ilike('region', suburb)
        .in('year', [2021, 2026, 2031, 2036])
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    // If still no match, try partial match
    if (!data || data.length === 0) {
      console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Trying partial match...');
      const result = await supabase
        .from('vic_forecast_households')
        .select('*')
        .ilike('region', `%${suburb}%`)
        .in('year', [2021, 2026, 2031, 2036])
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Partial match results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchHouseholdForecast - Database error:', error);
      return { data: null, error };
    }
    
    console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Final results:', data?.length || 0, 'records found');
    if (data && data.length > 0) {
      console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Sample data:', data[0]);
      
      try {
        // FIXED: Ultra-safe approach with explicit typing
        interface HouseholdRecord {
          year?: number;
          region?: string;
          householdType?: string;
        }
        
        const years = Array.from(new Set(data.map((d: HouseholdRecord) => d?.year).filter(y => y != null)));
        const regions = Array.from(new Set(data.map((d: HouseholdRecord) => d?.region).filter(r => r != null)));
        const householdTypes = Array.from(new Set(data.map((d: HouseholdRecord) => d?.householdType).filter(h => h != null)));
        
        console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Available years:', years);
        console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Available regions:', regions);
        console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Available household types:', householdTypes);
      } catch {
        console.log('[DEBUG fetchSuburbData] fetchHouseholdForecast - Logging error, skipping detailed logs');
      }
    }
    
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchHouseholdForecast - Exception:', err);
    return { data: null, error: err };
  }
}