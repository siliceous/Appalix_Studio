'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard, Wallet, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownLeft,
  CheckCircle, AlertTriangle, Clock, Receipt, MessageSquare, Phone, Zap,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  name:                 string
  slug:                 string
  status:               string
  trial_ends_at:        string | null
  billing_email:        string | null
  seat_limit:           number
  bot_limit:            number
  billing_period_start: string | null
  subscription: {
    current_period_end:   number | null
    current_period_start: number | null
    cancel_at_period_end: boolean
    interval:             string | null
  } | null
}

interface WalletSummary {
  balance:  number
  currency: string
}

interface StripeInvoice {
  id:          string
  number:      string | null
  description: string
  amount:      number
  currency:    string
  status:      string | null
  created_at:  string
  invoice_url: string | null
  period_end:  string | null
}

interface WalletTx {
  id:             string
  type:           string
  amount:         number
  currency:       string
  description:    string | null
  reference_type: string | null
  created_at:     string
}

type TimelineItem =
  | { kind: 'invoice'; data: StripeInvoice; date: Date }
  | { kind: 'wallet';  data: WalletTx;     date: Date }

interface BillingData {
  plan:                Plan
  wallet:              WalletSummary
  stripe_invoices:     StripeInvoice[]
  wallet_transactions: WalletTx[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(Math.abs(amount))
}

function planStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active:   { label: 'Active',      cls: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/25', icon: <CheckCircle className="w-3 h-3" /> },
    trialing: { label: 'Trial',       cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25', icon: <Clock className="w-3 h-3" /> },
    past_due: { label: 'Past due',    cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25', icon: <AlertTriangle className="w-3 h-3" /> },
    inactive: { label: 'Inactive',    cls: 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10', icon: null },
    cancelled:{ label: 'Cancelled',   cls: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10', icon: null },
  }
  const c = map[status] ?? map.inactive
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  )
}

function walletTxLabel(type: string) {
  const map: Record<string, string> = {
    topup:            'Wallet top-up',
    refund:           'Refund',
    admin_adjustment: 'Manual adjustment',
    auto_recharge:    'Auto recharge',
    usage_deduction:  'Usage charge',
  }
  return map[type] ?? type
}

function walletTxIcon(type: string, refType: string | null) {
  if (type === 'usage_deduction') {
    if (refType === 'workspace_phone_number') return <Phone className="w-3.5 h-3.5 text-violet-500" />
    return <MessageSquare className="w-3.5 h-3.5 text-teal-500" />
  }
  if (type === 'topup' || type === 'refund' || type === 'auto_recharge') {
    return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
  }
  return <Zap className="w-3.5 h-3.5 text-gray-400" />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [data,    setData]    = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/billing/history')
      const json = await res.json() as BillingData & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setData(json)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error ?? 'Failed to load billing data'}
          <button onClick={() => void load()} className="ml-auto underline">Retry</button>
        </div>
      </div>
    )
  }

  const { plan, wallet, stripe_invoices, wallet_transactions } = data
  const currency = wallet.currency

  // Build unified timeline
  const timeline: TimelineItem[] = [
    ...stripe_invoices.map(inv => ({ kind: 'invoice' as const, data: inv, date: new Date(inv.created_at) })),
    ...wallet_transactions.map(tx => ({ kind: 'wallet' as const, data: tx, date: new Date(tx.created_at) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  const nextBilling = plan.subscription?.current_period_end
    ? new Date(plan.subscription.current_period_end * 1000)
    : null

  const portalUrl = process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Billing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Subscription, wallet, and all charges in one place.</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/15 text-gray-600 dark:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Plan + Wallet cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Current plan */}
        <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#15A4AE]" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{plan.name} Plan</span>
            </div>
            {planStatusBadge(plan.status)}
          </div>

          <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Seats</span><span className="font-medium text-gray-800 dark:text-gray-200">{plan.seat_limit}</span>
            </div>
            <div className="flex justify-between">
              <span>Bots</span><span className="font-medium text-gray-800 dark:text-gray-200">{plan.bot_limit}</span>
            </div>
            {nextBilling && (
              <div className="flex justify-between">
                <span>{plan.subscription?.cancel_at_period_end ? 'Cancels' : 'Renews'}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {nextBilling.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            {plan.status === 'trialing' && plan.trial_ends_at && (
              <div className="flex justify-between">
                <span>Trial ends</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {new Date(plan.trial_ends_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )}
            {plan.subscription?.interval && (
              <div className="flex justify-between">
                <span>Billing</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{plan.subscription.interval}ly</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href="/settings/upgrade"
              className="flex-1 text-center py-2 text-xs font-semibold rounded-lg bg-[#15A4AE]/10 hover:bg-[#15A4AE]/20 text-[#15A4AE] border border-[#15A4AE]/30 transition-colors"
            >
              Change plan
            </Link>
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
              >
                Stripe portal <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Wallet balance */}
        <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Communications Wallet</span>
            </div>
          </div>

          <p className={`text-3xl font-bold tabular-nums mb-1 ${wallet.balance < 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {fmt(wallet.balance, currency)}
          </p>
          <p className="text-xs text-gray-400 mb-4">{currency} · SMS, calls & phone numbers</p>
          {wallet.balance < 5 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Low balance — add funds to keep services active
            </p>
          )}

          <Link
            href="/settings/wallet"
            className="w-full block text-center py-2 text-xs font-semibold rounded-lg bg-[#15A4AE] hover:bg-[#128a94] text-white transition-colors"
          >
            Add funds
          </Link>
        </div>
      </div>

      {/* Unified billing timeline */}
      <div className="bg-white dark:bg-[#1e2535] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/8 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Billing history</h2>
          <span className="ml-auto text-xs text-gray-400">{timeline.length} items</span>
        </div>

        {timeline.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No billing history yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            {timeline.map(item => {
              if (item.kind === 'invoice') {
                const inv = item.data
                return (
                  <div key={`inv-${inv.id}`} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{inv.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {inv.number && <span className="ml-2 text-gray-300 dark:text-gray-600">· {inv.number}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                        {fmt(inv.amount, inv.currency)}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${inv.status === 'paid' ? 'text-emerald-500' : inv.status === 'open' ? 'text-amber-500' : 'text-gray-400'}`}>
                        {inv.status === 'paid' ? 'Paid' : inv.status === 'open' ? 'Open' : inv.status ?? ''}
                      </p>
                    </div>
                    {inv.invoice_url && (
                      <a
                        href={inv.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-gray-300 dark:text-gray-600 hover:text-[#15A4AE] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )
              }

              // Wallet transaction
              const tx = item.data
              const isCredit = tx.amount >= 0
              return (
                <div key={`tx-${tx.id}`} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {isCredit
                      ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                      : walletTxIcon(tx.type, tx.reference_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {tx.description ?? walletTxLabel(tx.type)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                      {item.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      <span className="px-1 py-0 rounded bg-gray-100 dark:bg-white/8 text-[10px] font-medium text-gray-500 dark:text-gray-400">Wallet</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {isCredit ? '+' : '-'}{fmt(tx.amount, tx.currency || currency)}
                    </p>
                  </div>
                  {/* spacer to align with invoice download icon */}
                  <div className="w-3.5 shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
