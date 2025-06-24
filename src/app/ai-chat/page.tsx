'use client';

import { useState } from 'react';

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I can help you compare suburbs, check investment potential, or understand rental returns in Victoria.\n\nYou can start by asking something like:\n- "Compare Werribee and Point Cook for investment"\n- "What’s the rental yield in Ballarat?"\n- "Is Cranbourne a good family suburb?"' }
  ]);
  const [input, setInput] = useState('');

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
    setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    setInput('');
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200">
        <h1 className="text-2xl font-semibold mb-2">💬 PropSignal AI Chat</h1>
        <p className="text-sm text-gray-500 mb-4">Ask anything about Victorian suburbs: rental yield, property comparisons, family suitability, infrastructure and more.</p>

        <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-md p-4 text-sm mb-4 space-y-3 border">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap ${
                m.role === 'user' ? 'text-right text-blue-700' : 'text-left text-gray-700'
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Compare Werribee and Tarneit for investment"
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
