import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { suburb, state } = await req.json();
    console.log('[DEBUG] Raw input:', { suburb, state });

    if (!suburb || !state) {
      return NextResponse.json({ error: 'Suburb and state are required.' }, { status: 400 });
    }

    const suburbName = suburb.trim().toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());

    const STATE_MAP: Record<string, string> = {
      VIC: 'Vic',
      NSW: 'Nsw',
      QLD: 'Qld',
      SA: 'Sa',
      WA: 'Wa',
      TAS: 'Tas',
      ACT: 'Act',
      NT: 'Nt',
    };
    const stateName = STATE_MAP[state.trim().toUpperCase()] ?? state.trim();

    console.log('[DEBUG] Normalized input:', { suburbName, stateName });

    const { data } = await supabase
      .from('lga-to-suburbs')
      .select('*')
      .ilike('suburb', suburbName)
      .eq('state', stateName)
      .limit(5);

    console.log('[DEBUG] Supabase suburb query result:', data);

    if (!data || data.length === 0) {
      console.warn('[WARN] Suburb not found in database:', { suburbName, stateName });
      return NextResponse.json({
        error: 'Suburb not found in database.',
        tried: { suburbName, stateName }
      }, { status: 404 });
    }

    const suburbEntry = data[0];
    const lga = suburbEntry.lga;
    console.log('[DEBUG] LGA found:', lga);

    // Fetch all related data
    const [crime, prices, income, age, population, projects, rentals, schools] = await Promise.all([
      supabase.from('crime_stats').select('*').eq('suburb', suburbName),
      supabase.from('house_prices').select('*').eq('suburb', suburbName),
      supabase.from('median_income').select('*').eq('lga', lga),
      supabase.from('median_age').select('*').eq('lga', lga),
      supabase.from('population').select('*').eq('lga', lga),
      supabase.from('projects').select('*').eq('lga', lga),
      supabase.from('rentals').select('*').eq('lga', lga),
      supabase.from('schools').select('*').eq('suburb', suburbName),
    ]);

    const combinedData = {
      suburb: suburbName,
      state: stateName,
      lga,
      crime: crime?.data ?? [],
      house_prices: prices?.data ?? [],
      median_income: income?.data ?? [],
      median_age: age?.data ?? [],
      population: population?.data ?? [],
      projects: projects?.data ?? [],
      rentals: rentals?.data ?? [],
      schools: schools?.data ?? [],
    };

    console.log('[DEBUG] Combined data ready, calling OpenAI...');

    const prompt = `
You are a real estate investment analyst. Provide an investment overview and commentary for the following suburb in ${stateName}:

Suburb: ${suburbName}
LGA: ${lga}

Data:
${JSON.stringify(combinedData, null, 2)}

Output should include:
- Summary of current investment landscape
- Key demographic or rental trends
- Any notable risks or development opportunities
- Overall growth outlook
    `.trim();

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4',
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
