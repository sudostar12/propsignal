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
      .limit(1000); // Adjust based on your data size
    
    if (suburbError) {
      console.error('[ERROR] detectSuburb - Failed to fetch suburbs:', suburbError);
      return { possible_suburb: null, confidence: 0 };
    }
    
    console.log('[DEBUG] detectSuburb - Loaded', allSuburbs?.length, 'suburbs from database');
    
    // Step 2: Create suburb list for AI prompt
    const suburbList = allSuburbs?.map(s => `${s.suburb}, ${s.lga}, ${s.state}`).join('\n') || '';
    
    // Step 3: AI prompt for suburb detection
    const aiPrompt = `
You are a suburb detection expert for Australian real estate. Your job is to identify the most likely suburb mentioned in user input, even with typos or informal language.

USER INPUT: "${userInput}"

AVAILABLE SUBURBS:
${suburbList}

INSTRUCTIONS:
1. Analyze the user input for ANY mention of Australian suburbs, cities, or locations
2. Handle common typos, abbreviations, and informal spellings
3. Consider context clues (e.g., "I'm looking in the eastern suburbs" + "Bondi" = Bondi, NSW)
4. Match against the provided suburb list
5. Return ONLY the exact suburb name as it appears in the list, or "NO_SUBURB_FOUND" if no match

EXAMPLES:
- "What's the market like in Bondi?" → "Bondi"
- "I'm interested in Melbourn CBD" → "Melbourne"
- "Tell me about Sydeny" → "Sydney"
- "Properties in Brissy" → "Brisbane"
- "Looking at houses in Adelaid" → "Adelaide"

RESPONSE FORMAT: Return only the suburb name, nothing else.
`;

    console.log('[DEBUG] detectSuburb - Sending request to OpenAI');
    
    // Step 4: Call OpenAI for suburb detection
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1, // Low temperature for consistent results
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
    
    // Step 6: Verify the suburb exists in our database
    const matchedSuburb = allSuburbs?.find(s => 
      s.suburb.toLowerCase() === aiResponse.toLowerCase()
    );
    
    if (matchedSuburb) {
      console.log('[DEBUG] detectSuburb - Successfully matched suburb:', matchedSuburb.suburb);
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