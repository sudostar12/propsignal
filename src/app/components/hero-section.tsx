"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { GraphUpIcon } from "@/app/components/ui/custom-icons"
import { UsersGroupIcon } from "@/app/components/ui/icon-userGroup"
import { ChatMoneyIcon } from "@/app/components/ui/icon-chatMoney"
import { useRouter } from 'next/navigation';
import { ArrowUp } from "lucide-react";



export function HeroSection() {
  const [query, setQuery] = useState("")
  const router = useRouter();
  
   const handleSearch = () => {
    if (query.trim()) {
      console.log("Search triggered for:", query);
      // Encode query and route to ai-chat
      const encodedQuery = encodeURIComponent(query.trim());
      router.push(`/ai-chat?query=${encodedQuery}`);
    }
  };

  const sampleQueries = [
    {
      text: "Compare Box Hill and Doncaster for investment",
      icon: <GraphUpIcon className="w-6 h-6 text-[#28C381]" />,
    },
    {
      text: "What's the rental yield in Ballarat?",
      icon: <ChatMoneyIcon className="w-6 h-6 text-[#28C381]" />,
    },
    {
      text: "Is Cranbourne a good family suburb?",
      icon: <UsersGroupIcon className="w-6 h-6 text-[#28C381]" />,
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 font-dm-sans bg-transparent">
      <div className="max-w-4xl mx-auto text-center">
<h1 className="text-5xl md:text-6xl font-semibold text-center mb-6 bg-gradient-to-r from-[#28C381] to-[#27A4C8] bg-clip-text text-transparent leading-[1.1]">
  Unlock Smarter Property Insights with AI
</h1>
        <p className="text-xl text-gray-600 mt-2 mb-12 max-w-2xl mx-auto leading-relaxed">
          Instantly discover the investment potential of any Australian suburb — powered by real data and AI-driven
          analysis.
        </p>

<div className="max-w-2xl mx-auto mb-8">
  <div className="p-[2px] rounded-[16px] bg-[radial-gradient(circle,_#00FF92,_#0AC4FA)]">
    <div className="flex items-center justify-between bg-white rounded-[14px] p-3">
      {/* Input Field */}
      <input
        type="text"
        placeholder="Ask me anything about Australian residential properties..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }}
        className="w-full text-sm font-medium text-black font-dm-sans placeholder:text-gray-400 bg-white focus:outline-none"
      />

      {/* Send Button */}
      <Button
  className={`w-6 h-6 p-2 rounded-full flex justify-center items-center transition ${
    query.length < 3
      ? 'bg-gray-300 cursor-not-allowed'
      : 'bg-gradient-to-b from-[#28C381] to-[#27A4C8] hover:opacity-90'
  }`}
  onClick={handleSearch}
  disabled={query.length < 3}
  aria-label="Send Query"
>
  <ArrowUp size={14} className="text-white" />
</Button>

    </div>
  </div>
</div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {sampleQueries.map((item, index) => (
            <button
              key={index}
              onClick={() => setQuery(item.text)}
               className="flex items-center gap-3 px-4 py-3 w-[280px] bg-white rounded-xl shadow-[0px_1px_2px_rgba(2,130,78,0.05)] border border-[#F4F5F5] text-sm text-gray-900 hover:shadow-md transition"
            >
              <div className="shrink-0">
                {item.icon}
              </div>
              <span className="text-left font-medium text-[#0B3725] leading-tight">
                {item.text} 
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
