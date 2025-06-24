'use client';

import { useState } from 'react';

export default function AIChatPage() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi there! Ask me anything about Victorian property.' }]);
  const [input, setInput] = useState("");

  async function handleSend() {
    if (!input) return;
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [...messages, { role: 'user', content: input }] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setMessages(prev => [...prev, { role: 'user', content: input }, { role: 'assistant', content: data.reply }]);
    setInput('');
  }

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">🏡 AI Property Chat</h1>
      <div className="h-96 overflow-y-auto bg-gray-100 p-3 rounded text-sm mb-2">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span>{m.content}</span>
          </div>
        ))}
      </div>
      <input
        className="w-full p-2 border rounded"
        placeholder="Ask about a suburb..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
      />
    </main>
  );
}
