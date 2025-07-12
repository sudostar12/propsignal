import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/* - This is likely not used. questionAnalyzer.ts is used instead. Test and delete this code block if not required. - 11/07

export type UserIntent = 'invest' | 'live' | 'rent' | 'suburb' | 'help' | 'unsure'; 

export async function detectUserIntent(userInput: string): Promise<UserIntent> {
  console.log('[DEBUG detectIntent] - Detecting user intent based on input');
  try {
    const intentDetection = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a property assistant. Classify user intent as one of:
- "invest" => when user asks about investing in property or investment strategy.
- "live" => when user asks about living, lifestyle, moving in, schools, safety, or community.
- "rent" => when user asks about renting or rental insights.
- "suburb" => when user mentions or asks for specific suburb information or comparisons.
- "help" => when user asks what you can do, your services, or general assistance.
- "unsure" => when you cannot clearly classify.

Return only one word exactly as listed above. No explanation.`
        },
        {
          role: 'user',
          content: userInput
        }
      ]
    });

    const raw_intent = intentDetection.choices[0].message.content?.toLowerCase().trim();
    const validIntents: UserIntent[] = ['invest', 'live', 'rent', 'suburb', 'help', 'unsure'];

    return validIntents.includes(raw_intent as UserIntent) ? raw_intent as UserIntent : 'unsure';
  } catch (error) {
    console.error('Intent detection failed:', error);
    return 'unsure';
  }
}
*/
// ✅ 
export async function generateGeneralReply(messages: ChatMessage[], detectedIntent:string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a friendly, helpful Australian property AI assistant. You should respond naturally and conversationally based on the user's messages so far. 
          
          Current user intent: ${detectedIntent}  
          If they ask about what you can do, explain your capabilities. 
          If they ask about investing, explain investment insights. 
          If they ask about living or lifestyle, give lifestyle advice. 
          If they ask about renting, talk about rental considerations. 
          If they switch context, respond contextually — do not repeat yourself exactly.`
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
