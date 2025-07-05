//utils/detectIntent.ts

import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function detectUserIntent(userInput: string): Promise<'invest' | 'live' | 'rent' | 'unsure'> {
  try {
    const intentDetection = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a property assistant. Classify user intent as one of:
          - "invest"
          - "live"
          - "rent"
          - "unsure"
          Return only one word.`
        },
        {
          role: 'user',
          content: userInput
        }
      ]
    });

    const raw_intent = intentDetection.choices[0].message.content?.toLowerCase().trim();
    return ['invest', 'live', 'rent', 'unsure'].includes(raw_intent || '') ? raw_intent! as any : 'unsure';
  } catch (error) {
    console.error('Intent detection failed:', error);
    return 'unsure';
  }
}
