import './globals.css'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
  title: 'PropSignal – Suburb Investment Insights',
  description: 'Instantly analyse Australian suburbs using AI. Understand growth, rental yield, and more for smarter property investment decisions.',
  openGraph: {
    title: 'PropSignal',
    description: 'Get instant AI insights for any suburb in Australia.',
    url: 'https://propsignal.vercel.app',
    siteName: 'PropSignal',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
