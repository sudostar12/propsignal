import OpenAI from 'openai';
//import { analyzeUserQuestion } from '@/utils/questionAnalyzer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateGeneralReply(messages: ChatMessage[], topic:string): Promise<string> {
  try {
    console.log('[DEBUG detectIntent] - AI fallback to general response for topic:', topic);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a friendly, helpful Australian property AI assistant. You should respond naturally and conversationally based on the user's messages so far. 
            
          Current user topic: ${topic}
          If they ask about what you can do, explain your capabilities. 
          If they ask about investing, explain investment insights. 
          If they ask about living or lifestyle, give lifestyle advice. 
          If they ask about renting, talk about rental considerations. 
          If they switch context, respond contextually — do not repeat yourself exactly.
          
          When replying:
          - Use clear, concise sentences.
          - Use **paragraphs** and line breaks to improve readability.
          - Group related ideas together.
          - Avoid long, dense blocks of text.`
        },
        ...messages
      ]
    });

    return completion.choices[0].message.content?.trim() || "I'm here to help with all your property questions!";
  } catch (error) {
    console.error('AI reply generation failed:', error);
    return "Sorry, I'm having trouble generating a response right now. Please try again.";
  }
}
