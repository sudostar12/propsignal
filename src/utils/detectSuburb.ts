// Complete detectSuburb implementation with all imports

import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';
import { detectUserIntent } from '@/utils/detectIntent';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Type definitions
interface SuburbData {
  suburb: string;
  lga: string;
  state: string;
}

interface DetectionResult {
  possible_suburb: string | null;
  confidence: number;
  lga?: string;
  state?: string;
  needsClarification: boolean;
  multipleMatches?: SuburbData[];
  extractedSuburb?: string;
  message?: string;
  isFuzzyMatch?: boolean;
}

// Main detection function
export async function detectSuburb(input: string): Promise<DetectionResult> {
  console.log('[DEBUG] detectSuburb - Starting suburb detection for input:', input);

  const intent = await detectUserIntent(input);
console.log('[DEBUG] Detected intent:', intent);

if (intent !== 'suburb') {
  console.log('[DEBUG] Intent is not suburb — skipping suburb extraction');
    
 return {
  possible_suburb: null,
  confidence: 0,
  needsClarification: false,
  message: "I couldn't detect a suburb in your message." // optional fallback
};
}
  
  // Step 1: Extract suburb using AI
  console.log('[DEBUG] detectSuburb - Using AI to extract suburb name');
  const extractedSuburb = await extractSuburbUsingAI(input);
  console.log('[DEBUG] detectSuburb - AI extracted suburb:', extractedSuburb);
  
  // Check if the AI extrated suburb is valid
  if (!extractedSuburb || extractedSuburb.length < 2) {
  console.log('[DEBUG] AI could not extract a valid suburb. Skipping DB lookup.');
  return {
    possible_suburb: null,
    confidence: 0,
    needsClarification: true,
    message: 'Sorry, I could not detect a suburb in your question. Could you please provide it?'
  };
}
  // Get the the first three letters of the AI generated suburb
  const firstThreeLetters = extractedSuburb.slice(0, 3).toLowerCase();
  console.log('[DEBUG] First 3 letters of extracted suburb:', firstThreeLetters);



  // Step 2: Load suburbs from database
const { data: allSuburbs, error } = await supabase
  .from('lga_suburbs')
  .select('suburb, lga, state')
  .ilike('suburb', `${firstThreeLetters}%`)
  .order('suburb')
  .limit(100); // limit to 100 for safety; adjust if needed

  
  if (error) {
    console.error('[ERROR] Failed to load suburbs:', error);
    return {
      possible_suburb: null,
      confidence: 0,
      needsClarification: false,
      message: 'Unable to load suburb data'
    };
  }
  
  console.log('[DEBUG] detectSuburb - Loaded', allSuburbs?.length || 0, 'suburbs from database');
  
  if (!allSuburbs || allSuburbs.length === 0) {
    console.error('[ERROR] No suburbs loaded from database');
    return {
      possible_suburb: null,
      confidence: 0,
      needsClarification: false,
      message: 'Unable to load suburb data'
    };
  }
  
  // Step 3: Clean and normalize the extracted suburb name
  const normalizedExtracted = normalizeSuburbName(extractedSuburb);
  console.log('[DEBUG] detectSuburb - Normalized extracted suburb:', normalizedExtracted);
  
  // Step 4: Debug - Check what Box Hill entries exist - TEMP - DELETE after fixing. 
  if (normalizedExtracted.includes('box')) {
    const boxHillSuburbs = allSuburbs.filter(s => 
      s.suburb.toLowerCase().includes('box')
    );
    console.log('[DEBUG] All suburbs containing "box":', 
      boxHillSuburbs.map(s => `"${s.suburb}" (${s.state})`)
    );
  }
  
  // Step 5: Find exact matches with normalized comparison
  console.log('[DEBUG] detectSuburb - Looking for matches for:', normalizedExtracted);

  // Step 5: Find exact matches with normalized comparison
  console.log('[DEBUG] detectSuburb - Looking for matches for:', normalizedExtracted);
  
  const allMatches = allSuburbs.filter(s => {
    const normalizedDb = normalizeSuburbName(s.suburb);
    const isMatch = normalizedDb === normalizedExtracted;
    
    // Extra debug for Box Hill
    if (normalizedExtracted === 'box hill' && s.suburb.toLowerCase().includes('box')) {
      console.log(`[DEBUG] Comparing DB: "${s.suburb}" (normalized: "${normalizedDb}") with extracted: "${extractedSuburb}" (normalized: "${normalizedExtracted}") - Match: ${isMatch}`);
    }
    
    return isMatch;
  });
  
  console.log('[DEBUG] detectSuburb - Found matches:', 
    allMatches.map(s => `${s.suburb} (${s.lga}, ${s.state})`)
  );
  
  // Step 6: Handle results based on number of matches
  if (allMatches.length === 0) {
    console.log('[DEBUG] detectSuburb - No exact matches found');
    // Try fuzzy matching
    return tryFuzzyMatching(normalizedExtracted, extractedSuburb, allSuburbs);
  } else if (allMatches.length === 1) {
    // Single match - perfect!
    const exactMatch = allMatches[0];
    console.log('[DEBUG] detectSuburb - Single exact match found:', exactMatch.suburb);
    return {
      possible_suburb: exactMatch.suburb,
      confidence: 0.95,
      lga: exactMatch.lga,
      state: exactMatch.state,
      needsClarification: false
    };
  } else {
    // Multiple matches - ask user to clarify
    console.log('[DEBUG] detectSuburb - Multiple matches found, need user clarification');
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

// Fuzzy matching function
function tryFuzzyMatching(normalizedExtracted: string, originalExtracted: string, allSuburbs: SuburbData[]): DetectionResult {
  console.log('[DEBUG] detectSuburb - No exact match, trying fuzzy matching for:', normalizedExtracted);
  
  const fuzzyMatches = allSuburbs.filter(s => {
    const normalizedDb = normalizeSuburbName(s.suburb);
    
    // Skip if it's an exact match (should have been caught earlier)
    if (normalizedDb === normalizedExtracted) {
      console.log(`[WARNING] Exact match found in fuzzy matching: "${s.suburb}" - this suggests a normalization issue`);
      return true;
    }
    
    // Check for partial matches
    const isPartialMatch = 
      normalizedDb.includes(normalizedExtracted) ||
      normalizedExtracted.includes(normalizedDb);
    
    // Check Levenshtein distance
    const distance = calculateLevenshteinDistance(normalizedDb, normalizedExtracted);
    const isCloseMatch = distance <= 2;
    
    return isPartialMatch || isCloseMatch;
  });
  
  console.log('[DEBUG] detectSuburb - Fuzzy matches:', fuzzyMatches.map(s => s.suburb));
  
  if (fuzzyMatches.length === 0) {
    console.log('[DEBUG] AI suburb detection result: { possible_suburb: null, confidence: 0 }');
    return {
      possible_suburb: null,
      confidence: 0,
      needsClarification: false,
      message: `I couldn't find a suburb matching "${originalExtracted}". Please check the spelling or try a different suburb.`
    };
  }
  
  // Check if we have multiple fuzzy matches for the same suburb name (different states)
  const uniqueSuburbNames = new Map<string, SuburbData[]>();
  fuzzyMatches.forEach(match => {
    const normalized = normalizeSuburbName(match.suburb);
    if (!uniqueSuburbNames.has(normalized)) {
      uniqueSuburbNames.set(normalized, []);
    }
    uniqueSuburbNames.get(normalized)!.push(match);
  });
  
  // If the best fuzzy match has multiple states, ask for clarification
  const sortedMatches = Array.from(uniqueSuburbNames.entries()).sort((a, b) => {
    const distA = calculateLevenshteinDistance(a[0], normalizedExtracted);
    const distB = calculateLevenshteinDistance(b[0], normalizedExtracted);
    return distA - distB;
  });
  
  const [/*bestMatchName*/, bestMatchSuburbs] = sortedMatches[0];
  
  if (bestMatchSuburbs.length > 1) {
    // Multiple states for the same suburb
    console.log('[DEBUG] detectSuburb - Best fuzzy match has multiple states, need clarification');
    return {
      possible_suburb: null,
      confidence: 0.8,
      needsClarification: true,
      multipleMatches: bestMatchSuburbs,
      extractedSuburb: bestMatchSuburbs[0].suburb,
      isFuzzyMatch: true,
      message: `Did you mean "${bestMatchSuburbs[0].suburb}"? I found it in ${bestMatchSuburbs.length} states.`
    };
  }
  
  // Single fuzzy match
  const bestMatch = bestMatchSuburbs[0];
  console.log('[DEBUG] detectSuburb - Best fuzzy match:', bestMatch.suburb);
  
  const result = {
    possible_suburb: bestMatch.suburb,
    confidence: 0.8,
    lga: bestMatch.lga,
    state: bestMatch.state,
    isFuzzyMatch: true,
    needsClarification: false
  };
  
  console.log('[DEBUG] AI suburb detection result:', result);
  return result;
}

// Levenshtein distance calculation
function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[m][n];
}

// AI extraction function using OpenAI
async function extractSuburbUsingAI(input: string): Promise<string> {
  try {
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
          - "hello how are you" -> "NO_SUBURB_FOUND"`
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
      console.log('[DEBUG] AI could not extract a suburb from input');
      // Fallback to simple pattern matching
      return extractSuburbFallback(input);
    }
    
    return extracted;
  } catch (error) {
    console.error('[ERROR] OpenAI API error:', error);
    // Fallback to simple extraction
    return extractSuburbFallback(input);
  }
}

// Fallback extraction when AI fails
function extractSuburbFallback(input: string): string {
  // Simple pattern matching as fallback
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

// Example usage function
export async function handleSuburbDetection(userInput: string) {
  const result = await detectSuburb(userInput);
  
  if (result.needsClarification && result.multipleMatches) {
    // Show user the options
    console.log('\n🤔 Clarification needed:', result.message);
    result.multipleMatches.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.suburb}, ${match.lga}, ${match.state}`);
    });
    
    return {
      action: 'ASK_USER',
      options: result.multipleMatches,
      message: result.message
    };
  } else if (result.possible_suburb) {
    // Found a match (exact or fuzzy)
    console.log(`\n✅ Found suburb: ${result.possible_suburb} (${result.state})`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    if (result.isFuzzyMatch) {
      console.log(`   Note: This was a fuzzy match`);
    }
    return {
      action: 'PROCEED',
      suburb: result.possible_suburb,
      state: result.state,
      lga: result.lga
    };
  } else {
    // No match found
    console.log('\n❌ No suburb found');
    return {
      action: 'NOT_FOUND',
      message: result.message
    };
  }
}

// Debug function to check your database
export async function debugDatabaseSuburbs(searchTerm: string = 'box hill') {
  console.log('\n=== DATABASE DEBUG ===');
  
  const { data: allSuburbs, error } = await supabase
    .from('suburbs')
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

