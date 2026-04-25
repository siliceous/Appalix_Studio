'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, CheckCircle, AlertTriangle, Clock, Globe } from 'lucide-react'

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
  balance:                 number
  currency:                string
  country:                 string
  auto_recharge_enabled:   boolean
  auto_recharge_threshold: number
  auto_recharge_amount:    number
  low_balance_threshold:   number
  transactions:            Transaction[]
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

// ── Top-up amounts ────────────────────────────────────────────────────────────

const TOPUP_AMOUNTS_CENTS = [1000, 2000, 5000, 10000, 20000, 50000]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
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
  const [savingCountry, setSavingCountry] = useState(false)
  const [countryError, setCountryError]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/wallet/balance')
      const data = await res.json() as WalletData
      setWallet(data)
    } finally {
      setLoading(false)
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
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Success / cancelled banner */}
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

      {/* Balance card */}
      <div className={`rounded-2xl border p-6 ${
        isLow
          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
          : 'bg-white dark:bg-[#1e2535] border-gray-200 dark:border-white/10'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Available Balance
            </p>
            {loading ? (
              <div className="h-9 w-32 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <p className={`text-4xl font-bold tabular-nums ${
                isLow ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'
              }`}>
                {formatMoney(balance, currency)}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{currency}</p>
            {isLow && !loading && (
              <p className="flex items-center gap-1.5 mt-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Low balance — add funds to keep SMS & calling active
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isLow ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-[#15A4AE]/10'
          }`}>
            <Wallet className={`w-6 h-6 ${isLow ? 'text-amber-500' : 'text-[#15A4AE]'}`} />
          </div>
        </div>
      </div>

      {/* Add funds */}
      <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Add funds</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Funds are used for SMS, phone numbers, and calling. Payments are processed securely via Stripe.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {TOPUP_AMOUNTS_CENTS.map(cents => (
            <button
              key={cents}
              onClick={() => setSelected(cents)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#15A4AE] hover:bg-[#128a94] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {redirecting
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : <Plus className="w-4 h-4" />}
          {redirecting ? 'Redirecting to Stripe…' : `Add ${formatMoney(selected / 100, currency)}`}
        </button>
      </div>

      {/* Transaction history */}
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
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-3">
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
                    Balance: {formatMoney(Number(tx.balance_after), tx.currency || currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Billing region */}
      <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Billing region</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Sets the currency used for wallet top-ups. Changing this does not convert your existing balance.
        </p>
        <div className="flex items-center gap-3">
          <select
            value={country}
            onChange={e => void handleCountryChange(e.target.value)}
            disabled={savingCountry || loading}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#15A4AE] disabled:opacity-60"
          >
            {SUPPORTED_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.name} — {c.currency}
              </option>
            ))}
          </select>
          {savingCountry && <RefreshCw className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
        </div>
        {countryError && (
          <p className="mt-2 text-xs text-red-500">{countryError}</p>
        )}
      </div>

    </div>
  )
}
