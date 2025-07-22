"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"

export function NewsletterSection() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle newsletter subscription
    console.log("Subscribing email:", email)
    setEmail("")
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
    
    {/* ✅ Text Section */}
    <div className="max-w-xl flex flex-col gap-2">
      <h2 className="text-[24px] font-medium font-dm-sans leading-[33.6px] text-black">
        Get Smarter Property Insights in Your Inbox
      </h2>
      <p className="text-[16px] font-normal font-dm-sans leading-[22.4px] text-[#7D8C83]">
        Subscribe for free to receive AI-powered suburb analysis, market trends, and data-driven tips
      </p>
    </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:w-[284px] px-3 py-2 bg-white rounded-[10px] border border-[#DCE0DE] text-[#7D8C83] text-sm font-normal font-dm-sans placeholder:text-[#7D8C83] focus:border-teal-500 focus:outline-none"
              required
            />
            <button
            type="submit"
            className="px-6 py-2 rounded-[10px] bg-gradient-to-r from-[#28C381] to-[#27A4C8] text-white text-m font-medium font-dm-sans leading-[19.6px] transition hover:opacity-90"
            >
            Subscribe
            </button>

          </form>
        </div>
    </section>
  )
}
