//utils/detectSuburbs.ts

import { supabase } from '@/lib/supabaseClient';

export interface DetectedSuburbResult {
  possible_suburb: string | null;
  matching_suburbs: { suburb: string; state: string }[];
}

export async function detectSuburb(userInput: string): Promise<DetectedSuburbResult> {
  try {
    const { data: suburbList, error } = await supabase
      .from('lga_suburbs')
      .select('suburb, state');

    if (error) {
      console.error('Suburb list fetch failed:', error);
      return { possible_suburb: null, matching_suburbs: [] };
    }

    if (!suburbList || suburbList.length === 0) {
      return { possible_suburb: null, matching_suburbs: [] };
    }

    const input = userInput.toLowerCase();
    const matches = suburbList.filter(({ suburb }) =>
      new RegExp(`\\b${suburb.toLowerCase()}\\b`, 'i').test(input)
    );

    let possible_suburb: string | null = null;

    if (matches.length === 1) {
      possible_suburb = matches[0].suburb;
    }

    return {
      possible_suburb,
      matching_suburbs: matches,
    };

  } catch (e) {
    console.error('Suburb match error:', e);
    return { possible_suburb: null, matching_suburbs: [] };
  }
}

