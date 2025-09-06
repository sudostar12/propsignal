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

export async function fetchRentals(suburb: string) {
  console.log('[DEBUG fetchSuburbData] fetchRentals - Searching for suburb:', suburb);
  
  try {
    // OPTIMIZED: Only get last 3 years and specific bedroom configurations
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3; // Last 3 years
    
    console.log('[DEBUG fetchSuburbData] fetchRentals - Filtering for years:', startYear, 'to', currentYear);
    console.log('[DEBUG fetchSuburbData] fetchRentals - Target bedrooms: Houses (3, 4), Units (2)');
    
    const { data, error } = await supabase
      .from('median_rentals')
      .select('*')
      .eq('suburb', suburb)
      .gte('year', startYear) // Only last 3 years
      .or(
        // Houses: 3 and 4 bedrooms only
        'and(propertyType.ilike.%house%,bedroom.in.(3,4)),' +
        // Units: 2 bedrooms only  
        'and(propertyType.ilike.%unit%,bedroom.eq.2)'
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
      console.log('  - Houses (3/4):', houses.length, 'records');
      console.log('  - Units (2):', units.length, 'records');
      console.log('  - Years covered:', years);
      console.log('  - Sample data:', data[0]);
    }
    
    console.log('[DEBUG fetchSuburbData] fetchRentals - Final results:', data?.length || 0, 'records found (last 3 years, targeted bedrooms)');
    return { data, error: null };
    
  } catch (err) {
    console.error('[ERROR] fetchRentals - Exception:', err);
    return { data: null, error: err };
  }
}

// Fetch rental yield values from median_rentals table where bedroom = "all"
export async function fetchRentalYield(suburb: string, year?: number) {
  console.log('[DEBUG-FRY] Fetching rental yield for suburb:', suburb, 'year:', year);
  
  try {
    let query = supabase
      .from('median_rentals')
      .select('propertyType, rentalYield, year, suburb')
      .eq('suburb', suburb)
      .eq('bedroom', 'all')
      .not('rentalYield', 'is', null); // Only get records where rentalYield is not null

    // If year is provided, filter by that year, otherwise get the latest year
    if (year) {
      query = query.eq('year', year);
    } else {
      // Get the latest year available for this suburb
      const { data: yearData } = await supabase
        .from('median_rentals')
        .select('year')
        .eq('suburb', suburb)
        .eq('bedroom', 'all')
        .not('rentalYield', 'is', null)
        .order('year', { ascending: false })
        .limit(1);
      
      if (yearData && yearData.length > 0) {
        query = query.eq('year', yearData[0].year);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ERROR-FRY] Error fetching rental yield:', error);
      return { data: null, error };
    }

    console.log('[DEBUG-FRY] Rental yield data found:', data?.length || 0, 'records');
    return { data, error: null };

  } catch (error) {
    console.error('[ERROR-FRY] Exception in fetchRentalYield:', error);
    return { data: null, error };
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

export async function fetchCrime(suburb: string) 
{
  console.log('[DEBUG fetchSuburbData] fetchCrime - Searching for suburb:', suburb);
  
  try {
    // OPTIMIZED: Only get recent years and specific columns
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2; // Last 3 years (curent, prev, prev-prev)
    
    console.log('[DEBUG fetchSuburbData] fetchCrime - Filtering for years:', startYear, 'to', currentYear);
    
    const { data: suburbData, error: suburbError } = await supabase
      .from('crime_stats')
      .select('offenceCount, year, suburb') // Only needed columns
      .eq('suburb', suburb)
      .not('offenceCount', 'is', null) // Only records with crime data
      .gte('year', startYear) // Only recent years
      .order('year', { ascending: true });
    
    console.log('[DEBUG fetchSuburbData] fetchCrime - Exact match results:', suburbData?.length || 0, 'records');

    
    if (suburbError) {
      console.error('[ERROR fetchCrime] - Suburb error:', suburbError);
      return { suburbData: null, nearbyData: null, error: suburbError };
    }

    // Log sample data for debugging
    if (suburbData && suburbData.length > 0) {
      console.log('[DEBUG fetchSuburbData] fetchCrime - Sample record:', suburbData[0]);
      // FIXED: Get unique years with proper typing
      const years = Array.from(new Set(suburbData.map((d: { year?: number }) => d.year).filter(Boolean))).sort();
      console.log('[DEBUG fetchSuburbData] fetchCrime - Years available:', years);
      // FIXED: Reduce function with proper typing
      const totalOffences = suburbData.reduce((sum: number, d: { offenceCount?: number }) => sum + (d.offenceCount || 0), 0);
      console.log('[DEBUG fetchSuburbData] fetchCrime - Total offences across all years:', totalOffences);
    }
    
    console.log('[DEBUG fetchSuburbData] fetchCrime - Final results:', suburbData?.length || 0, 'records found (last 5 years)');
    return { suburbData, error: null };
    
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

// ===================== Unified latest suburb metrics helper (ADD BELOW) =====================

/**
 * Shape returned by the materialized view `mv_latest_suburb_metrics`.
 * Adjust if you later add more fields to the MV.
 */
export type LatestSuburbMetricsRow = {
  state: string;
  suburb: string;
  propertyType: 'house' | 'unit';
  bedroom: number | null;                // null when price-only row
  price_year: number | null;
  price_median: number | null;
  price_pctChange1Yr: number | null;
  price_pctChange10Yr: number | null;
  rent_year: number | null;
  rent_median: number | null;
  lga: string | null;
};

/**
 * Parameters for fetching latest metrics.
 */
export type LatestSuburbMetricsParams = {
  state: string;                         // e.g., 'VIC'
  suburb: string;                        // e.g., 'Box Hill'
  propertyType?: 'house' | 'unit';       // optional filter
  bedroom?: number;                      // optional; applies to rent dimension
};

/**
 * Generic interface for the Supabase client so we don't force a specific import here.
 * Pass in the client you already use elsewhere in this file.
 */
export interface ISupabaseClient {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
}

/**
 * Unified fetch: tries the RPC first when the feature flag is enabled.
 * - If RPC returns rows, we use them.
 * - If RPC errors/empty and STRICT=false, we call your fallback (legacy) function.
 * - If the flag is OFF, we call fallback directly (no behaviour change).
 *
 * @param supabase   Your existing Supabase client instance (do not create a new one).
 * @param params     Filters for state/suburb/propertyType/bedroom.
 * @param fallback   A function that returns the legacy shape you currently use.
 *                   Example: () => legacyFetchLatestSuburbMetrics(params)
 */
export async function getLatestSuburbMetrics(
  supabase: ISupabaseClient,
  params: LatestSuburbMetricsParams,
  fallback: () => Promise<{ rows: any[]; source: string }>
): Promise<{ rows: LatestSuburbMetricsRow[]; source: 'unified' | 'legacy' | 'unified-empty-fallback' | 'unified-error-fallback' }> {
  const useUnified = String(process.env.NEXT_PUBLIC_USE_UNIFIED_METRICS) === 'true';
  const strict = String(process.env.NEXT_PUBLIC_UNIFIED_METRICS_STRICT) === 'true';

  // Debug logging (visible in browser devtools or server logs depending on caller context)
  console.log('[getLatestSuburbMetrics] flags', { useUnified, strict });
  console.log('[getLatestSuburbMetrics] params', params);

  // Helper to safely normalise outputs
  const normaliseRows = (rows: any[]): LatestSuburbMetricsRow[] => {
    return (rows || []).map((r: any) => ({
      state: r.state ?? null,
      suburb: r.suburb ?? null,
      propertyType: r.propertyType,
      bedroom: r.bedroom ?? null,
      price_year: r.price_year ?? null,
      price_median: r.price_median ?? null,
      price_pctChange1Yr: r.price_pctChange1Yr ?? null,
      price_pctChange10Yr: r.price_pctChange10Yr ?? null,
      rent_year: r.rent_year ?? null,
      rent_median: r.rent_median ?? null,
      lga: r.lga ?? null,
    })) as LatestSuburbMetricsRow[];
  };

  // 1) Try unified path (RPC) if enabled
  if (useUnified) {
    try {
      const { data, error } = await supabase.rpc('fn_get_latest_suburb_metrics', {
        p_state: params.state,
        p_suburb: params.suburb,
        p_property_type: params.propertyType ?? null,
        p_bedroom: params.bedroom ?? null,
      });

      if (error) {
        console.warn('[getLatestSuburbMetrics] RPC error:', error?.message || error);
        if (strict) throw error;
        // Soft fallback
        const fb = await fallback();
        return { rows: normaliseRows(fb.rows), source: 'unified-error-fallback' };
      }

      if (Array.isArray(data) && data.length > 0) {
        const rows = normaliseRows(data);
        console.log('[getLatestSuburbMetrics] RPC rows=', rows.length);
        return { rows, source: 'unified' };
      }

      console.warn('[getLatestSuburbMetrics] RPC returned 0 rows.');
      if (strict) {
        // No fallback when STRICT=true
        return { rows: [], source: 'unified' };
      }
      // Soft fallback
      const fb = await fallback();
      return { rows: normaliseRows(fb.rows), source: 'unified-empty-fallback' };
    } catch (err: any) {
      console.error('[getLatestSuburbMetrics] RPC threw exception:', err?.message || err);
      if (strict) throw err;
      const fb = await fallback();
      return { rows: normaliseRows(fb.rows), source: 'unified-error-fallback' };
    }
  }

  // 2) If unified flag is OFF, use legacy path exactly as before
  const fb = await fallback();
  return { rows: normaliseRows(fb.rows), source: 'legacy' };
}
// ===================== End unified helper (ADD ABOVE) =====================
