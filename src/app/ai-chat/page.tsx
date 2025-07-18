// src/app/ai-chat/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// ✅ Define the structure for chat messages
type Message = {
  role: "user" | "assistant";
  content: string;
  uuid?: string;
  feedbackGiven?: "positive" | "negative";
};


export default function AIChatPage() {
  const MAX_CHARS = 300;
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") || "";
  const router = useRouter();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; uuid?: string; feedbackGiven?: "positive" | "negative"; }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [clarificationCount, setClarificationCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      sendMessage(initialQuery);
      const newUrl = "/ai-chat";
      router.replace(newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendFeedback = async (uuid: string | undefined, feedback: "positive" | "negative") => {
    if (!uuid) return;
    await fetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ uuid, feedback }),
      headers: { "Content-Type": "application/json" },
    });
    setMessages((prev) => prev.map((msg) => (msg.uuid === uuid ? { ...msg, feedbackGiven: feedback } : msg)));
  };

  const handleCopy = (uuid: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedUuid(uuid);
    setTimeout(() => setCopiedUuid(null), 2000);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInput(suggestion);
    await sendMessage(suggestion);
  };

  async function sendMessage(msg?: string) {
    const messageToSend = msg || input;
    if (!messageToSend.trim()) return;

    const updatedMessages: Message [] = [...messages, { role: "user", content: messageToSend }];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updatedMessages, clarification_count: clarificationCount }),
    });

    const data = await res.json();
    setIsTyping(false);
    if (data.clarification_count) setClarificationCount(data.clarification_count);

    const assistantReply = data.reply || data.message || "Sorry, I couldn't process your request.";
    setMessages([...updatedMessages, { role: "assistant", content: assistantReply, uuid: data.uuid }]);
    setSuggestions(data.suggestions || []);
  }

  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center gap-4 px-6 py-4">
      <div className="self-start">
        <button className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 shadow-sm">
          <svg width="16" height="16" fill="#7D8C83">
            <rect x="2.17" y="3.5" width="11.67" height="9" />
          </svg>
          <span className="text-sm font-medium text-[#3D4540]">Back</span>
        </button>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-6 flex-grow">
        {messages.map((m, i) => (
          <div key={i} className="space-y-1">
            {m.role === "user" ? (
              <div className="self-end max-w-[600px] bg-[#F4F5F5] px-3 py-2 rounded-lg text-right text-[#3D4540] text-sm font-medium">
                {m.content}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-start gap-3 pt-1 pb-2"
              >
                {/* ✅ Figma-style AI response layout with logo */}
                <div className="p-[1.6px] rounded-[7.17px] border border-white bg-[linear-gradient(149deg,rgba(255,255,255,0.5)_0%,rgba(39,166,193,0.05)_41%,rgba(39,166,193,0.14)_100%)] shadow-[24px_24px_40px_rgba(24,61,130,0.1)] backdrop-blur-[4.8px]">
                  <div className="w-[28.8px] h-[28.8px] bg-gradient-to-b from-[#28C381] to-[#27A4C8] rounded-[8px] flex items-center justify-center">
                    <Image
                      src="/PropSignal-logo.svg"
                      alt="PropSignal Logo"
                      width={25}
                      height={25}
                    />
                  </div>
                </div>
                <div className="bg-white shadow-md rounded-xl px-4 py-3 text-[#3D4540] font-dm-sans text-sm max-w-[800px] leading-relaxed whitespace-pre-line">
                  {m.content}
                </div>
              </motion.div>
            )}

            {/* ✅ Feedback & Copy Section */}
            {m.role === "assistant" && m.uuid && i === messages.length - 1 && (
  <div className="flex items-center gap-4 text-xs text-gray-500 pl-[40px] mt-1">
    <button
      onClick={() => handleCopy(m.uuid!, m.content)}
      className="flex items-center gap-1 hover:text-blue-600"
    >
      {copiedUuid === m.uuid ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
    </button>
    <span className="text-gray-300">|</span>
    {m.feedbackGiven ? (
      <span className="text-green-500">Feedback recorded</span>
    ) : (
      <>
        <button onClick={() => sendFeedback(m.uuid!, "positive")} className="hover:text-green-600">
          <ThumbsUp size={16} />
        </button>
        <button onClick={() => sendFeedback(m.uuid!, "negative")} className="hover:text-red-600">
          <ThumbsDown size={16} />
        </button>
      </>
    )}
  </div>
)}

          </div>
        ))}

        <div ref={bottomRef} />

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(sug)}
                className="px-3 py-1 rounded-full bg-gray-100 text-sm hover:bg-teal-50 border"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

{isTyping && (
  <div className="text-sm flex items-center gap-2 pl-2 mb-3 animate-pulse">
    <span className="w-2 h-2 bg-gradient-to-r from-[#07985A] to-[#0F708C] rounded-full animate-bounce"></span>
    <span className="bg-gradient-to-r from-[#07985A] to-[#0F708C] bg-clip-text text-transparent font-medium">
      Analyzing...
    </span>
  </div>
)}

      </div>

      <div className="w-full max-w-2xl px-4 py-3 bg-white border border-gray-200 shadow-md rounded-xl flex items-center justify-between">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= MAX_CHARS) setInput(value);
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask me anything..."
          className="w-full flex-1 outline-none text-sm font-medium text-[#68756D] placeholder:text-gray-400"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {input.trim().length} / {MAX_CHARS}
          </span>
          <button
            disabled={!input.trim()}
            onClick={() => sendMessage()}
            className="w-6 h-6 rounded-full bg-[#C5CBC7] flex items-center justify-center disabled:opacity-50"
          >
            <div className="w-[9px] h-[11px] bg-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
