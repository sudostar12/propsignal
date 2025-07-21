import './globals.css'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
  title: 'PropSignal – Suburb Investment Insights',
  description: 'Instantly analyse Australian suburbs using AI. Understand growth, rental yield, and more for smarter property investment decisions.',
  openGraph: {
    title: 'PropSignal',
    description: 'Get instant AI insights for any suburb in Australia.',
    url: 'https://propsignal-lgndhluzf-propsignal-projects.vercel.app',
    siteName: 'PropSignal',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen flex flex-col bg-transparent">
        {/* 🌈 Gradient Background Layer - covers whole screen behind everything */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-b from-[rgba(251,251,251,0.06)] via-[rgba(39,167,192,0.06)] to-[rgba(39,188,146,0.06)] blur-md shadow-xl" />
        </div>

        {/* 🧠 Main page content (Header, Page, Footer, etc.) */}
        {children}

        {/* 📊 Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  )
}
