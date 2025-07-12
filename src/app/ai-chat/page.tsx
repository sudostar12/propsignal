'use client';

import { useState, useRef, useEffect } from 'react';
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
        'Hi there! I can help you get suburbs-specific insights, check investment potential, or understand rental returns in Australia.\n\nYou can start by asking something like:\n- "What are price trends for Doncaster?"\n- "What’s the rental yield in Ballarat?"\n- "Is Cranbourne a good family suburb?"',
    },
  ]);
  const [input, setInput] = useState('');
  const MAX_CHARS = 300;
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null); // ✅ for tracking copied message
  const [isTyping, setIsTyping] = useState(false); //AI typing animation. 
  const [suggestions, setSuggestions] = useState<string[]>([]); // 🆕 suggestions state
  const bottomRef = useRef<HTMLDivElement | null>(null); // 🆕 Ref for auto-scroll

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

 // 🆕 Send suggestion as new message
  const handleSuggestionClick = async (suggestion: string) => {
    console.log('[DEBUG-SUGGESTION] User clicked suggestion:', suggestion);
    setInput(suggestion);
    await sendMessage(suggestion);
  };

  async function sendMessage(msg?: string) {
    const messageToSend = msg || input;
    if (!messageToSend.trim()) return;

    const updatedMessages: Message[] = [...messages, { role: 'user', content: messageToSend }];
    setMessages(updatedMessages);

    // ✅ Clear input immediately after adding user message
    setInput(''); 
    
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
    // 🆕 Update suggestions from backend
    setSuggestions(data.suggestions || []);
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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.1, ease: 'easeOut', delay: 0.1 * i }}
        className="flex justify-start"
      >
        <div className="bg-white text-gray-800 px-4 py-2 rounded-2xl shadow-sm w-full whitespace-pre-wrap">
          {m.content}
        </div>
      </motion.div>
    ) : (
      <div className="flex justify-end">
        <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-2xl shadow-sm max-w-xs md:max-w-md whitespace-pre-wrap">
          {m.content}
        </div>
      </div>
    )}

    {/* Feedback + Copy Buttons only on latest assistant message */}
    {m.role === 'assistant' && m.uuid && i === messages.length - 1 && (
      <div className="flex items-center gap-4 text-sm text-gray-500 pl-1 mt-1">
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

        <div className="h-4 w-px bg-gray-300" />

        {m.feedbackGiven ? (
          <span className="text-green-600">✅ Feedback recorded</span> //change this to a more subtle tone. 
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
        )}
      </div>
    )}
  </div>
))}

            {/* 🆕 Scroll anchor to keep view on latest */}
  <div ref={bottomRef} />
        </div>    

        {/* 🆕 Suggestions Buttons Block */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(sug)}
                className="px-3 py-1 text-xs bg-gray-100 border border-gray-300 rounded-full hover:bg-blue-100 transition"
              >
                {sug}
              </button>
            ))}
          </div>
        )}


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
          placeholder="e.g. Show me price trends for Doncaster"
          className="flex-1 px-4 py-2 rounded-full border border-gray-300 bg-white/80 backdrop-blur-sm shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
          value={input}
          onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) {
          setInput(e.target.value);
          }
        }}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          maxLength={MAX_CHARS}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim()}
          className={`px-4 py-2 rounded-md transition ${
          !input.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Send
        </button>
        <div className="flex justify-end text-xs text-gray-500 mt-1">
  {input.trim().length} / {MAX_CHARS} characters
</div>

      </div>
    </div>
  </main>
);
}
