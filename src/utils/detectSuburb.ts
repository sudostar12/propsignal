// Complete detectSuburb implementation with all imports and fixed type definitions

import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';
//import { detectUserIntent } from '@/utils/detectIntent';
import { generateGeneralReply, ChatMessage } from '@/utils/detectIntent';
import { analyzeUserQuestion } from '@/utils/questionAnalyzer';



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Type definitions - moved to top and exported for better visibility
export interface SuburbData {
  suburb: string;
  lga: string;
  state: string;
}

export interface DetectionResult {
  possible_suburb: string | null;
  confidence: number;
  lga?: string;
  state?: string;
  needsClarification: boolean;
  multipleMatches?: SuburbData[];
  extractedSuburb?: string;
  message?: string;
  nearbySuburbs?: string[];
}

// Additional interface for handler return type
export interface SuburbDetectionResponse {
  action: 'ASK_USER' | 'PROCEED' | 'NOT_FOUND';
  options?: SuburbData[];
  message?: string;
  suburb?: string;
  state?: string;
  lga?: string;
}

// Main detection function - now with proper return type
export async function detectSuburb(input: string, userProvidedState?: string): Promise<DetectionResult> {
  console.log('[DEBUG detectSuburb] detectSuburb - Starting suburb detection for input:', input);

  //const intent = await detectUserIntent(input);
  //console.log('[DEBUG detectSuburb] Detected intent:', intent);
 
  // Step 1: Extract suburb using AI
  console.log('[DEBUG detectSuburb] - Using AI to extract suburb name');
  const extractedSuburb = await extractSuburbUsingAI(input);
  console.log('[DEBUG detectSuburb] - AI extracted suburb:', extractedSuburb);
  
  // Check if the AI extracted suburb is valid
if (!extractedSuburb || extractedSuburb.length < 2 || extractedSuburb === "NO_SUBURB_FOUND") {
  console.log('[DEBUG detectSuburb] - AI could not extract a valid suburb. Falling back to general AI reply.');
    const questionAnalysis = await analyzeUserQuestion(input);
    const topic = questionAnalysis.topic; 
  const messages: ChatMessage[] = [
  { role: 'user', content: input }
];
  const fallbackReply = await generateGeneralReply(messages, topic);
  return {
    possible_suburb: null,
    confidence: 0,
    needsClarification: true,
    message: fallbackReply
  };
}

  // Get the first three letters of the AI generated suburb
  const firstThreeLetters = extractedSuburb.slice(0, 3).toLowerCase();
  console.log('[DEBUG detectSuburb] First 3 letters of extracted suburb:', firstThreeLetters);

  // Step 2: Load suburbs from database
  const { data: allSuburbs, error } = await supabase
    .from('lga_suburbs')
    .select('suburb, lga, state')
    .ilike('suburb', `${firstThreeLetters}%`)
    .order('suburb')
    .limit(100); // limit to 100 for safety; adjust if needed

  if (error) {
    console.error('[ERROR detectSuburb] Failed to load suburbs:', error);
    return {
      possible_suburb: null,
      confidence: 0,
      needsClarification: false,
      message: 'Unable to load suburb data'
    };
  }
  
  console.log('[DEBUG detectSuburb] - Loaded', allSuburbs?.length || 0, 'suburbs from database');
  
  if (!allSuburbs || allSuburbs.length === 0) {
    console.error('[ERROR detectSuburb] No suburbs loaded from database');
    const questionAnalysis = await analyzeUserQuestion(input);
    const topic = questionAnalysis.topic;   
    const messages: ChatMessage[] = [
    { role: 'user', content: input }
    ];

    const fallbackReply = await generateGeneralReply(messages, topic);
    return {
    possible_suburb: null,
    confidence: 0,
    needsClarification: true,
    message: fallbackReply
    };
  }
  
  // Step 3: Clean and normalize the extracted suburb name
  const normalizedExtracted = normalizeSuburbName(extractedSuburb);
  console.log('[DEBUG detectSuburb] - Normalized extracted suburb:', normalizedExtracted);
  
const allMatches = allSuburbs.filter(s => {
    const normalizedDb = normalizeSuburbName(s.suburb);
    const isMatch = normalizedDb === normalizedExtracted;
    
    // ✅ If user provided a state, only match suburbs in that state
    if (userProvidedState && isMatch) {
      // Normalize both states to abbreviations for comparison
      const normalizedDbState = normalizeStateToAbbreviation(s.state);
      const normalizedUserState = normalizeStateToAbbreviation(userProvidedState);
      const stateMatch = normalizedDbState === normalizedUserState;
      
      console.log(`[DEBUG detectSuburb] Checking state match: ${s.state}(${normalizedDbState}) vs ${userProvidedState}(${normalizedUserState}) = ${stateMatch}`);
      return stateMatch;
    }
    
    return isMatch;
  });
  
  console.log('[DEBUG detectSuburb] - Found matches:', 
    allMatches.map(s => `${s.suburb} (${s.lga}, ${s.state})`)
  );
  
  // ✅ Early exit: Only process VIC suburbs for now - to be deleted once coverage is expanded to other states. - 26/07
if (allMatches.length === 1 && allMatches[0].state.toUpperCase() !== "VIC") {
  console.log(`[INFO detectSuburb] Match found in ${allMatches[0].state} — non-VIC suburbs are not yet supported.`);

  return {
    possible_suburb: allMatches[0].suburb,
    confidence: 1,
    lga: allMatches[0].lga,
    state: allMatches[0].state,
    needsClarification: false,
    nearbySuburbs: [], // skip nearby lookup
    message: "Suburb found outside Victoria"
  };
}

// non-vic suburbs logic above this line. 

  // Step 4: Handle results based on number of matches
  if (allMatches.length === 0) {
    console.log('[DEBUG detectSuburb] - No exact matches found');
    // For now, return no match found (fuzzy matching is commented out)
    return {
      possible_suburb: null,
      confidence: 0,
      needsClarification: false,
      message: `I couldn't find a suburb matching "${extractedSuburb}". Please check the spelling or try a different suburb.`
    };
  } else if (allMatches.length === 1) {
    // Single match - perfect!
    const exactMatch = allMatches[0];
    console.log('[DEBUG detectSuburb] - Single exact match found: Suburb:', exactMatch.suburb, ', LGA:', exactMatch.lga, ', State:', exactMatch.state);
    
    const suburbName = exactMatch.suburb;
    const lgaName = exactMatch.lga;
    
    // Query other suburbs in same LGA
    let nearbyList: string[] = [];
    const { data: nearbySuburbs, error: nearbyError } = await supabase
      .from('lga_suburbs')
      .select('suburb')
      .eq('lga', lgaName)
      .neq('suburb', suburbName)
      .limit(5);

    if (nearbyError) {
      console.error('[ERROR detectSuburb] Failed to load nearby suburbs:', nearbyError);
    } else {
      nearbyList = nearbySuburbs?.map(s => s.suburb) || [];
      console.log('[DEBUG detectSuburb] Nearby suburbs in same LGA:', nearbyList);
    }

    return {
      possible_suburb: suburbName,
      confidence: 0.95,
      lga: exactMatch.lga,
      state: exactMatch.state,
      needsClarification: false,
      nearbySuburbs: nearbyList
    };
  } else {
    // Multiple matches - ask user to clarify
    console.log('[DEBUG detectSuburb] - Multiple matches found, need user clarification');
    return {
      possible_suburb: null,
      confidence: 0,
      needsClarification: true,
      multipleMatches: allMatches,
      extractedSuburb: extractedSuburb,
      message: `I found ${allMatches.length} suburbs named "${extractedSuburb}". Which one did you mean?`
    };
  }
}

// Helper function to normalize suburb names for comparison
function normalizeSuburbName(name: string): string {
  if (!name) return '';
  
  return name
    .trim()                          // Remove leading/trailing spaces
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .toLowerCase()                   // Convert to lowercase
    .replace(/['']/g, "'")          // Normalize apostrophes
    .replace(/\u00A0/g, ' ')        // Replace non-breaking spaces
    .replace(/[^\w\s'-]/g, '');     // Remove special characters except apostrophes and hyphens
}

// Helper function to normalize state names to abbreviations
// Helper function to normalize state names to abbreviations
export function normalizeStateToAbbreviation(state: string): string {
  if (!state) return '';
  
  const stateUpper = state.trim().toUpperCase();
  
  // If already an abbreviation, return it
  if (['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].includes(stateUpper)) {
    return stateUpper;
  }
  
  // Convert full names to abbreviations
  const stateMap: { [key: string]: string } = {
    'NEW SOUTH WALES': 'NSW',
    'VICTORIA': 'VIC',
    'QUEENSLAND': 'QLD',
    'SOUTH AUSTRALIA': 'SA',
    'WESTERN AUSTRALIA': 'WA',
    'TASMANIA': 'TAS',
    'NORTHERN TERRITORY': 'NT',
    'AUSTRALIAN CAPITAL TERRITORY': 'ACT'
  };
  
  return stateMap[stateUpper] || stateUpper;
}

// AI extraction function using OpenAI
async function extractSuburbUsingAI(input: string): Promise<string> {
  try {
    console.log('[DEBUG detectSuburb] triggering extractSuburbUsingAI function');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: "system",
          content: `You are a suburb name extractor for Australian real estate queries. 
          Extract ONLY the suburb name from the user's input. 
          Return ONLY the suburb name, nothing else.
          If no suburb is mentioned, return "NO_SUBURB_FOUND".
          Examples:
          - "investment profile for box hill" -> "Box Hill"
          - "what's the weather in St Kilda" -> "St Kilda"
          - "properties in south yarra" -> "South Yarra"
          - "hello how are you" -> "NO_SUBURB_FOUND"
          - "investment insights for Tarneit and Point Cook" -> "Tarneit" "Point Cook"`
        },
        {
          role: "user",
          content: input
        }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 50
    });
    
    const extracted = completion.choices[0]?.message?.content?.trim() || '';
    
    if (extracted === 'NO_SUBURB_FOUND' || !extracted) {
      console.log('[DEBUG detectSuburb] AI could not extract a suburb from input');
      // Fallback to simple pattern matching
      return "NO_SUBURB_FOUND";
    }
    
    return extracted;
  } catch (error) {
    console.error('[ERROR] OpenAI API suburb extraction error:', error);
    // Fallback to simple extraction
    return "NO_SUBURB_FOUND";
  }
}

/* Fallback extraction when AI fails
function extractSuburbFallback(input: string): string {
  // Simple pattern matching as fallback
  console.log('[DEBUG detectSuburb] fallback to extractSuburbFallback when AI fails suburb detection.');
  const patterns = [
    /(?:in|at|for|to|from|near|around|about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Last resort - return empty string
  return '';
}
*/
// Debug function to check your database
export async function debugDatabaseSuburbs(searchTerm: string = 'box hill'): Promise<void> {
  console.log('\n=== DATABASE DEBUG ===');
  
  const { data: allSuburbs, error } = await supabase
    .from('lga_suburbs')  // Updated to match your table name
    .select('suburb, lga, state')
    .ilike('suburb', `%${searchTerm.split(' ')[0]}%`);
  
  if (error) {
    console.error('Error loading suburbs:', error);
    return;
  }
  
  console.log(`Found ${allSuburbs?.length || 0} suburbs containing "${searchTerm.split(' ')[0]}":`);
  
  allSuburbs?.forEach(s => {
    console.log(`  - "${s.suburb}" (${s.state}) [Length: ${s.suburb.length}]`);
    // Show character codes for exact matches
    if (s.suburb.toLowerCase() === searchTerm.toLowerCase()) {
      console.log(`    Chars: ${s.suburb.split('').map((c: string) => `${c}(${c.charCodeAt(0)})`).join(' ')}`);
    }
  });
  
  console.log('\n=== END DEBUG ===\n');
}