'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Home() {
  const [suburb, setSuburb] = useState('')
  const [result, setResult] = useState<any[] | null>(null)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [recommendation, setRecommendation] = useState<string | null>(null)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAiInsight(null)

    // Query Supabase
    const { data, error } = await supabase
      .from('suburbs')
      .select('*')
      .ilike('name', `%${suburb}%`)

    if (error) {
      console.error('Supabase error:', error.message)
      setError('Error fetching suburb data')
      setResult(null)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setResult([])
      setLoading(false)
      return
    }

    setResult(data)

    // Send to OpenAI
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburbData: data[0] }),
      })

      const ai = await res.json()
      if (ai.result) {
        setAiInsight(ai.result)
    const scoreMatch = ai.result.match(/Score:\s*(\d{1,2})\/10/i)
    const recommendationMatch = ai.result.match(/Recommendation:\s*(.*)/i)

  if (scoreMatch) {
    setScore(parseInt(scoreMatch[1]))
  }

  if (recommendationMatch) {
    setRecommendation(recommendationMatch[1].trim())
  }

      } else {
        setAiInsight('No insight available.')
      }
    } catch (err) {
      console.error('OpenAI error:', err)
      setAiInsight('Failed to fetch AI insights.')
    }

    setLoading(false)
  }

  return (
  <main className="min-h-screen flex flex-col items-center justify-start p-10 bg-gray-50">
    <h1 className="text-3xl font-bold mb-6">Suburb Investment Insights</h1>

    <form onSubmit={handleSubmit} className="mb-6 w-full max-w-md flex gap-2">
      <input
        type="text"
        placeholder="Enter suburb (e.g. Tarneit)"
        value={suburb}
        onChange={(e) => setSuburb(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        Search
      </button>
    </form>

    {loading && <p className="text-gray-600">Loading...</p>}
    {error && <p className="text-red-500">{error}</p>}

    {result && result.length > 0 && (
      <div className="w-full max-w-md bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Suburb Data:</h2>
        <pre className="text-sm text-gray-800 overflow-x-auto">
          {JSON.stringify(result[0], null, 2)}
        </pre>
      </div>
    )}

    {result && result.length === 0 && (
      <p className="text-gray-600">No results found for that suburb.</p>
    )}

    {aiInsight && (
      <div className="w-full max-w-md bg-white p-4 mt-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">AI Insight:</h2>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{aiInsight}</p>
      </div>
    )}
  </main>
)