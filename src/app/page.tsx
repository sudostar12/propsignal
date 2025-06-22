'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckCircle, Sparkles, Search } from 'lucide-react'

const states = ['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

export default function Home() {
  const [state, setState] = useState('')
  const [suburb, setSuburb] = useState('')
  const [suburbOptions, setSuburbOptions] = useState<string[]>([])
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSuburbs = async () => {
      if (!state) {
        setSuburbOptions([])
        return
      }
      const { data } = await supabase
        .from('suburbs')
        .select('name')
        .eq('state', state)
        .order('name')
      if (data) setSuburbOptions(data.map((s: { name: string }) => s.name))
    }
    loadSuburbs()
  }, [state])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state || !suburb) {
      setError('Please select a state and enter a suburb.')
      return
    }

    setLoading(true)
    setError(null)
    setAiInsight(null)

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb, state }),
      })

      const result = await res.json()

      if (res.status !== 200) {
        setError(result.error || 'Something went wrong.')
        setLoading(false)
        return
      }

      setAiInsight(result.message || 'No insight returned')

      // Optional: save AI output to insights table
      await supabase.from('insights').insert([
        {
          suburb_name: suburb,
          suburb_data: result.rawData,
          ai_response: result.message,
          score: null, // Parse from result.message if your prompt includes it
          recommendation: null, // Same as above
        },
      ])
    } catch (err) {
      console.error('AI error:', err)
      setError('Failed to analyse suburb.')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 flex flex-col items-center justify-start px-4 py-20 text-center">
      <h1 className="text-5xl font-extrabold text-slate-800 leading-tight mb-4 max-w-3xl">
        Smarter Property Decisions with <span className="text-blue-600">AI</span>
      </h1>
      <p className="text-lg text-slate-600 mb-10 max-w-xl">
        Instantly analyse any Australian suburb for capital growth, rental yield, and investment potential.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-16">
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm text-left">
          <CheckCircle className="text-blue-600 w-6 h-6 mb-2" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Real Data Sources</h3>
          <p className="text-sm text-slate-600">Combines local council, ABS, and rental trends to power suburb scoring.</p>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm text-left">
          <Sparkles className="text-blue-600 w-6 h-6 mb-2" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">AI-Powered Insight</h3>
          <p className="text-sm text-slate-600">OpenAI generates unique summaries, scores, and recommendations in seconds.</p>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm text-left">
          <Search className="text-blue-600 w-6 h-6 mb-2" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">No Sign-Up Needed</h3>
          <p className="text-sm text-slate-600">Try it free — just select a state and search a suburb to get started.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 w-full max-w-md space-y-3">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a state</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="text"
          list="suburb-list"
          placeholder="Enter suburb (e.g. Melbourne)"
          value={suburb}
          onChange={(e) => setSuburb(e.target.value)}
          disabled={!state}
          className="w-full px-4 py-2 border border-slate-300 rounded-md disabled:bg-slate-100 focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="suburb-list">
          {suburbOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow"
        >
          Analyse Suburb
        </button>
      </form>

      {loading && <p className="text-slate-600 mt-2">Loading...</p>}
      {error && <p className="text-red-500 mt-2">{error}</p>}

      {aiInsight && (
        <div className="w-full max-w-md bg-white p-6 mt-4 rounded-xl shadow text-left border border-slate-200">
          <h2 className="text-lg font-semibold mb-2 text-slate-800">AI Insight:</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiInsight}</p>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-20">
        Built with ❤️ for Australian buyers and investors · 2025 © PropSignal
      </p>
    </main>
  )
}
