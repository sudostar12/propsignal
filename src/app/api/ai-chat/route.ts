// src/app/api/ai-chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';
import { detectUserIntent } from '@/utils/detectIntent';
import { detectSuburb } from '@/utils/detectSuburb';
import { AIChatPrompt } from '@/utils/AIChatPrompt';
import {
  fetchMedianPrice,
  fetchDemographics,
  fetchPopulation,
  fetchRentals,
  fetchProjects,
  fetchCrime,
  fetchHouseholdForecast,
} from '@/utils/fetchSuburbData';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Simple health‐check
export async function GET() {
  return NextResponse.json({ ok: true, msg: 'API is alive' });
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const userInput = messages?.[messages.length - 1]?.content || '';
    console.log('[DEBUG] Raw user input:', userInput);

    // 1️⃣ Intent detection
    const detected_intent = await detectUserIntent(userInput);
    console.log('[DEBUG] Detected intent:', detected_intent);

    // 2️⃣ AI-powered suburb detection with fuzzy matching
    const suburbDetection = await detectSuburb(userInput);
    console.log('[DEBUG] AI suburb detection result:', suburbDetection);
    
    if (!suburbDetection.possible_suburb) {
      console.warn('[WARN] No suburb detected from input');
      return NextResponse.json(
        { error: 'I couldn\'t identify a specific suburb from your message. Could you please mention the suburb or area you\'re interested in?' },
        { status: 400 }
      );
    }
    
    const suburb = suburbDetection.possible_suburb;
    const lga = suburbDetection.lga;
    const state = suburbDetection.state;
    
    console.log('[DEBUG] Using detected suburb:', suburb, 'LGA:', lga, 'State:', state);

    // 3️⃣ Double-check suburb exists in database (redundant but safe)
    const { data: suburbVerification, error: verificationError } = await supabase
      .from('lga_suburbs')
      .select('lga, state')
      .eq('suburb', suburb)
      .limit(1);

    if (verificationError) {
      console.error('[ERROR] Suburb verification error:', verificationError);
      return NextResponse.json(
        { error: 'Error verifying suburb data.' },
        { status: 500 }
      );
    }

    if (!suburbVerification || suburbVerification.length === 0) {
      console.error('[ERROR] Suburb not found in database after AI detection:', suburb);
      return NextResponse.json(
        { error: 'I detected a suburb but couldn\'t find it in our database. Please try again with a different suburb.' },
        { status: 404 }
      );
    }

    // Use the verified data
    const finalLga = suburbVerification[0].lga;
    const finalState = suburbVerification[0].state;
    console.log('[DEBUG] Final verified suburb data - LGA:', finalLga, 'State:', finalState);

    // 4️⃣ Fetch all related datasets in parallel
    console.log('[DEBUG] Fetching datasets for suburb:', suburb);
    // Temp log //


// 🔍 DEBUG: Check what suburbs exist in each table
console.log('[DEBUG] Checking database for suburb matches...');

// Check median_price table
const { data: debugPrices, error: debugPricesError } = await supabase
  .from('median_price') // Replace with your actual table name
  .select('*')
  .ilike('suburb', `%${suburb}%`) // Case-insensitive partial match
  .limit(5);
console.log('[DEBUG] Median price table - sample data:', debugPrices, 'Error:', debugPricesError);

// Check demographics table  
const { data: debugDemo, error: debugDemoError } = await supabase
  .from('sa2_demographics') // Replace with your actual table name
  .select('*')
  .ilike('SA2Name', `%${suburb}%`)
  .limit(5);
console.log('[DEBUG] Demographics table - sample data:', debugDemo, 'Error:', debugDemoError);

    const [
      priceData,
      demographics,
      population,
      rentals,
      projects,
      crime,
      householdForecast,
    ] = await Promise.all([
      fetchMedianPrice(suburb),
      fetchDemographics(suburb),
      fetchPopulation(suburb),
      fetchRentals(finalLga),
      fetchProjects(finalLga),
      fetchCrime(suburb),
      fetchHouseholdForecast(suburb)
    ]);
    
    console.log('[DEBUG] Datasets fetched successfully:', {
      priceCount: priceData.data?.length || 0,
      demoCount: demographics.data?.length || 0,
      popCount: population.data?.length || 0,
      rentCount: rentals.data?.length || 0,
      projCount: projects.data?.length || 0,
      crimeCount: crime.data?.length || 0,
      forecastCount: householdForecast.data?.length || 0,
    });

    // ADD THIS DEBUG CODE TO SEE WHAT'S IN CRIME DATA
    console.log('[DEBUG] Raw crime data from fetch:', crime.data);
    console.log('[DEBUG] Crime data type:', typeof crime.data);
    console.log('[DEBUG] Is crime data array?', Array.isArray(crime.data)); 

    // 5️⃣ Build AI prompt
    const prompt = AIChatPrompt(suburb, detected_intent, {
      house_prices: priceData.data ?? [],
      demographics: demographics.data ?? [],
      population: population.data ?? [],
      rentals: rentals.data ?? [],
      projects: projects.data ?? [],
      crime: crime.data ?? [],
      household_forecast: householdForecast.data ?? [],
    }, finalLga, finalState);
    console.log('[DEBUG] AI prompt length:', prompt.length, 'characters');

    // 6️⃣ Call OpenAI for final response
    console.log('[DEBUG] Calling OpenAI for final response');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [{ role: 'system', content: prompt }, ...messages],
    });
    
    const AIResponse = completion.choices[0]?.message?.content || '';
    console.log('[DEBUG] AI response generated, length:', AIResponse.length, 'characters');

    // 7️⃣ Log the conversation
    console.log('[DEBUG] Logging conversation to database');
    const { data: logData, error: logError } = await supabase
      .from('log_ai_chat')
      .insert({
        userInput,
        AIResponse,
        intent: detected_intent,
        suburb,
        isVague: detected_intent === 'unsure',
        confidence: suburbDetection.confidence,
        lga: finalLga,
        state: finalState,
      })
      .select('uuid');
      
    if (logError) {
      console.error('[ERROR] Logging failed:', logError);
    } else {
      console.log('[DEBUG] Conversation logged successfully, UUID:', logData?.[0]?.uuid);
    }

    // 8️⃣ Return to client
    return NextResponse.json({
      reply: AIResponse,
      uuid: logData?.[0]?.uuid ?? null,
      detectedSuburb: suburb,
      confidence: suburbDetection.confidence,
    });
    
  } catch (err) {
    console.error('[ERROR] /api/ai-chat crashed with error:', err);
    return NextResponse.json(
      { error: 'Sorry, something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}