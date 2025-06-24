'use client';

import { useState } from 'react';

export default function AIChatPage() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! Ask me anything about property in Victoria.' }]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input) return;
    const updatedMessages = [...messages, { role: 'user', content: input }];

    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages }),
    });

    const data = await res.json();
    setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    setInput('');
  };

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">💬 AI Property Chat</h1>
      <div className="bg-gray-100 h-96 overflow-y-auto p-4 rounded mb-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={`mb-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            {m.content}
          </div>
        ))}
      </div>
      <input
        className="w-full p-2 border rounded"
        placeholder="Ask about a suburb (e.g. 'Is Werribee a good investment?')"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
      />
    </main>
  );
}
