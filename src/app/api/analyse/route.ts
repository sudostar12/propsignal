import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { suburb, state } = await req.json();

    if (!suburb || !state) {
      return NextResponse.json({ error: 'Suburb and state are required.' }, { status: 400 });
    }

    const suburbName = suburb.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const stateName = state.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    // 1. Match suburb to LGA
    const { data: suburbEntry, error: suburbError } = await supabase
      .from('lga-to-suburbs')
      .select('*')
      .eq('suburb', suburbName)
      .eq('state', stateName)
      .single();

    if (suburbError || !suburbEntry) {
      return NextResponse.json({ error: 'Suburb not found in database.' }, { status: 404 });
    }

    const lga = suburbEntry.lga;

    // 2. Fetch all related data
    const [crime, prices, insights, income, age, population, projects, rentals, schools] = await Promise.all([
      supabase.from('crime_stats').select('*').eq('lga', lga),
      supabase.from('house_prices').select('*').eq('suburb', suburbName),
      supabase.from('insights').select('*').eq('suburb', suburbName),
      supabase.from('median_income').select('*').eq('suburb', suburbName),
      supabase.from('median_age').select('*').eq('suburb', suburbName),
      supabase.from('population').select('*').eq('suburb', suburbName),
      supabase.from('projects').select('*').eq('lga', lga),
      supabase.from('rentals').select('*').eq('suburb', suburbName),
      supabase.from('schools').select('*').eq('suburb', suburbName),
    ]);

    const combinedData = {
      suburb: suburbName,
      state: stateName,
      lga,
      crime: crime.data ?? [],
      house_prices: prices.data ?? [],
      insights: insights.data ?? [],
      median_income: income.data ?? [],
      median_age: age.data ?? [],
      population: population.data ?? [],
      projects: projects.data ?? [],
      rentals: rentals.data ?? [],
      schools: schools.data ?? [],
    };

    // 3. Ask GPT for insights
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

    const aiMessage = aiResponse.choices[0].message.content;

    return NextResponse.json({ message: aiMessage, rawData: combinedData });

  } catch (err: unknown) {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error('Unexpected error', err);
  }
  return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
}
}
