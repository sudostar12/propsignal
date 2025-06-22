'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight mb-6 max-w-3xl">
        Smarter Property Decisions Start Here
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl">
        Instantly analyse any suburb in Australia using AI. Understand capital growth, rental yields, and demographic trends with one click.
      </p>
      <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-md hover:bg-blue-700 transition">
        Start Analysing
      </Link>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="p-6 bg-gray-50 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Data-Powered</h3>
          <p className="text-sm text-gray-600">Combines local government data, CoreLogic-level insights, and trends to give a complete picture.</p>
        </div>
        <div className="p-6 bg-gray-50 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">AI Analysis</h3>
          <p className="text-sm text-gray-600">Summarised insights using OpenAI, scored and benchmarked for investment potential.</p>
        </div>
        <div className="p-6 bg-gray-50 border rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">No Signup Needed</h3>
          <p className="text-sm text-gray-600">Completely free to try — just type a suburb and get results instantly. Zero friction.</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-16">Built with ❤️ for Australian buyers and investors · 2025 © PropSignal</p>
    </main>
  )
}
