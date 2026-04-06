'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Bot, HardDrive, AlertTriangle } from 'lucide-react'

const ADDONS = [
  {
    id:           'extra_seat',
    name:         'Extra Seat',
    icon:         Users,
    tagline:      'Add another team member to your workspace.',
    monthlyPrice: 45,
    annualPrice:  29,
    annualTotal:  348,
    unit:         'seat / month',
  },
  {
    id:           'extra_bot',
    name:         'Extra Bot',
    icon:         Bot,
    tagline:      'Deploy an additional AI agent to your stack.',
    monthlyPrice: 29,
    annualPrice:  19,
    annualTotal:  228,
    unit:         'bot / month',
  },
  {
    id:           'extra_storage',
    name:         'Extra Storage',
    icon:         HardDrive,
    tagline:      'Add 10 GB of storage to your workspace.',
    monthlyPrice: 7,
    annualPrice:  5,
    annualTotal:  60,
    unit:         '10 GB / month',
  },
]

export function AddonsCards() {
  const router    = useRouter()
  const [isAnnual, setIsAnnual] = useState(true)
  const [loading,  setLoading]  = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  async function handleBuy(addonId: string) {
    setLoading(addonId)
    setError(null)
    try {
      const res  = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: `${addonId}_${isAnnual ? 'annual' : 'monthly'}` }),
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
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm transition-colors ${!isAnnual ? 'text-white' : 'text-white/50'}`}>Monthly</span>
        <button
          onClick={() => setIsAnnual(v => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${isAnnual ? 'bg-brand-600' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isAnnual ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm transition-colors ${isAnnual ? 'text-white' : 'text-white/50'}`}>Annual</span>
        {isAnnual && (
          <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-semibold">Save ~35%</span>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ADDONS.map((addon) => {
          const price = isAnnual ? addon.annualPrice : addon.monthlyPrice
          return (
            <div key={addon.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
              <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center">
                <addon.icon className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{addon.name}</p>
                <p className="text-xs text-white/65 leading-relaxed">{addon.tagline}</p>
              </div>
              <div className="mt-auto flex items-end justify-between gap-4">
                <div>
                  <span className="text-3xl font-black text-white">${price}</span>
                  <span className="text-white/60 text-sm"> /{addon.unit}</span>
                  {isAnnual && (
                    <p className="text-xs text-white/40 mt-0.5">Billed ${addon.annualTotal}/yr</p>
                  )}
                </div>
                <button
                  onClick={() => handleBuy(addon.id)}
                  disabled={loading === addon.id}
                  className={`shrink-0 px-5 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    loading === addon.id
                      ? 'bg-brand-600/50 text-white/50 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  {loading === addon.id ? 'Redirecting…' : 'Add on'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overage note */}
      <div className="flex items-start gap-3 px-5 py-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-white/70">
          <span className="text-amber-400 font-semibold">Conversation overage</span> is billed at{' '}
          <span className="text-white font-semibold">$0.01 per conversation</span> when you exceed your plan limit.
          Your service is never interrupted — usage is metered and charged at end of period.
        </p>
      </div>
    </div>
  )
}
