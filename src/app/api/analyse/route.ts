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

    const suburbName = suburb.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

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

    // Query Supabase
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
    const lga = suburbEntry.lga
