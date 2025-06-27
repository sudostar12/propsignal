'use client';

import { useState } from 'react';
import { Check, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion } from 'framer-motion';


type Message = {
  role: 'user' | 'assistant';
  content: string;
  uuid?: string;
  feedbackGiven?: 'positive' | 'negative';
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
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null); // ✅ for tracking copied message
  const [isTyping, setIsTyping] = useState(false); //AI typing animation. 
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

       // Update message feedback
    setMessages(prev =>
      prev.map(msg =>
        msg.uuid === uuid ? { ...msg, feedbackGiven: feedback as 'positive' | 'negative' } : msg
      )
    );
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  };
    // ✅ Copy to clipboard handler
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
      { role: 'user', content: input }
    ];
    setMessages(updatedMessages);

    
    setIsTyping(true); // before fetch
    // Call backend api
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages, clarification_count: clarificationCount }),
    });

    const data = await res.json();
    setIsTyping(false); // after fetch

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
{/* 🚀 Differentiator Highlight */}
<div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 text-blue-900 text-sm rounded-xl p-4 shadow-sm mb-4">

<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  
>
<p className="font-medium flex items-center gap-2">
  <span>🚀 Why PropSignal AI?</span>
  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Smart Engine</span>
</p>

  <ul className="list-disc list-inside text-sm mt-1 space-y-1">
    <li>📍 Analyses real sales, rental, and planning data — suburb by suburb</li>
    <li>📈 Scores suburbs using a unique growth & yield model tailored for buyers and investors</li>
    <li>🔎 Detects untapped trends and emerging segments that traditional analysis ignores.</li>
  </ul>

</motion.div>
</div>

        <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-md p-4 text-sm mb-4 space-y-3 border">
          {messages.map((m, i) => (
            <div key={i} className="space-y-1">
              {m.role === 'assistant' ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="text-left text-gray-700 whitespace-pre-wrap"
                >
                  {m.content}
                </motion.div>
              ) : (
                <div className="text-right text-blue-700 whitespace-pre-wrap">
                  {m.content}
                </div>
              )}
              {/* Feedback and copy logic remains outside, shown only for assistant messages */}
              {m.role === 'assistant' && m.uuid && i === messages.length - 1 && (
                <div className="flex items-center gap-4 text-sm text-gray-500 pl-1 mt-1">
                  {/* Copy and feedback buttons here... */}
                  <button
                    onClick={() => handleCopy(m.uuid!, m.content)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
                  >
                    {copiedUuid === m.uuid ? (
                      <>
                        <Check size={16} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>


                  {/* Divider */}
                  <div className="h-4 w-px bg-gray-300" />

                  {/* ✅ Feedback Buttons – only show on latest assistant msg */}
                  {i === messages.length - 1 ? (
                    m.feedbackGiven ? (
                      <span className="text-green-600">✅ Feedback recorded</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendFeedback(m.uuid!, 'positive')}
                          className="p-1 rounded-full hover:bg-gray-100 transition"
                          title="Helpful"
                        >
                          <ThumbsUp size={18} className="text-gray-600 hover:text-green-600" />
                        </button>
                        <button
                          onClick={() => sendFeedback(m.uuid!, 'negative')}
                          className="p-1 rounded-full hover:bg-gray-100 transition"
                          title="Not helpful"
                        >
                          <ThumbsDown size={18} className="text-gray-600 hover:text-red-500" />
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>    

{/* Message Input */}
      {/* 👈 closing tag for messages container */}

      {isTyping && (
        <div className="text-sm text-gray-500 flex items-center gap-2 pl-2 mb-3 animate-pulse">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
          Analysing...
        </div>
      )}
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
