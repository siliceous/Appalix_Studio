import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Appalix — Limitless AI. Delivered.', template: '%s | Appalix' },
  description: 'Deploy AI agents trained on your website content. Answer questions, capture leads, and close deals 24/7 across 7+ platforms. Try free for 7 days — no card required.',
  keywords: ['AI sales agent', 'chatbot for website', 'AI chatbot SaaS', 'lead capture chatbot', 'ChatGPT for your website'],
  openGraph: {
    siteName: 'Appalix',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
