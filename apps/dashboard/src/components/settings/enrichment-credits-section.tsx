'use client'

import { useState } from 'react'
import { Target } from 'lucide-react'

const PACKS = [
  {
    id:       'starter',
    name:     'Starter',
    tagline:  'Perfect for trying out lead enrichment.',
    price:    35,
    credits:  100,
    popular:  false,
  },
  {
    id:       'growth',
    name:     'Growth',
    tagline:  'Best value for active prospecting.',
    price:    99,
    credits:  500,
    popular:  true,
  },
  {
    id:       'agency',
    name:     'Agency',
    tagline:  'High-volume enrichment at scale.',
    price:    179,
    credits:  1000,
    popular:  false,
  },
]

export function EnrichmentCreditsSection() {
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
    <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
      <div className="px-6 py-5 border-b dark:border-white/10">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#15A4AE]" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Lead Enrichment Credits</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          One-time credit packs for Sage lead enrichment — enrich, score, and qualify prospects instantly.
        </p>
      </div>

      <div className="p-5 space-y-3">
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`rounded-xl border p-5 flex flex-col gap-3 ${
                pack.popular
                  ? 'border-[#15A4AE]/50 ring-1 ring-[#15A4AE]/30 bg-[#15A4AE]/5 dark:bg-[#15A4AE]/10'
                  : 'border-gray-200 dark:border-white/10'
              }`}
            >
              {pack.popular && (
                <span className="self-start text-xs font-semibold bg-[#15A4AE]/10 text-[#15A4AE] px-2.5 py-0.5 rounded-full">
                  Best value
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{pack.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pack.tagline}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <Target className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                <span>{pack.credits.toLocaleString()} enrichment credits</span>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                <div>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">${pack.price}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400"> one-time</span>
                </div>
                <button
                  onClick={() => handleBuy(pack.id)}
                  disabled={loading === pack.id}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    loading === pack.id
                      ? 'bg-[#15A4AE]/40 text-white cursor-not-allowed'
                      : 'bg-[#15A4AE] hover:bg-[#0e8b94] text-white'
                  }`}
                >
                  {loading === pack.id ? 'Redirecting…' : 'Buy now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
          Credits are added instantly and never expire.
        </p>
      </div>
    </div>
  )
}
