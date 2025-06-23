import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET() {
  return NextResponse.json({ ok: true, msg: "API is alive" });
}


export async function POST(req: NextRequest) {
  try {
    const { suburb } = await req.json();
    console.log('[DEBUG] Raw input:', { suburb });

    if (!suburb) {
      return NextResponse.json({ error: 'Suburb is required.' }, { status: 400 });
    }

    const suburbName = suburb.trim().toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
    console.log('[DEBUG] Normalized suburb:', suburbName);

    const { data, error } = await supabase
      .from('suburbs')
      .select('*')
      .ilike('suburb', suburbName)
      .limit(5);

    console.log('[DEBUG] Supabase response:', { data, error });

    if (!data || data.length === 0) {
      console.warn('[WARN] Suburb not found in database:', suburbName);
      return NextResponse.json({ error: 'Suburb not found in database.' }, { status: 404 });
    }

    const suburbEntry = data[0];
    const lga = suburbEntry.lga;
    const stateName = suburbEntry.state;

    console.log('[DEBUG] Found match:', { suburbName, lga, stateName });
  

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tryFetch = async (query: any) => {
      try {
        // Supabase client returns an object with a `data` property on success
        const { data, error } = await query;
        if (error) {
          // Log the specific error from Supabase but don't crash
          console.warn('[WARN] Supabase query failed:', error);
          return [];
        }
        return data ?? [];
      } catch (err) {
        // Catch network or other unexpected errors during the fetch
        console.warn('[WARN] Fetch execution failed:', err);
        return [];
      }
    };

    // Fetch all related data safely
    const [
      crime,
      prices,
      income,
      age,
      population,
      projects,
      rentals,
      schools,
    ] = await Promise.all([
      tryFetch(supabase.from('crime_stats').select('*').ilike('suburb', `%${suburbName}%`)),
      tryFetch(supabase.from('house_prices').select('*').ilike('suburb', `%${suburbName}%`)),
      tryFetch(supabase.from('median_income').select('*').ilike('lga', `%${lga}%`)),
      tryFetch(supabase.from('median_age').select('*').ilike('lga', `%${lga}%`)),
      tryFetch(supabase.from('population').select('*').ilike('lga', `%${lga}%`)),
      tryFetch(supabase.from('projects').select('*').ilike('lga', `%${lga}%`)),
      tryFetch(supabase.from('rentals').select('*').ilike('lga', `%${lga}%`)),
      tryFetch(supabase.from('schools').select('*').ilike('suburb', `%${suburbName}%`)),
    ]);

    console.log('[DEBUG] Crime data rows:', crime.length);
    console.log('[DEBUG] Rentals data rows:', rentals.length);
    console.log('[DEBUG] Projects data rows:', projects.length);
    console.log('[DEBUG] Schools data rows:', schools.length);
    console.log('[DEBUG] Population data rows:', population.length);
    console.log('[DEBUG] Income data rows:', income.length);
    console.log('[DEBUG] Age data rows:', age.length);
    console.log('[DEBUG] House prices data rows:', prices.length);
    console.log('[DEBUG] LGA being used for lookups:', lga);
    console.log('SuburbName:', JSON.stringify(suburbName));


    const combinedData = {
      suburb: suburbName,
      state: stateName,
      lga,
      crime: crime,
      house_prices: prices,
      median_income: income,
      median_age: age,
      population: population,
      projects: projects,
      rentals: rentals,
      schools: schools,
    };

    console.log('[DEBUG] Combined data ready, calling OpenAI...');

    const MAX_ITEMS = 15;
    const summarizedData = {
      suburb: combinedData.suburb,
      state: combinedData.state,
      lga: combinedData.lga,
      crime_stats_sample: combinedData.crime.slice(0, MAX_ITEMS),
      house_prices_sample: combinedData.house_prices.slice(0, MAX_ITEMS),
      median_income_sample: combinedData.median_income.slice(0, MAX_ITEMS),
      median_age_sample: combinedData.median_age.slice(0, MAX_ITEMS),
      population_sample: combinedData.population.slice(0, MAX_ITEMS),
      development_projects_sample: combinedData.projects.slice(0, MAX_ITEMS),
      rental_market_sample: combinedData.rentals.slice(0, MAX_ITEMS),
      schools_sample: combinedData.schools.slice(0, MAX_ITEMS),
    };

    console.log('[DEBUG] Summarized data for AI:', JSON.stringify(summarizedData).length, 'chars');

    const prompt = `
You are a real estate investment analyst. Provide an investment overview and commentary for the following suburb in ${stateName}:

Suburb: ${suburbName}
LGA: ${lga}

Data:
${JSON.stringify(summarizedData)}

Output should include:
- Summary of current investment landscape
- Key demographic or rental trends
- Any notable risks or development opportunities
- Overall growth outlook
    `.trim();
    
    console.log('[DEBUG] OpenAI prompt:\n', prompt);


    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const aiMessage = aiResponse.choices[0]?.message?.content ?? '';
    console.log('[DEBUG] OpenAI response (first 100 chars):', aiMessage.slice(0, 100));

    return NextResponse.json({ message: aiMessage, rawData: combinedData });

  } catch (err: unknown) {
    console.error('[ERROR] API crashed:', err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
