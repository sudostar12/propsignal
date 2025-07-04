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

    // ✅ 1. Validate types and values
    if (typeof uuid !== 'string' || !['positive', 'negative'].includes(feedback)) {
      console.warn('⚠️ Invalid feedback payload:', body);
      return NextResponse.json({ success: false, error: 'Invalid feedback data' }, { status: 400 });
    }

     // ✅ 2. Update feedback in ai_chat_logs table
    const { error } = await supabase
      .from('log_ai_chat')
      .update({
        feedback,
        feedback_timestamp: new Date().toISOString()
      })
      .eq('uuid', uuid);

    if (error) {
      console.error('Supabase update failed:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }
 // ✅ 3. Return success response
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Feedback route error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
// ✅ 4. Optional: Add CORS handler (only if calling from other domains or mobile apps)
export const OPTIONS = async () => {
  return NextResponse.json({}, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};