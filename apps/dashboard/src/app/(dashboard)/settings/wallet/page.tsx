'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, CheckCircle, AlertTriangle, Clock, Globe, Zap, CreditCard } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transaction {
  id:             string
  type:           string
  amount:         number
  balance_before: number
  balance_after:  number
  currency:       string
  description:    string | null
  reference_id:   string | null
  reference_type: string | null
  created_at:     string
}

interface WalletData {
  balance:                  number
  currency:                 string
  country:                  string
  auto_recharge_enabled:    boolean
  auto_recharge_threshold:  number
  auto_recharge_amount:     number
  low_balance_threshold:    number
  stripe_payment_method_id: string | null
  transactions:             Transaction[]
  usage_summary:            Record<string, { total: number; quantity: number }>
  rate_card:                Record<string, { unit_price: number }>
  rate_currency:            string
}

interface CountryOption {
  code:     string
  name:     string
  currency: string
}

// ── Supported countries ───────────────────────────────────────────────────────

const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: 'AU', name: 'Australia',      currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand',    currency: 'NZD' },
  { code: 'US', name: 'United States',  currency: 'USD' },
  { code: 'CA', name: 'Canada',         currency: 'CAD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'IE', name: 'Ireland',        currency: 'EUR' },
  { code: 'DE', name: 'Germany',        currency: 'EUR' },
  { code: 'FR', name: 'France',         currency: 'EUR' },
  { code: 'NL', name: 'Netherlands',    currency: 'EUR' },
  { code: 'SG', name: 'Singapore',      currency: 'SGD' },
  { code: 'IN', name: 'India',          currency: 'INR' },
]

// ── Usage type labels ─────────────────────────────────────────────────────────

const USAGE_TYPE_LABELS: Record<string, string> = {
  sms_outbound_segment:  'SMS outbound',
  sms_inbound_message:   'SMS inbound',
  voice_inbound_minute:  'Voice inbound',
  voice_outbound_minute: 'Voice outbound',
  voice_ai_stream_minute:'Voice AI agent',
  phone_number_month:    'Phone number rental',
  ai_analysis:           'AI analysis (email / chat / forms)',
  gemini_live_minute:    'Live voice (widget / Sage)',
}

const USAGE_TYPE_UNITS: Record<string, string> = {
  sms_outbound_segment:  'segments',
  sms_inbound_message:   'messages',
  voice_inbound_minute:  'minutes',
  voice_outbound_minute: 'minutes',
  voice_ai_stream_minute:'minutes',
  phone_number_month:    'numbers',
  ai_analysis:           'analyses',
  gemini_live_minute:    'minutes',
}

// ── Rate card display config ──────────────────────────────────────────────────

const RATE_DISPLAY: Record<string, { label: string; unit: string }> = {
  sms_outbound_segment:  { label: 'SMS outbound',   unit: 'seg'   },
  sms_inbound_message:   { label: 'SMS inbound',    unit: 'msg'   },
  voice_inbound_minute:  { label: 'Voice inbound',  unit: 'min'   },
  voice_outbound_minute: { label: 'Voice outbound', unit: 'min'   },
  voice_ai_stream_minute:{ label: 'Voice AI agent', unit: 'min'   },
  phone_number_month:    { label: 'Phone number',   unit: 'mo'    },
  ai_analysis:           { label: 'AI analysis',    unit: 'event' },
  gemini_live_minute:    { label: 'Live voice',     unit: 'min'   },
}

// ── Top-up amounts ────────────────────────────────────────────────────────────

const TOPUP_AMOUNTS_CENTS = [1000, 2000, 5000, 10000, 20000, 50000]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatRate(amount: number, currency: string) {
  const decimals = amount < 0.01 ? 4 : amount < 0.1 ? 3 : 2
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

function txIcon(type: string) {
  if (type === 'topup' || type === 'refund' || type === 'admin_adjustment' || type === 'auto_recharge') {
    return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
  }
  return <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
}

function txLabel(type: string) {
  const map: Record<string, string> = {
    topup:            'Top-up',
    refund:           'Refund',
    admin_adjustment: 'Adjustment',
    auto_recharge:    'Auto recharge',
    usage_deduction:  'Usage',
  }
  return map[type] ?? type
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const searchParams   = useSearchParams()
  const topupStatus    = searchParams.get('topup')
  const [wallet, setWallet]         = useState<WalletData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(5000)
  const [, startTransition]         = useTransition()
  const [redirecting, setRedirecting] = useState(false)
  const [savingCountry, setSavingCountry]       = useState(false)
  const [countryError, setCountryError]         = useState<string | null>(null)
  const [savingRecharge, setSavingRecharge]     = useState(false)
  const [rechargeEnabled, setRechargeEnabled]   = useState(false)
  const [rechargeThreshold, setRechargeThreshold] = useState(10)
  const [rechargeAmount, setRechargeAmount]     = useState(50)
  const [rechargeSaved, setRechargeSaved]       = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/wallet/balance')
      const data = await res.json() as WalletData
      setWallet(data)
      setRechargeEnabled(data.auto_recharge_enabled ?? false)
      setRechargeThreshold(data.auto_recharge_threshold ?? 10)
      setRechargeAmount(data.auto_recharge_amount ?? 50)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRechargeSettings = async () => {
    setSavingRecharge(true)
    setRechargeSaved(false)
    try {
      await fetch('/api/wallet/auto-recharge-settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          auto_recharge_enabled:   rechargeEnabled,
          auto_recharge_threshold: rechargeThreshold,
          auto_recharge_amount:    rechargeAmount,
        }),
      })
      setRechargeSaved(true)
      setTimeout(() => setRechargeSaved(false), 3000)
    } finally {
      setSavingRecharge(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleTopUp = () => {
    setRedirecting(true)
    startTransition(async () => {
      try {
        const res  = await fetch('/api/wallet/topup', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amountCents: selected }),
        })
        const data = await res.json() as { url?: string; error?: string }
        if (data.url) window.location.href = data.url
        else {
          alert(data.error ?? 'Failed to create checkout session')
          setRedirecting(false)
        }
      } catch {
        setRedirecting(false)
      }
    })
  }

  const handleCountryChange = async (country: string) => {
    setSavingCountry(true)
    setCountryError(null)
    try {
      const res  = await fetch('/api/wallet/currency', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ country }),
      })
      const data = await res.json() as { ok?: boolean; currency?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      // Reload wallet so currency updates everywhere
      await load()
    } catch (err) {
      setCountryError(String(err))
    } finally {
      setSavingCountry(false)
    }
  }

  const balance     = wallet?.balance ?? 0
  const currency    = wallet?.currency ?? 'AUD'
  const country     = wallet?.country  ?? 'AU'
  const isLow       = balance < (wallet?.low_balance_threshold ?? 5)
  const transactions = wallet?.transactions ?? []

  return (
    <div className="max-w-7xl mx-auto space-y-4 px-1">

      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Wallet</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your balance, top-ups, and usage charges.</p>
      </div>

      {/* Full-width banners */}
      {topupStatus === 'success' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Funds added successfully. Your balance has been updated.
        </div>
      )}
      {topupStatus === 'cancelled' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4 shrink-0" />
          Top-up cancelled. No charge was made.
        </div>
      )}

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-4 items-start">

        {/* ── LEFT: Balance · Add funds · Auto-recharge · Billing region ──── */}
        <div className="space-y-4">

          {/* Balance */}
          <div className={`rounded-2xl border p-5 ${
            isLow
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
              : 'bg-white dark:bg-[#1e2535] border-gray-200 dark:border-white/10'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Available balance
                </p>
                {loading ? (
                  <div className="h-8 w-28 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse" />
                ) : (
                  <p className={`text-3xl font-bold tabular-nums ${
                    isLow ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {formatMoney(balance, currency)}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{currency}</p>
                {isLow && !loading && (
                  <p className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Low balance — add funds to keep SMS &amp; calling active
                  </p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isLow ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-[#15A4AE]/10'
              }`}>
                <Wallet className={`w-5 h-5 ${isLow ? 'text-amber-500' : 'text-[#15A4AE]'}`} />
              </div>
            </div>
          </div>

          {/* Add funds */}
          <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Add funds</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Payments processed securely via Stripe.
            </p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {TOPUP_AMOUNTS_CENTS.map(cents => (
                <button
                  key={cents}
                  onClick={() => setSelected(cents)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    selected === cents
                      ? 'bg-[#15A4AE] border-[#15A4AE] text-white'
                      : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-[#15A4AE]/40 hover:bg-[#15A4AE]/5'
                  }`}
                >
                  {formatMoney(cents / 100, currency)}
                </button>
              ))}
            </div>
            <button
              onClick={handleTopUp}
              disabled={redirecting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#15A4AE] hover:bg-[#128a94] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {redirecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {redirecting ? 'Redirecting…' : `Add ${formatMoney(selected / 100, currency)}`}
            </button>
          </div>

          {/* Auto-recharge */}
          <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 p-5">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Auto-recharge</h2>
              </div>
              <button
                role="switch"
                aria-checked={rechargeEnabled}
                onClick={() => setRechargeEnabled(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${rechargeEnabled ? 'bg-[#15A4AE]' : 'bg-gray-200 dark:bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rechargeEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Charge your saved card when balance drops below threshold.
            </p>
            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs ${
              wallet?.stripe_payment_method_id
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400'
            }`}>
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              {wallet?.stripe_payment_method_id
                ? 'Card saved — ready to use'
                : 'No card saved yet. Complete a top-up to save your card.'}
            </div>
            {rechargeEnabled && (
              <div className="space-y-2 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Recharge below ({currency})
                  </label>
                  <input
                    type="number" min={1} step={1} value={rechargeThreshold}
                    onChange={e => setRechargeThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Top-up amount ({currency})
                  </label>
                  <input
                    type="number" min={10} step={10} value={rechargeAmount}
                    onChange={e => setRechargeAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleSaveRechargeSettings()}
                disabled={savingRecharge}
                className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#128a94] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {savingRecharge ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Save
              </button>
              {rechargeSaved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Billing region */}
          <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 p-5">
            <div className="flex items-center gap-2 mb-0.5">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Billing region</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Sets the currency for top-ups. Does not convert your existing balance.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={country}
                onChange={e => void handleCountryChange(e.target.value)}
                disabled={savingCountry || loading}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#15A4AE] disabled:opacity-60"
              >
                {SUPPORTED_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name} — {c.currency}</option>
                ))}
              </select>
              {savingCountry && <RefreshCw className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
            </div>
            {countryError && <p className="mt-2 text-xs text-red-500">{countryError}</p>}
          </div>

        </div>

        {/* ── CENTER: Transaction history ──────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transaction history</h2>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/6">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {txIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {tx.description ?? txLabel(tx.type)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${
                      tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {tx.amount >= 0 ? '+' : '-'}{formatMoney(tx.amount, tx.currency || currency)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Bal: {formatMoney(Number(tx.balance_after), tx.currency || currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Usage last 30 days + Rate card ───────────────────────── */}
        <div className="space-y-4">

          {/* Usage breakdown — last 30 days */}
          {wallet?.usage_summary && Object.keys(wallet.usage_summary).length > 0 && (
            <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/8">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Usage — last 30 days</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/6">
                {Object.entries(wallet.usage_summary)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([type, { total, quantity }]) => (
                    <div key={type} className="flex items-center justify-between px-5 py-2.5">
                      <div className="min-w-0 mr-3">
                        <p className="text-xs text-gray-800 dark:text-gray-200 truncate">{USAGE_TYPE_LABELS[type] ?? type}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{quantity.toLocaleString()} {USAGE_TYPE_UNITS[type] ?? 'units'}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300 shrink-0">
                        {formatMoney(total, currency)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Rate card */}
          <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/8">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Usage rates</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Deducted from your balance as you use each feature.</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/6">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2">
                    <div className="h-3 w-24 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                  </div>
                ))
              ) : (
                Object.entries(RATE_DISPLAY)
                  .filter(([key]) => wallet?.rate_card?.[key] !== undefined)
                  .map(([key, { label, unit }]) => {
                    const unitPrice = wallet!.rate_card[key].unit_price
                    return (
                      <div key={key} className="flex items-center justify-between px-5 py-2">
                        <p className="text-xs text-gray-700 dark:text-gray-300">{label}</p>
                        <p className="text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
                          {formatRate(unitPrice, wallet!.rate_currency)} / {unit}
                        </p>
                      </div>
                    )
                  })
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-white/3 border-t border-gray-100 dark:border-white/8">
              <p className="text-[10px] text-gray-400 leading-relaxed">Shown in {wallet?.rate_currency ?? 'AUD'}. Voice billed in 60-second increments (1 min min). SMS segments vary by message length. Non-AUD rates are approximate conversions.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
