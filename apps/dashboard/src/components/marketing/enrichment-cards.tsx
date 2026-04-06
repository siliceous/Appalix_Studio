'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PACKS = [
  {
    id:      'starter',
    name:    'Starter',
    tagline: 'Try out lead enrichment with no commitment.',
    price:   35,
    credits: 100,
    featured: false,
  },
  {
    id:      'growth',
    name:    'Growth',
    tagline: 'Best value for active prospecting teams.',
    price:   99,
    credits: 500,
    featured: true,
  },
  {
    id:      'agency',
    name:    'Agency',
    tagline: 'High-volume enrichment for agencies and scale-ups.',
    price:   179,
    credits: 1000,
    featured: false,
  },
]

export function EnrichmentCards() {
  const router  = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function handleBuy(packId: string) {
    setLoading(packId)
    setError(null)
    try {
      const res  = await fetch('/api/checkout/prospect-credits', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pack: packId }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else if (res.status === 401) {
        router.push('/login')
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(null)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {error && (
        <div className="sm:col-span-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {PACKS.map((pack) => (
        <div
          key={pack.id}
          className={`rounded-2xl border p-6 flex flex-col gap-4 ${
            pack.featured
              ? 'border-brand-600/40 bg-brand-600/5'
              : 'border-white/10 bg-white/5'
          }`}
        >
          {pack.featured && (
            <span className="self-start text-xs font-semibold bg-brand-600/20 text-brand-400 px-2.5 py-0.5 rounded-full">
              Best value
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-white mb-1">{pack.name}</p>
            <p className="text-xs text-white/65 leading-relaxed">{pack.tagline}</p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-white/80">
              <span className="text-brand-400">✦</span>
              {pack.credits.toLocaleString()} enrichment credits
            </li>
            <li className="flex items-center gap-2 text-sm text-white/80">
              <span className="text-brand-400">✦</span>
              Enrich, score &amp; qualify leads
            </li>
            <li className="flex items-center gap-2 text-sm text-white/80">
              <span className="text-brand-400">✦</span>
              Credits never expire
            </li>
          </ul>
          <div className="mt-auto flex items-end justify-between gap-4">
            <div>
              <span className="text-3xl font-black text-white">${pack.price}</span>
              <span className="text-white/60 text-sm"> one-time</span>
            </div>
            <button
              onClick={() => handleBuy(pack.id)}
              disabled={loading === pack.id}
              className={`shrink-0 px-5 py-2 text-sm font-semibold rounded-xl transition-colors ${
                loading === pack.id
                  ? 'bg-brand-600/50 text-white/50 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              {loading === pack.id ? 'Redirecting…' : 'Buy now'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
