"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

// ✅ Message type definition
type Message = {
  role: "user" | "assistant";
  content: string;
  uuid?: string;
  feedbackGiven?: "positive" | "negative";
};

function ChatAppWrapper() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") || "";

  const MAX_CHARS = 300;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [clarificationCount, setClarificationCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Trigger first message automatically from URL query param
  useEffect(() => {
    if (
      initialQuery &&
      messages.length === 0
    ) {
      sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(msg?: string) {
    const messageToSend = msg || input;
    if (!messageToSend.trim()) return;

    const updatedMessages: Message[] = [...messages, { role: "user", content: messageToSend }];
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
    setMessages([
      ...updatedMessages,
      { role: "assistant", content: assistantReply, uuid: data.uuid },
    ]);
    setSuggestions(data.suggestions || []);
  }

  const sendFeedback = async (uuid: string | undefined, feedback: "positive" | "negative") => {
    if (!uuid) return;
    await fetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ uuid, feedback }),
      headers: { "Content-Type": "application/json" },
    });
    setMessages((prev) =>
      prev.map((msg) => (msg.uuid === uuid ? { ...msg, feedbackGiven: feedback } : msg))
    );
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

  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center gap-4 px-6 py-4">
      <div className="w-full max-w-2xl flex flex-col gap-6 flex-grow">
        {/* Chat messages */}
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
                className="flex gap-2 items-start"
              >
                <div className="w-7 h-7 bg-gradient-to-b from-[#28C381] to-[#27A4C8] rounded-md flex items-center justify-center">
                  <div className="w-[18px] h-[21px] bg-white" />
                </div>
                <div className="bg-white shadow-md rounded-lg px-4 py-2 text-sm text-[#3D4540]">
                  {m.content}
                </div>
              </motion.div>
            )}

            {/* Copy + Feedback */}
            {m.role === "assistant" && m.uuid && i === messages.length - 1 && (
              <div className="flex items-center gap-4 text-xs text-gray-500">
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

        {/* Suggestions */}
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

        {/* Typing Indicator */}
        {isTyping && (
          <div className="text-sm text-gray-500 animate-pulse">Analyzing...</div>
        )}
      </div>

      {/* Message Input */}
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

export default function AIChatPage() {
  return (
    <Suspense fallback={<div className="p-10 text-gray-400 text-sm">Loading chat...</div>}>
      <ChatAppWrapper />
    </Suspense>
  );
}
