'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  uuid?: string;
};


export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi there! I can help you compare suburbs, check investment potential, or understand rental returns in Australia.\n\nYou can start by asking something like:\n- "Compare Box Hill and Doncaster for investment"\n- "What’s the rental yield in Ballarat?"\n- "Is Cranbourne a good family suburb?"',
    },
  ]);
  const [input, setInput] = useState('');

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
      alert('Thanks for your feedback!');
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  };
  

  async function sendMessage() {
    if (!input.trim()) return;

    const updatedMessages = [...messages, { role: 'user', content: input }];
    setMessages(updatedMessages);

    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages }),
    });

    const data = await res.json();
    setMessages([
      ...updatedMessages,
      {
        role: 'assistant',
        content: data.reply,
        // TODO: Return and include uuid from your API in this message object
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
              {m.role === 'assistant' && i === messages.length - 1 && (
                <div className="flex gap-3 text-sm text-gray-400 pl-1 mt-1">
                  <button onClick={() => sendFeedback(m.uuid, 'positive')}>👍 Helpful</button>
                  <button onClick={() => sendFeedback(m.uuid, 'negative')}>👎 Not helpful</button>
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
