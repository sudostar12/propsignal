import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages } = body;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a helpful buyer’s agent AI. Provide property insights for Victorian suburbs including prices, yield, rent, and investment outlook.`,
      },
      ...messages,
    ],
  });

  return NextResponse.json({ reply: completion.choices[0].message.content });
}
