'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckCircle, Sparkles, Search } from 'lucide-react'

export default function Home() {
  const [suburb, setSuburb] = useState('')
  const [suburbOptions, setSuburbOptions] = useState<string[]>([])
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (suburb.length < 3) {
      setSuburbOptions([])
      return
    }

    const fetchSuggestions = async () => {
      const { data, error } = await supabase
        .from('suburbs')
        .select('suburb')
        .ilike('suburb', `${suburb}%`)
        .order('suburb')
        .limit(10)

      if (error) {
        console.error('Error loading suburb suggestions:', error)
        setSuburbOptions([])
      } else {
        const unique = Array.from(new Set(data.map((row: { suburb: string }) => row.suburb)))
        setSuburbOptions(unique)
      }
    }

    fetchSuggestions()
  }, [suburb])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suburb) {
      setError('Please enter a suburb.')
      return
    }

    setLoading(true)
    setError(null)
    setAiInsight(null)

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb }),
      })

      const result = await res.json()

      if (res.status !== 200) {
        setError(result.error || 'Something went wrong.')
        setLoading(false)
        return
      }

      setAiInsight(result.message || 'No insight returned')

      await supabase.from('insights').insert([
        {
          suburb_name: suburb,
          suburb_data: result.rawData,
          ai_response: result.message,
          score: null,
          recommendation: null,
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
        Make Smarter Property Decisions with <span className="text-blue-600">AI</span>
      </h1>
      <p className="text-lg text-slate-600 mb-12 max-w-xl">
        Instantly analyse any Australian suburb for investment potential.
      </p>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-16">
        <InfoCard
          icon={<CheckCircle className="text-blue-600 w-6 h-6 mb-2" />}
          title="Real Data Sources"
          description="Combines public data like ABS, rental trends, and council insights."
        />
        <InfoCard
          icon={<Sparkles className="text-blue-600 w-6 h-6 mb-2" />}
          title="AI-Generated Insights"
          description="Instant analysis tailored to suburb-specific growth drivers."
        />
        <InfoCard
          icon={<Search className="text-blue-600 w-6 h-6 mb-2" />}
          title="Free & Instant"
          description="No sign-up needed. Type a suburb and get answers in seconds."
        />
      </section>

      <form onSubmit={handleSubmit} className="mb-8 w-full max-w-md space-y-4">
        <input
          type="text"
          list="suburb-list"
          placeholder="Enter suburb name (e.g. Tarneit)"
          value={suburb}
          onChange={(e) => setSuburb(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="suburb-list">
          {suburbOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow"
        >
          Analyse Suburb
        </button>
      </form>

      {loading && <p className="text-slate-600 mt-2">Generating insights...</p>}
      {error && <p className="text-red-500 mt-2">{error}</p>}

      {aiInsight && (
        <div className="w-full max-w-2xl bg-white p-6 mt-6 rounded-xl shadow text-left border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">AI Insight</h2>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap">{aiInsight}</pre>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-20">
        Built with ❤️ for Australian buyers and investors · 2025 © PropSignal
      </p>
    </main>
  )
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm text-left">
      {icon}
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  )
}
