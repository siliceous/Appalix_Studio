'use client'

import { useState } from 'react'
import { Users, Bot, HardDrive, Zap, AlertTriangle } from 'lucide-react'

const ADDONS = [
  {
    id:          'extra_seat',
    name:        'Extra Seat',
    icon:        Users,
    tagline:     'Add another team member to your workspace.',
    monthlyPrice: 45,
    annualPrice:  29,   // $348/yr ÷ 12
    annualTotal:  348,
    unit:        'seat / month',
    color:       'text-blue-500',
    bg:          'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    id:          'extra_bot',
    name:        'Extra Bot',
    icon:        Bot,
    tagline:     'Deploy an additional AI agent to your stack.',
    monthlyPrice: 29,
    annualPrice:  19,   // $228/yr ÷ 12
    annualTotal:  228,
    unit:        'bot / month',
    color:       'text-violet-500',
    bg:          'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    id:          'extra_storage',
    name:        'Extra Storage',
    icon:        HardDrive,
    tagline:     'Add 10 GB of storage to your workspace.',
    monthlyPrice: 7,
    annualPrice:  5,    // $60/yr ÷ 12
    annualTotal:  60,
    unit:        '10 GB / month',
    color:       'text-emerald-500',
    bg:          'bg-emerald-50 dark:bg-emerald-500/10',
  },
]

export function AddonsSection() {
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
      <div className="px-6 py-5 border-b dark:border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subscription Add-ons</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Bolt on extra capacity to your existing plan — billed each period with your subscription.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium transition-colors ${!isAnnual ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setIsAnnual(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${isAnnual ? 'bg-[#15A4AE]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isAnnual ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-medium transition-colors ${isAnnual ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>Annual</span>
          {isAnnual && (
            <span className="text-[10px] bg-green-100 dark:bg-[#15A4AE]/10 text-green-700 dark:text-[#15A4AE] px-1.5 py-0.5 rounded-full font-semibold">Save ~35%</span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ADDONS.map((addon) => {
            const price = isAnnual ? addon.annualPrice : addon.monthlyPrice
            return (
              <div key={addon.id} className="rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${addon.bg}`}>
                  <addon.icon className={`w-4 h-4 ${addon.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{addon.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{addon.tagline}</p>
                </div>
                <div className="mt-auto pt-2 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">${price}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400"> /{addon.unit}</span>
                    {isAnnual && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Billed ${addon.annualTotal}/yr</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuy(addon.id)}
                    disabled={loading === addon.id}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      loading === addon.id
                        ? 'bg-[#15A4AE]/40 text-white cursor-not-allowed'
                        : 'bg-[#15A4AE] hover:bg-[#0e8b94] text-white'
                    }`}
                  >
                    {loading === addon.id ? 'Redirecting…' : 'Add'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Overage note */}
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Conversation Overage</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              If you exceed your monthly conversation limit, overage is charged at <strong>$0.01 per conversation</strong> — automatically billed at the end of each period. No interruptions to your service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
