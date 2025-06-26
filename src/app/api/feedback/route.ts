// src/app/api/feedback/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * Handles POST requests to log feedback (👍 or 👎) for a previous AI chat.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { uuid, feedback } = body;

    // Validate input
    if (!uuid || !['positive', 'negative'].includes(feedback)) {
      return NextResponse.json({ success: false, error: 'Invalid feedback data' }, { status: 400 });
    }

    // Update feedback in ai_chat_logs table
    const { error } = await supabase
      .from('ai_chat_logs')
      .update({
        feedback,
        feedback_timestamp: new Date().toISOString()
      })
      .eq('uuid', uuid);

    if (error) {
      console.error('Supabase update failed:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Feedback route error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
