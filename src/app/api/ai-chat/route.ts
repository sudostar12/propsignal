import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages } = body;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `
You are PropSignal AI, a professional buyer’s agent assistant helping users with residential property insights in Victoria, Australia.

Your job is to provide structured, practical responses based on:
- Median house price
- Rental yield
- Vacancy rate
- Investment potential
- Infrastructure projects
- Demographic growth

If the user input is vague (e.g. types "comparison" or "advice"), respond with a friendly clarifying question. For example:

"Could you clarify which two suburbs you'd like to compare? Also, are you looking at them for investment, a family home, or maybe a renovation project? Each purpose will shift the criteria we focus on. Let me know, and we can dive into the specifics!"

Always encourage better questions by giving example prompts when needed.

Keep responses clear, semi-formal, and insightful.
        `.trim(),
      },
      ...messages,
    ],
  });

  return NextResponse.json({ reply: completion.choices[0].message.content });
}
