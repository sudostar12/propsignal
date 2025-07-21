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
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Smarter Property Insights in Your Inbox</h2>
            <p className="text-gray-600 leading-relaxed">
              Subscribe for free to receive AI-powered suburb analysis, market trends, and data-driven tips
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-12 border-gray-300 focus:border-teal-500 focus:ring-0"
              required
            />
            <Button type="submit" className="h-12 px-8 bg-teal-500 hover:bg-teal-600 text-white">
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
