// src/app/ai-chat/page.tsx
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Check, Copy, ThumbsDown, ThumbsUp, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link'

//import remarkGfm from "remark-gfm";

// ✅ Define the structure for chat messages
type Message = {
  role: "user" | "assistant";
  content: string;
  uuid?: string;
  feedbackGiven?: "positive" | "negative";
};

function AIChatPageInner() {
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
  // ✅ Track if scroll is not at bottom
const [showScrollDown, setShowScrollDown] = useState(false);
const chatContainerRef = useRef<HTMLDivElement | null>(null);
const [copiedUserIndex, setCopiedUserIndex] = useState<number | null>(null) // this is for the user copy button



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

  //to enable toggle arrow for scroll view.
useEffect(() => {
  // Use window scroll detection - works on all devices and screen sizes
  const handleScroll = () => {
    console.log("🌐 WINDOW SCROLL EVENT FIRED!");
    
    // Get page scroll values (not container scroll values)
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = window.innerHeight;
    const scrollDiff = scrollHeight - scrollTop - clientHeight;
    
    // Account for input box height - adjust for mobile if needed
    const inputBoxHeight = 160;
    const buffer = 50;
    const adjustedThreshold = inputBoxHeight + buffer;
    
    const isNearBottom = scrollDiff <= adjustedThreshold;
    
    // Debug logging to see if values change when scrolling
    console.log("🌐 Window Scroll Values:", {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollDiff,
      threshold: adjustedThreshold,
      isNearBottom,
      showScrollDown: !isNearBottom
    });
    
    setShowScrollDown(!isNearBottom);
  };

  // Listen to WINDOW scroll events (not container scroll)
  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Check initial state

  // Cleanup function
  return () => {
    console.log("🧹 Removing window scroll listener");
    window.removeEventListener("scroll", handleScroll);
  };
}, [messages]); // Re-check when messages change



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
    // ✅ Post-process assistantReply to insert line breaks between metrics
    const formattedReply = assistantReply
    .replace(/•\s*/g, "\n- ") // Convert dots to markdown-style list
    .replace(/(?<!\n)-/g, "\n-"); // Ensure each list starts on a new line

    setMessages([...updatedMessages, { role: "assistant", content: formattedReply, uuid: data.uuid }]);
    setSuggestions(data.suggestions || []);
  }

  //chat page view code
  return (
    <div className="w-full min-h-screen flex justify-center relative">

  {/* ✅ New flex-1 wrapper to enable scroll behavior */}
  <div className="flex flex-col w-full max-w-[700px] min-h-screen px-6 pt-16">


   {/* ✅ Sticky Header */}
<div className="fixed top-0 left-0 w-full z-30 bg-white/80 backdrop-blur-md border-gray-200 px-4 py-3">
  <div className="max-w-[700px] mx-auto flex items-center">
  <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#F4F5F5] rounded-[10px] shadow-[0px_1px_3px_rgba(2,130,78,0.06)] text-[#3D4540] text-sm font-medium font-dm-sans hover:bg-gray-50 transition">
  {/* Left Arrow Icon */}
  <ArrowLeft size={16} strokeWidth={2} className="text-[#7D8C83]" />
  Back
</Link>

  </div>
</div>


<div ref={chatContainerRef}
     id="chat-container"
     className="flex-1 px-4 pb-[160px] break-words"
>

        {messages.map((m, i) => (
          <div key={i} className="space-y-1">
            {m.role === "user" ? (
<div className="flex flex-col items-end mb-4">
  {/* ✅ User message bubble */}
  <div className="relative max-w-[600px] bg-[#F0F5F3] text-[#0B3725] px-4 py-3 rounded-[10px] shadow-sm">
    <p className="text-sm font-medium leading-relaxed break-words text-right">
      {m.content}
    </p>
  </div>

  {/* ✅ Copy button placed below, not inside bubble */}
  <button
    onClick={() => {
      navigator.clipboard.writeText(m.content)
      setCopiedUserIndex(i)
      setTimeout(() => setCopiedUserIndex(null), 2000)
    }}
    className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition"
    title="Copy this message"
  >
    {copiedUserIndex === i ? (
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
</div>



            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-start gap-3 pt-4 border-t border-gray-100"
              >
                {/* ✅ AI response with logo */}
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
                {/* ✅ AI response layout */}
                <div className="prose prose-sm max-w-none text-[#3D4540] font-dm-sans break-words">
<ReactMarkdown
  components={{
    h1: ({ children }) => (
      <h1 className="text-base font-semibold text-[#282D2A] mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-semibold text-[#282D2A] mb-3">{children}</h2>
    ),
    p: ({ children }) => (
      <p className="text-m text-[#3D4540] leading-relaxed mt-2 first:mt-0 last:mt-3">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="list-none pl-0 space-y-2 mb-3">{children}</ul> // extra space after list
    ),
li: ({ children }) => (
  <li className="relative pl-5 text-m text-[#3D4540] leading-relaxed mb-1">
    <span className="absolute left-0 top-2 w-1.5 h-1.5 bg-[#28C381] rounded-full" />
    {children}
  </li>
),

    strong: ({ children }) => (
      <strong className="font-semibold text-[#282D2A]">{children}</strong>
    ),
    // Optional: handle <br/> breaks nicely
    br: () => <span className="block h-3" />,
  }}
>
  {m.content}
</ReactMarkdown>


</div>

              </motion.div>
            )}

            {/* ✅ Feedback & Copy Section */}
{m.role === "assistant" && m.uuid && i === messages.length - 1 && (
  <div className="flex items-center gap-3 text-xs text-gray-500 pl-[40px] pt-1">
    {/* ✅ Copy Button */}
    <button
      onClick={() => handleCopy(m.uuid!, m.content)}
      className="flex items-center gap-1 hover:text-blue-600 transition"
      title="Copy this response"
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

    {/* ✅ Feedback */}
    {m.feedbackGiven ? (
      <span className="text-green-600 font-medium">Thanks for the feedback</span>
    ) : (
      <div className="flex items-center gap-2">
        <button
          onClick={() => sendFeedback(m.uuid!, "positive")}
          className="p-1 rounded-full hover:bg-gray-100 transition"
          title="Helpful"
        >
          <ThumbsUp size={18} className="text-gray-600 hover:text-green-600" />
        </button>
        <button
          onClick={() => sendFeedback(m.uuid!, "negative")}
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

        <div ref={bottomRef} />

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(sug)}
                className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-sm font-medium text-[#0B3725] hover:bg-white border border-[#DCE0DE] transition"

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

{/* ✅ Scroll to bottom button */}
{showScrollDown && (
  <button
    onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
    className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50 p-3 rounded-full bg-white border-2 border-gray-300 shadow-lg hover:bg-gray-100 transition-all duration-200 
               md:bottom-32 sm:bottom-28" // Responsive positioning
    title="Scroll to latest"
  >
    {/* Down arrow icon */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5 text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
)}

</div>

     
{/* ✅ Redesigned fixed input box with subtext */}
<div className="w-full fixed bottom-0 px-3 pt-2 pb-[env(safe-area-inset-bottom,1rem)] z-10">

  <div className="max-w-[700px] mx-auto w-full space-y-2">

    {/* Input field */}
    <div className="w-full flex items-center rounded-[10px] bg-white border border-gray-300 px-4 py-6 shadow-sm sm:px-4 sm:py-6">
      <input
        type="text"
        value={input}
        onChange={(e) => {
          const value = e.target.value;
          if (value.length <= MAX_CHARS) setInput(value);
        }}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Ask anything about suburbs, prices, rent, or growth..."
        className="flex-1 text-sm font-medium text-[#3D4540] placeholder:text-gray-400 outline-none bg-white" //bg-white prevents ios/Andriod dark mode from turning it black.
      />
      <span className="text-xs text-gray-400">
        {input.trim().length} / {MAX_CHARS}
      </span>
    <button
  disabled={input.trim().length < 1}
  onClick={() => sendMessage()}
  className={`ml-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
    input.trim().length >= 3
      ? "bg-[#28C381] hover:bg-[#1fa56b]"
      : "bg-[#C5CBC7] opacity-70"
  }`}
>
  <div className="w-[9px] h-[11px] bg-white" />
</button>

    </div>

    {/* Subtext disclaimer */}
    <p className="text-center text-xs text-gray-400">
      AI-generated insights. Always verify important property decisions.
    </p>
  </div>
</div>


    </div>
  );
}
export default function AIChatPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading chat...</div>}>
      <AIChatPageInner />
    </Suspense>
  );
}