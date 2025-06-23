import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { buildSuburbPrompt } from '../../../utils/aiPromptBuilder';


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

    const MAX_ITEMS = 25;
    
    // Smart sampling function to get representative data across the full range
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const smartSample = (data: any[], maxItems: number): any[] => {
      if (data.length <= maxItems) return data;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any[] = [];
      
      // Always include the most recent 5 items first
      const recentItems = data.slice(-5);
      result.push(...recentItems);
      
      // Then sample from the rest of the data
      const remainingData = data.slice(0, -5);
      const remainingSlots = maxItems - result.length;
      
      if (remainingData.length > 0 && remainingSlots > 0) {
        const step = Math.floor(remainingData.length / remainingSlots);
        for (let i = 0; i < remainingSlots && i * step < remainingData.length; i++) {
          const index = i * step;
          result.push(remainingData[index]);
        }
      }
      
      // Remove duplicates and return
      const uniqueResult = result.filter((item, index, self) => 
        index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
      );
      
      return uniqueResult.slice(0, maxItems);
    };

    const summarizedData = {
      suburb: combinedData.suburb,
      state: combinedData.state,
      lga: combinedData.lga,
      crime_stats_sample: smartSample(combinedData.crime, MAX_ITEMS),
      house_prices_sample: smartSample(combinedData.house_prices, MAX_ITEMS),
      median_income_sample: smartSample(combinedData.median_income, MAX_ITEMS),
      median_age_sample: smartSample(combinedData.median_age, MAX_ITEMS),
      population_sample: smartSample(combinedData.population, MAX_ITEMS),
      development_projects_sample: smartSample(combinedData.projects, MAX_ITEMS),
      rental_market_sample: smartSample(combinedData.rentals, MAX_ITEMS),
      schools_sample: smartSample(combinedData.schools, MAX_ITEMS),
    };

    console.log('[DEBUG] Summarized data for AI:', JSON.stringify(summarizedData).length, 'chars');

    const prompt = buildSuburbPrompt({
      suburb: suburbName,
      state: stateName,
      lga,
      data: summarizedData,
    });
    
    
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
