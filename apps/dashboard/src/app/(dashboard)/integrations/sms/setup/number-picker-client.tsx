'use client'

import { useState, useCallback, useEffect } from 'react'
import { Phone, Plus, Trash2, Copy, Check, RefreshCw, MessageSquare, Wallet, ExternalLink, Mic } from 'lucide-react'
import type { ProvisionedNumber, BotOption } from './page'
import { AddNumberModal } from './add-number-modal'

interface Props {
  existingNumbers: ProvisionedNumber[]
  bots:            BotOption[]
  isAdmin:         boolean
  workspaceId:     string
}

export function NumberPickerClient({ existingNumbers, bots, isAdmin }: Props) {
  const [numbers,    setNumbers]    = useState<ProvisionedNumber[]>(existingNumbers)
  const [savingBot,  setSavingBot]  = useState<string | null>(null)
  const [releasing,  setReleasing]  = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [copied,     setCopied]     = useState<string | null>(null)
  const [showModal,  setShowModal]  = useState(false)
  const [balance,    setBalance]    = useState<{ balance: string; currency: string } | null>(null)

  useEffect(() => {
    fetch('/api/wallet/balance')
      .then(r => r.json() as Promise<{ balance?: number; currency?: string }>)
      .then(d => {
        if (d.balance !== undefined) setBalance({ balance: String(d.balance), currency: d.currency ?? 'AUD' })
      })
      .catch(() => {/* silent */})
  }, [])

  const copyToClipboard = useCallback((value: string, key: string) => {
    void navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const releaseNumber = useCallback(async (id: string) => {
    if (!confirm('Release this number? It will be permanently deactivated and cannot be recovered.')) return
    setReleasing(id)
    setError(null)
    try {
      const res  = await fetch(`/api/telnyx/numbers/${id}`, { method: 'DELETE' })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.error) { setError(data.error); return }
      setNumbers(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      setError(String(err))
    } finally {
      setReleasing(null)
    }
  }, [])

  const saveBot = useCallback(async (id: string, botId: string | null) => {
    setSavingBot(id)
    try {
      const res  = await fetch(`/api/telnyx/numbers/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bot_id: botId || null }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.error) { setError(data.error); return }
      setNumbers(prev => prev.map(n => n.id === id ? { ...n, bot_id: botId || null } : n))
    } catch (err) {
      setError(String(err))
    } finally {
      setSavingBot(null)
    }
  }, [])

  const balanceFloat = balance ? parseFloat(balance.balance) : null
  const lowBalance   = balanceFloat !== null && balanceFloat < 5

  return (
    <div className="space-y-6">

      {/* Modal */}
      {showModal && (
        <AddNumberModal
          onClose={() => setShowModal(false)}
          onPurchased={purchased => {
            setNumbers(prev => [...purchased, ...prev])
            setShowModal(false)
          }}
        />
      )}

      {/* ── Wallet balance ── */}
      <section className={`flex items-center justify-between gap-4 px-5 py-4 rounded-xl border ${
        lowBalance
          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
      }`}>
        <div className="flex items-center gap-3">
          <Wallet className={`w-5 h-5 shrink-0 ${lowBalance ? 'text-amber-500' : 'text-[#15A4AE]'}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {balance
                ? `${balance.currency} ${parseFloat(balance.balance).toFixed(2)} available`
                : 'Appalix wallet balance'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lowBalance
                ? 'Low balance — add funds before purchasing a number'
                : 'Wallet funds are used for phone numbers, SMS, and calling'}
            </p>
          </div>
        </div>
        <a
          href="/settings/wallet"
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            lowBalance
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-[#15A4AE] hover:bg-[#128a94] text-white'
          }`}
        >
          Add funds
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </section>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Provisioned numbers ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your numbers</h2>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add number
            </button>
          )}
        </div>

        {numbers.length === 0 ? (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 p-8 text-center">
            <Phone className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No phone numbers provisioned yet.</p>
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Provision your first number
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 divide-y divide-[#15A4AE]/20">
            {numbers.map((num) => (
              <div key={num.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#15A4AE]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{num.e164}</span>
                    {num.country_code && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium">
                        {num.country_code}
                      </span>
                    )}
                    {num.capabilities.sms && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 font-medium">
                        SMS
                      </span>
                    )}
                    {num.capabilities.voice && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/25 font-medium">
                        <Mic className="w-2.5 h-2.5" />Voice
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {num.purchased_at && `Added ${new Date(num.purchased_at).toLocaleDateString('en-AU')}`}
                  </p>
                  {bots.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-[10px] text-gray-400 shrink-0">Bot reply:</label>
                      <select
                        value={num.bot_id ?? ''}
                        onChange={(e) => void saveBot(num.id, e.target.value || null)}
                        disabled={savingBot === num.id}
                        className="flex-1 max-w-[220px] px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                      >
                        <option value="">No bot (manual only)</option>
                        {bots.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      {savingBot === num.id && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(num.e164, num.id)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors"
                >
                  {copied === num.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => void releaseNumber(num.id)}
                    disabled={releasing === num.id}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {releasing === num.id
                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
