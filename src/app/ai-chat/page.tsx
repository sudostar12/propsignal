'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';


type Message = {
  role: 'user' | 'assistant';
  content: string;
  uuid?: string;
  feedbackGiven?: boolean;
};


export default function AIChatPage() {
  const [clarificationCount, setClarificationCount] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi there! I can help you compare suburbs, check investment potential, or understand rental returns in Australia.\n\nYou can start by asking something like:\n- "Compare Box Hill and Doncaster for investment"\n- "What’s the rental yield in Ballarat?"\n- "Is Cranbourne a good family suburb?"',
    },
  ]);
  const [input, setInput] = useState('');
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);
  // 🆕 Feedback handler function
  const sendFeedback = async (uuid: string | undefined, feedback: 'positive' | 'negative') => {
    if (!uuid) return alert('No message to give feedback on.');
  
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ uuid, feedback }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

       // Update feedback state for that message
    setMessages(prev =>
      prev.map(msg =>
        msg.uuid === uuid ? { ...msg, feedbackGiven: true } : msg
      )
    );
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  };
  const handleCopy = (uuid: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedUuid(uuid);
    setTimeout(() => setCopiedUuid(null), 2000);
  };

  async function sendMessage() {
    if (!input.trim()) return;

    // Append the new user message with correct type
    const updatedMessages: Message[] = [
      ...messages,
      { role: 'user' as const, content: input }
    ];
    setMessages(updatedMessages);

    // Call backend api
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages, clarification_count: clarificationCount }),
    });

    const data = await res.json();
    if (data.clarification_count) {
      setClarificationCount(data.clarification_count);
    }
    // Add assistant message with uuid, ensure correct type

const assistantReply = data.reply || data.message || "Sorry, I couldn't process your request. Please try again.";

setMessages([
  ...updatedMessages,
  {
    role: 'assistant',
    content: assistantReply,
    uuid: data.uuid,
  },
]);

    setInput('');
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200">
        <h1 className="text-2xl font-semibold mb-2">💬 PropSignal AI Chat</h1>
        <p className="text-sm text-gray-500 mb-4">
          Ask anything about Australian residential properties: rental yield, property comparisons, family
          suitability, infrastructure and more.
        </p>

        <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-md p-4 text-sm mb-4 space-y-3 border">
          {messages.map((m, i) => (
            <div key={i} className="space-y-1">
              <div
                className={`whitespace-pre-wrap ${
                  m.role === 'user' ? 'text-right text-blue-700' : 'text-left text-gray-700'
                }`}
              >
                {m.content}
              </div>

              {/* 🆕 Show feedback buttons under the most recent assistant message */}
              {m.role === 'assistant' && i === messages.length - 1 && m.uuid && (
         <div className="flex items-center gap-4 text-sm text-gray-500 pl-1 mt-1">
         <button
           onClick={() => handleCopy(m.uuid!, m.content)}
           className="flex items-center hover:text-blue-600 transition"
         >
           {copiedUuid === m.uuid ? (
             <>
               <Check size={16} className="mr-1" /> Copied
             </>
           ) : (
             <>
               <Copy size={16} className="mr-1" /> Copy
             </>
           )}
         </button>

         <div className="h-4 w-px bg-gray-300" />

         {i === messages.length - 1 && (
           <>
             {m.feedbackGiven ? (
               <span className="text-green-600">✅ Feedback recorded</span>
             ) : (
               <>
                 <button onClick={() => sendFeedback(m.uuid!, 'positive')}>👍 Helpful</button>
                 <button onClick={() => sendFeedback(m.uuid!, 'negative')}>👎 Not helpful</button>
               </>
             )}
           </>
         )}
       </div>
     )}
   </div>
 ))}
</div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Compare Box Hill and Doncaster for investment"
            className="flex-1 p-2 border border-gray-300 rounded-md"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
