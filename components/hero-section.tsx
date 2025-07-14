"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function HeroSection() {
  const [query, setQuery] = useState("")

  const sampleQueries = [
    "Compare Box Hill and Doncaster for investment",
    "What's the rental yield in Ballarat?",
    "Is Cranbourne a good family suburb?",
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Unlock Smarter Property <span className="text-teal-500">Insights with AI</span>
        </h1>

        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Instantly discover the investment potential of any Australian suburb — powered by real data and AI-driven
          analysis.
        </p>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="Ask me anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 pl-6 pr-14 text-lg border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-0"
            />
            <Button
              size="sm"
              className="absolute right-2 top-2 h-10 w-10 p-0 bg-gray-200 hover:bg-gray-300 text-gray-600"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {sampleQueries.map((sampleQuery, index) => (
            <button
              key={index}
              onClick={() => setQuery(sampleQuery)}
              className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors text-sm text-gray-700"
            >
              <div className="w-2 h-2 bg-teal-500 rounded-full" />
              <span>{sampleQuery}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
