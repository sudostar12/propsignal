//utils/fetchSuburbData.ts

import { supabase } from '@/lib/supabaseClient';

export async function fetchMedianPrice(suburb: string) {
  console.log('[DEBUG] fetchMedianPrice - Searching for suburb:', suburb);
  
  try {
    // OPTIMIZED: Only get last 5 years (2020-2024) for efficiency and relevance
    const currentYear = new Date().getFullYear(); //2024
    const startYear = currentYear - 4; // Last 5 years
    
    console.log('[DEBUG] fetchMedianPrice - Filtering for years:', startYear, 'to', currentYear);
    
    // Try exact match first with year filter
    let { data, error } = await supabase
      .from('median_price')
      .select('*')
      .eq('suburb', suburb)
      .gte('year', startYear) // Only last 5 years
      .order('year', { ascending: true });
    
    console.log('[DEBUG] fetchMedianPrice - Exact match results:', data?.length || 0, 'records');
    
    // If no exact match, try case-insensitive with year filter
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchMedianPrice - Trying case-insensitive match...');
      const result = await supabase
        .from('median_price')
        .select('*')
        .ilike('suburb', suburb)
        .gte('year', startYear)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchMedianPrice - Case-insensitive results:', data?.length || 0, 'records');
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
      console.log('[DEBUG] fetchMedianPrice - Partial match results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchMedianPrice - Database error:', error);
      return { data: null, error };
    }
    
    console.log('[DEBUG] fetchMedianPrice - Final results:', data?.length || 0, 'records found (last 5 years only)');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchMedianPrice - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchDemographics(suburb: string) {
  console.log('[DEBUG] fetchDemographics - Searching for suburb:', suburb);
  
  try {
    // Try exact match first
    let { data, error } = await supabase
      .from('sa2_demographics')
      .select('*')
      .eq('SA2Name', suburb);
    
    console.log('[DEBUG] fetchDemographics - Exact match results:', data?.length || 0, 'records');
    
    // If no exact match, try case-insensitive
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchDemographics - Trying case-insensitive match...');
      const result = await supabase
        .from('sa2_demographics')
        .select('*')
        .ilike('SA2Name', suburb);
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchDemographics - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    // If still no match, try partial match
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchDemographics - Trying partial match...');
      const result = await supabase
        .from('sa2_demographics')
        .select('*')
        .ilike('SA2Name', `%${suburb}%`);
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchDemographics - Partial match results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchDemographics - Database error:', error);
      return { data: null, error };
    }
    
    console.log('[DEBUG] fetchDemographics - Final results:', data?.length || 0, 'records found');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchDemographics - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchPopulation(suburb: string) {
  console.log('[DEBUG] fetchPopulation - Searching for suburb:', suburb);
  
  try {
    // Optimized query - get only unique year/totalPersons combinations
    let { data, error } = await supabase
      .from('sa2_population')
      .select('year, totalPersons, SA2Name, SA2Code')
      .eq('SA2Name', suburb)
      .not('totalPersons', 'is', null)
      .gte('year', 2021) // Only recent years for efficiency
      .order('year', { ascending: true });
    
    console.log('[DEBUG] fetchPopulation - Exact match results:', data?.length || 0, 'records');
    
    // If no exact match, try case-insensitive
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchPopulation - Trying case-insensitive match...');
      const result = await supabase
        .from('sa2_population')
        .select('year, totalPersons, SA2Name, SA2Code')
        .ilike('SA2Name', suburb)
        .not('totalPersons', 'is', null)
        .gte('year', 2021)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchPopulation - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchPopulation - Database error:', error);
      return { data: null, error };
    }
    
    // Remove duplicates if any (same year/totalPersons combinations)
  const uniqueData = data?.reduce((acc: any[], current) => {
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
    
    console.log('[DEBUG] fetchPopulation - Final unique results:', uniqueData.length, 'records found');
    console.log('[DEBUG] fetchPopulation - Data:', uniqueData);

    return { data: uniqueData, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchPopulation - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchRentals(lga: string) {
  console.log('[DEBUG] fetchRentals - Searching for LGA:', lga);
  
  try {
    // OPTIMIZED: Only get last 5 years and specific bedroom configurations
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4; // Last 5 years
    
    console.log('[DEBUG] fetchRentals - Filtering for years:', startYear, 'to', currentYear);
    console.log('[DEBUG] fetchRentals - Target bedrooms: Houses (3BHK, 4BHK), Units (2BHK)');
    
    const { data, error } = await supabase
      .from('median_rentals')
      .select('*')
      .ilike('lga', `%${lga}%`)
      .gte('year', startYear) // Only last 5 years
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
      
      // Get unique years using Array.from instead of spread operator
      const years = Array.from(new Set(data.map(d => d.year).filter(Boolean))).sort();
      
      console.log('[DEBUG] fetchRentals - Results breakdown:');
      console.log('  - Houses (3BHK/4BHK):', houses.length, 'records');
      console.log('  - Units (2BHK):', units.length, 'records');
      console.log('  - Years covered:', years);
      console.log('  - Sample data:', data[0]);
    }
    
    console.log('[DEBUG] fetchRentals - Final results:', data?.length || 0, 'records found (last 5 years, targeted bedrooms)');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchRentals - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchProjects(lga: string) {
  console.log('[DEBUG] fetchProjects - Searching for LGA:', lga);
  
  try {
    const { data, error } = await supabase
      .from('lga_projects')
      .select('*')
      .ilike('lga', `%${lga}%`);
    
    if (error) {
      console.error('[ERROR] fetchProjects - Database error:', error);
      return { data: null, error };
    }
    
    console.log('[DEBUG] fetchProjects - Results:', data?.length || 0, 'records found');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchProjects - Exception:', err);
    return { data: null, error: err };
  }
}

export async function fetchCrime(suburb: string) {
  console.log('[DEBUG] fetchCrime - Searching for suburb:', suburb);
  
  try {
    // OPTIMIZED: Only get recent years and specific columns
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4; // Last 5 years
    
    console.log('[DEBUG] fetchCrime - Filtering for years:', startYear, 'to', currentYear);
    
    let { data, error } = await supabase
      .from('crime_stats')
      .select('offenceCount, year, suburb') // Only needed columns
      .eq('suburb', suburb)
      .not('offenceCount', 'is', null) // Only records with crime data
      .gte('year', startYear) // Only recent years
      .order('year', { ascending: true });
    
    console.log('[DEBUG] fetchCrime - Exact match results:', data?.length || 0, 'records');
    
    // Try case-insensitive if no exact match
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchCrime - Trying case-insensitive match...');
      const result = await supabase
        .from('crime_stats')
        .select('offenceCount, year, suburb')
        .ilike('suburb', suburb)
        .not('offenceCount', 'is', null)
        .gte('year', startYear)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchCrime - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    // Try partial match if still no results
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchCrime - Trying partial match...');
      const result = await supabase
        .from('crime_stats')
        .select('offenceCount, year, suburb')
        .ilike('suburb', `%${suburb}%`)
        .not('offenceCount', 'is', null)
        .gte('year', startYear)
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchCrime - Partial match results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchCrime - Database error:', error);
      return { data: null, error };
    }
    
    // Log sample data for debugging
    if (data && data.length > 0) {
      console.log('[DEBUG] fetchCrime - Sample record:', data[0]);
      const years = Array.from(new Set(data.map(d => d.year).filter(Boolean))).sort();
      console.log('[DEBUG] fetchCrime - Years available:', years);
      const totalOffences = data.reduce((sum, d) => sum + (d.offenceCount || 0), 0);
      console.log('[DEBUG] fetchCrime - Total offences across all years:', totalOffences);
    }
    
    console.log('[DEBUG] fetchCrime - Final results:', data?.length || 0, 'records found (last 5 years)');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchCrime - Exception:', err);
    return { data: null, error: err };
  }
}


export async function fetchHouseholdForecast(suburb: string) {
  console.log('[DEBUG] fetchHouseholdForecast - Searching for suburb/region:', suburb);
  
  try {
    // First try exact match with suburb name
    let { data, error } = await supabase
      .from('vic_forecast_households')
      .select('*')
      .eq('region', suburb)
      .in('year', [2021, 2026, 2031, 2036])
      .order('year', { ascending: true });
    
    console.log('[DEBUG] fetchHouseholdForecast - Exact match results:', data?.length || 0, 'records');
    
    // If no exact match, try case-insensitive
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchHouseholdForecast - Trying case-insensitive match...');
      const result = await supabase
        .from('vic_forecast_households')
        .select('*')
        .ilike('region', suburb)
        .in('year', [2021, 2026, 2031, 2036])
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchHouseholdForecast - Case-insensitive results:', data?.length || 0, 'records');
    }
    
    // If still no match, try partial match
    if (!data || data.length === 0) {
      console.log('[DEBUG] fetchHouseholdForecast - Trying partial match...');
      const result = await supabase
        .from('vic_forecast_households')
        .select('*')
        .ilike('region', `%${suburb}%`)
        .in('year', [2021, 2026, 2031, 2036])
        .order('year', { ascending: true });
      
      data = result.data;
      error = result.error;
      console.log('[DEBUG] fetchHouseholdForecast - Partial match results:', data?.length || 0, 'records');
    }
    
    if (error) {
      console.error('[ERROR] fetchHouseholdForecast - Database error:', error);
      return { data: null, error };
    }
    
    console.log('[DEBUG] fetchHouseholdForecast - Final results:', data?.length || 0, 'records found');
    if (data && data.length > 0) {
      console.log('[DEBUG] fetchHouseholdForecast - Sample data:', data[0]);
      
 try {
    // Ultra-safe approach with explicit typing
    const years = Array.from(new Set(data.map(d => d?.year).filter(y => y != null)));
    const regions = Array.from(new Set(data.map(d => d?.region).filter(r => r != null)));
    const householdTypes = Array.from(new Set(data.map(d => d?.householdType).filter(h => h != null)));
    
    console.log('[DEBUG] fetchHouseholdForecast - Available years:', years);
    console.log('[DEBUG] fetchHouseholdForecast - Available regions:', regions);
    console.log('[DEBUG] fetchHouseholdForecast - Available household types:', householdTypes);
  } catch (logError) {
    console.log('[DEBUG] fetchHouseholdForecast - Logging error, skipping detailed logs');
  }
}
    
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchHouseholdForecast - Exception:', err);
    return { data: null, error: err };
  }
}