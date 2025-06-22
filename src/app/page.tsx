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
    } catch (err) {
      console.error('AI error:', err)
      setError('Failed to analyse suburb.')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-10 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Suburb Investment Insights</h1>

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
          className="w-full py-2 bg-blue-600 text-white rounded-md"
        >
          Analyse
        </button>
      </form>

      {loading && <p className="text-gray-600">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {aiInsight && (
        <div className="w-full max-w-md bg-white p-4 mt-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">AI Insight:</h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{aiInsight}</p>
        </div>
      )}
    </main>
  )
}
