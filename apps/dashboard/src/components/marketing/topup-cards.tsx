'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PACKS = [
  {
    id:       '2k',
    name:     '2k Add-on Pack',
    tagline:  'A quick boost for lighter months.',
    price:    29,
    perks:    ['+2,000 conversations', '+50 agent runs'],
    featured: false,
  },
  {
    id:       '5k',
    name:     '5k Add-on Pack',
    tagline:  'Best value for high-demand periods.',
    price:    39,
    perks:    ['+5,000 conversations', '+75 agent runs'],
    featured: true,
  },
]

export function TopupCards() {
  const router = useRouter()
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {error && (
        <div className="sm:col-span-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 text-center">
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
          <div>
            <p className="text-sm font-semibold text-white mb-1">{pack.name}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{pack.tagline}</p>
          </div>
          <ul className="space-y-2">
            {pack.perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-brand-400">✦</span> {perk}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-end justify-between gap-4">
            <div>
              <span className="text-3xl font-black text-white">${pack.price}</span>
              <span className="text-gray-500 text-sm"> one-time</span>
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
