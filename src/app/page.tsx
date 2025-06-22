'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Home() {
  const [suburb, setSuburb] = useState('')
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAiInsight(null)

    try {
      const { data } = await supabase
        .from('suburbs')
        .select('*')
        .ilike('name', `%${suburb}%`)
        .limit(1)
        .single()

      if (!data) {
        setError('Suburb not found.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburbData: data })
      })

      const ai = await res.json()
      setAiInsight(ai.result || 'No insight returned')

      const scoreMatch = ai.result.match(/Score:\s*(\d{1,2})\s*\/\s*10/i)
      const recommendationMatch = ai.result.match(/Recommendation:\s*(.*)/i)

      await supabase.from('insights').insert([
        {
          suburb_name: data.name,
          suburb_data: data,
          ai_response: ai.result,
          score: scoreMatch ? parseInt(scoreMatch[1]) : null,
          recommendation: recommendationMatch ? recommendationMatch[1].trim() : null,
        },
      ])
    } catch (err) {
      console.error('AI error:', err)
      setError('Failed to analyse suburb.')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-start px-4 py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight mb-4 max-w-3xl">
        Smarter Property Decisions, Backed by AI
      </h1>
      <p className="text-lg text-gray-600 mb-10 max-w-xl">
        Analyse any suburb in Australia for capital growth, rental yield, and investment potential — instantly.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-16">
        <div className="p-6 bg-gray-50 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Backed by Real Data</h3>
          <p className="text-sm text-gray-600">Combines local council, ABS, and rental trends to power suburb scoring.</p>
        </div>
        <div className="p-6 bg-gray-50 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">AI-Powered Insight</h3>
          <p className="text-sm text-gray-600">OpenAI provides a unique summary, score, and recommendation in seconds.</p>
        </div>
        <div className="p-6 bg-gray-50 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Try It Free</h3>
          <p className="text-sm text-gray-600">No sign-up or cost. Just search a suburb to see how it ranks.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 w-full max-w-md space-y-2">
        <input
          type="text"
          placeholder="Enter suburb (e.g. Tarneit)"
          value={suburb}
          onChange={(e) => setSuburb(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
        />
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Analyse Suburb
        </button>
      </form>

      {loading && <p className="text-gray-600 mt-2">Loading...</p>}
      {error && <p className="text-red-500 mt-2">{error}</p>}

      {aiInsight && (
        <div className="w-full max-w-md bg-white p-4 mt-4 rounded shadow text-left">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">AI Insight:</h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{aiInsight}</p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-20">
        Built with ❤️ for Australian buyers and investors · 2025 © PropSignal
      </p>
    </main>
  )
}
