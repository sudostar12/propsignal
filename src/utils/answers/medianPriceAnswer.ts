// src/utils/answers/medianPriceAnswer.ts
import { supabase } from '@/lib/supabaseClient';

// =======================
// [DEBUG-medianPriceAnswer.ts] Answer Median Price Function (polished period text)
// =======================
export async function answerMedianPrice(suburb: string) {
  console.log('[DEBUG-MP1.1] Fetching latest ALL-bedroom median prices for:', suburb);

  const { data, error } = await supabase
    .from('median_price_v') // view includes update_dt (DATE derived from "update")
    .select('id, suburb, state, year, medianPrice, propertyType, bedroom, update, update_dt')
    .eq('suburb', suburb)
    .eq('bedroom', 'all')
    .in('propertyType', ['house', 'unit'])
    .not('medianPrice', 'is', null)
    .order('year', { ascending: false })
    .order('update_dt', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(12);

  if (error) {
    console.error('[ERROR-MP1.1] Supabase query failed:', error);
    return `Sorry, I couldn't retrieve median price data for ${suburb}.`;
  }
  if (!data || data.length === 0) {
    console.warn('[WARN-MP1.1] No rows returned for', suburb);
    return `Sorry, I couldn't find median price data for ${suburb}.`;
  }

  console.log('[DEBUG-MP1.2] Rows returned:', data.length);

  type Row = {
    id: number;
    suburb: string;
    state?: string | null;
    year: number;
    medianPrice: number;
    propertyType: 'house' | 'unit' | string;
    bedroom: string;      // 'all'
    update: string | null;     // e.g., "2025-August"
    update_dt: string | null;  // ISO date (from view)
  };

  const latestByType: Record<'house' | 'unit', Row | null> = { house: null, unit: null };

  for (const row of data as Row[]) {
    if ((row.propertyType === 'house' || row.propertyType === 'unit') && row.bedroom === 'all') {
      if (!latestByType[row.propertyType]) latestByType[row.propertyType] = row;
    }
    if (latestByType.house && latestByType.unit) break;
  }

  // --- helpers ---
  const formatMonthYear = (isoDate: string): string => {
    // Robust against timezone—treat as UTC
    const d = new Date(isoDate + 'T00:00:00Z');
    return d.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
  };

  const formatUpdateText = (updateText: string): string => {
    // "2025-August" -> "August 2025"
    const [y, m] = updateText.split('-'); // ["2025","August"]
    return m && y ? `${m} ${y}` : updateText;
  };

  const formatPeriod = (row: Row): string => {
    if (row.update_dt) return formatMonthYear(row.update_dt);
    if (row.update) return formatUpdateText(row.update);
    return String(row.year);
  };

  const fmtLine = (row: Row | null, emoji: string, label: 'house' | 'unit') => {
    if (!row) return `${emoji} Latest ${label} median price is currently unavailable.`;
    const price =
      typeof row.medianPrice === 'number'
        ? `$${Math.round(row.medianPrice).toLocaleString('en-AU')}`
        : 'unknown price';
    const period = formatPeriod(row); // e.g., "August 2025"
    return `${emoji} As of ${period}, the median ${label} price in ${row.suburb} is ${price}.`;
  };

  const houseLine = fmtLine(latestByType.house, '🏠', 'house');
  const unitLine  = fmtLine(latestByType.unit,  '🏢', 'unit');

  console.log('[DEBUG-MP1.3] House latest:', latestByType.house);
  console.log('[DEBUG-MP1.4] Unit latest:', latestByType.unit);

  return `${houseLine}\n\n${unitLine}\n\n💬 Want trends too? I can show 3-year price movement for houses and units.`;
}
