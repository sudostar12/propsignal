// src/utils/detectSuburb.ts
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function detectSuburb(userInput: string) {
  console.log('[DEBUG] detectSuburb - Starting suburb detection for input:', userInput);
  
  try {
    // Step 1: Get all suburbs from database for AI context
    const { data: allSuburbs, error: suburbError } = await supabase
      .from('lga_suburbs')
      .select('suburb, lga, state')
      .limit(2000); // Increase limit to get more suburbs
    
    if (suburbError) {
      console.error('[ERROR] detectSuburb - Failed to fetch suburbs:', suburbError);
      return { possible_suburb: null, confidence: 0 };
    }
    
    console.log('[DEBUG] detectSuburb - Loaded', allSuburbs?.length, 'suburbs from database');
    
    // Step 2: Create suburb list for AI prompt
    const suburbList = allSuburbs?.map(s => s.suburb).join('\n') || '';
    
    // Step 3: IMPROVED AI prompt for more accurate suburb detection
    const aiPrompt = `
You are a precise suburb detection expert for Australian real estate. Your job is to identify the EXACT suburb mentioned in user input.

USER INPUT: "${userInput}"

AVAILABLE SUBURBS (choose ONLY from this list):
${suburbList}

CRITICAL INSTRUCTIONS:
1. Find the EXACT suburb name that matches the user's input
2. If user says "Box Hill", match ONLY "Box Hill" - NOT "Box Hill North", "Box Hill South", etc.
3. Prioritize EXACT matches over partial matches
4. Handle common typos but maintain suburb accuracy
5. If multiple suburbs are similar, choose the most common/central one (e.g., "Box Hill" over "Box Hill North")
6. Return ONLY the exact suburb name as it appears in the list, or "NO_SUBURB_FOUND" if no match

EXAMPLES:
- "Properties in Box Hill" → "Box Hill" (NOT "Box Hill North")
- "What's the market like in Tarneit?" → "Tarneit"
- "Tell me about Melbourne CBD" → "Melbourne" 
- "Looking at houses in Sydeny" → "Sydney"

RESPONSE FORMAT: Return only the suburb name, nothing else.
`;

    console.log('[DEBUG] detectSuburb - Sending request to OpenAI');
    
    // Step 4: Call OpenAI for suburb detection
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1, // Very low temperature for consistent results
      max_tokens: 50,
      messages: [
        { role: 'system', content: aiPrompt },
        { role: 'user', content: userInput }
      ],
    });
    
    const aiResponse = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[DEBUG] detectSuburb - OpenAI response:', aiResponse);
    
    // Step 5: Validate AI response
    if (aiResponse === 'NO_SUBURB_FOUND' || !aiResponse) {
      console.log('[DEBUG] detectSuburb - No suburb found by AI');
      return { possible_suburb: null, confidence: 0 };
    }
    
    // Step 6: ENHANCED verification - find exact match first, then fuzzy match
    let matchedSuburb = allSuburbs?.find(s => 
      s.suburb.toLowerCase() === aiResponse.toLowerCase()
    );
    
    // If no exact match, try case-insensitive partial match
    if (!matchedSuburb) {
      console.log('[DEBUG] detectSuburb - No exact match, trying fuzzy match for:', aiResponse);
      matchedSuburb = allSuburbs?.find(s => 
        s.suburb.toLowerCase().includes(aiResponse.toLowerCase()) ||
        aiResponse.toLowerCase().includes(s.suburb.toLowerCase())
      );
    }
    
    if (matchedSuburb) {
      console.log('[DEBUG] detectSuburb - Successfully matched suburb:', matchedSuburb.suburb);
      console.log('[DEBUG] detectSuburb - User input was:', userInput);
      console.log('[DEBUG] detectSuburb - AI detected:', aiResponse);
      console.log('[DEBUG] detectSuburb - Final match:', matchedSuburb.suburb);
      
      return { 
        possible_suburb: matchedSuburb.suburb, 
        confidence: 0.9,
        lga: matchedSuburb.lga,
        state: matchedSuburb.state
      };
    } else {
      console.warn('[WARN] detectSuburb - AI returned suburb not in database:', aiResponse);
      return { possible_suburb: null, confidence: 0 };
    }
    
  } catch (error) {
    console.error('[ERROR] detectSuburb - AI suburb detection failed:', error);
    return { possible_suburb: null, confidence: 0 };
  }
}