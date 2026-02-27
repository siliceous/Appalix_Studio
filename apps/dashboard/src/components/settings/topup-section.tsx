'use client'

import { useState } from 'react'

const PACKS = [
  {
    id:      '2k',
    name:    '2k Add-on Pack',
    tagline: 'A quick boost for lighter months.',
    price:   29,
    perks:   ['+2,000 conversations', '+50 agent runs'],
  },
  {
    id:      '5k',
    name:    '5k Add-on Pack',
    tagline: 'Best value for high-demand periods.',
    price:   39,
    perks:   ['+5,000 conversations', '+75 agent runs'],
    popular: true,
  },
]

export function TopupSection() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function handleBuy(packId: string) {
    setLoading(packId)
    setError(null)
    try {
      const res  = await fetch('/api/checkout/topup', {
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
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border dark:border-white/10">
      <div className="px-6 py-5 border-b dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top-ups</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          One-time credit top-ups — no subscription change needed. Credits are added instantly.
        </p>
      </div>

      <div className="p-5 space-y-3">
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`rounded-xl border p-5 flex flex-col gap-3 ${
                pack.popular
                  ? 'border-brand-300 dark:border-brand-600 ring-1 ring-brand-300 dark:ring-brand-600'
                  : 'border-gray-200 dark:border-white/10'
              }`}
            >
              {pack.popular && (
                <span className="self-start text-xs font-semibold bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2.5 py-0.5 rounded-full">
                  Best value
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{pack.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pack.tagline}</p>
              </div>
              <ul className="space-y-1.5">
                {pack.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <svg className="w-3.5 h-3.5 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>
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
                      ? 'bg-brand-400 text-white cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  {loading === pack.id ? 'Redirecting…' : 'Buy now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
          Credits do not roll over to the next billing period.
        </p>
      </div>
    </div>
  )
}
