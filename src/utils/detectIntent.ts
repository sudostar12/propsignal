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
          
          If the user says: "What is the median price?" 
          → Ask: "Sure! Which suburb are you interested in?"

          If the user says: "What property types have best yield?"
          → Answer: "Generally, units offer higher yield than houses. Want to check a specific suburb?"
          
          If user says something vague like "show me insights" or "what can you do?" — explain what kind of insights you offer and suggest suburb-specific sample prompts they can try.

          If the user prompt is too vague or generic (e.g. "what can you help with", "show me insights", etc), include a helpful tip section at the end of your reply, like:


💡**Tips to get the best insights:**
- **Ask about a suburb**: "What’s the crime rate in Melton?"
- **Compare suburbs**: "Box Hill vs Doncaster for investment"
- **Get rent or price data**: "Median house price in Tarneit"
- **Check trends**: "Rental yield trend for Point Cook"

          When replying:
          - Use clear, concise sentences.
          - Use **paragraphs** and line breaks to improve readability.
          - Group related ideas together.
          - Avoid long, dense blocks of text.
          - Include a helpful tip at the end of your reply.`
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
