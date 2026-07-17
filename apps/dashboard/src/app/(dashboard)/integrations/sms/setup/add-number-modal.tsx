'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  X, Search, Plus, Minus, ShoppingCart, RefreshCw,
  Phone, ChevronRight, AlertTriangle,
  CheckCircle2, Globe,
} from 'lucide-react'
import type { ProvisionedNumber } from './page'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvailableNumber {
  phone_number:  string
  region:        string | null
  monthly_cost:  string
  upfront_cost:  string
  currency:      string
  capabilities: { sms: boolean; voice: boolean; mms: boolean; fax: boolean }
}

interface CartItem {
  number:  AvailableNumber
  country: string
}

// ── Config ────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'AU', name: 'Australia',      flag: '🇦🇺', dial: '+61' },
  { code: 'US', name: 'United States',  flag: '🇺🇸', dial: '+1'  },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  { code: 'CA', name: 'Canada',         flag: '🇨🇦', dial: '+1'  },
  { code: 'NZ', name: 'New Zealand',    flag: '🇳🇿', dial: '+64' },
  { code: 'IE', name: 'Ireland',        flag: '🇮🇪', dial: '+353' },
  { code: 'SG', name: 'Singapore',      flag: '🇸🇬', dial: '+65' },
  { code: 'DE', name: 'Germany',        flag: '🇩🇪', dial: '+49' },
]

type NumberType = 'local' | 'toll_free' | 'mobile'

const NUMBER_TYPES: { key: NumberType; label: string; desc: string }[] = [
  { key: 'local',     label: 'Local',     desc: 'Geographic numbers with area codes' },
  { key: 'toll_free', label: 'Toll-free', desc: '800, 1300, 1800 numbers'           },
  { key: 'mobile',    label: 'Mobile',    desc: 'Cell / mobile numbers'             },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCost(amount: string, currency: string) {
  const n = parseFloat(amount)
  if (n === 0) return 'Free'
  return new Intl.NumberFormat('en', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(n)
}

function CapBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose:    () => void
  onPurchased: (numbers: ProvisionedNumber[]) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddNumberModal({ onClose, onPurchased }: Props) {
  const [country,     setCountry]     = useState('AU')
  const [numberType,  setNumberType]  = useState<NumberType>('local')
  const [areaCode,    setAreaCode]    = useState('')
  const [searching,   setSearching]   = useState(false)
  const [results,     setResults]     = useState<AvailableNumber[] | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [cart,        setCart]        = useState<Map<string, CartItem>>(new Map())
  const [buying,      setBuying]      = useState(false)
  const [buyError,    setBuyError]    = useState<string | null>(null)
  const [warnings,    setWarnings]    = useState<string[]>([])
  const [done,        setDone]        = useState(false)
  const areaRef = useRef<HTMLInputElement>(null)

  // Trap focus inside modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const search = useCallback(async () => {
    setSearching(true)
    setError(null)
    setResults(null)
    try {
      const p = new URLSearchParams({ country, number_type: numberType, limit: '24' })
      if (areaCode.trim()) p.set('area_code', areaCode.trim())
      const res  = await fetch(`/api/telnyx/numbers/available?${p}`)
      const data = await res.json() as { numbers?: AvailableNumber[]; error?: string }
      if (data.error) { setError(data.error); return }
      setResults(data.numbers ?? [])
    } catch (err) {
      setError(String(err))
    } finally {
      setSearching(false)
    }
  }, [country, numberType, areaCode])

  // Auto-search when country or type changes (only after first manual search)
  useEffect(() => {
    if (results !== null) void search()
  // search is stable when country/numberType change because it's in its dep array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, numberType, search])

  function toggleCart(num: AvailableNumber) {
    setCart(prev => {
      const next = new Map(prev)
      if (next.has(num.phone_number)) {
        next.delete(num.phone_number)
      } else {
        next.set(num.phone_number, { number: num, country })
      }
      return next
    })
  }

  const cartItems  = [...cart.values()]
  const totalMonth = cartItems.reduce((s, i) => s + parseFloat(i.number.monthly_cost), 0)
  const currency   = cartItems[0]?.number.currency ?? 'USD'

  async function buy() {
    setBuying(true)
    setBuyError(null)
    const purchased: ProvisionedNumber[] = []
    const newWarnings: string[] = []

    for (const item of cartItems) {
      const res  = await fetch('/api/telnyx/numbers/provision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          phoneNumber:  item.number.phone_number,
          country:      item.country,
          monthly_cost: item.number.monthly_cost,
        }),
      })
      const data = await res.json() as {
        ok?: boolean; id?: string; error?: string
        complianceWarning?: string; code?: string
      }

      if (data.error) {
        setBuyError(data.error)
        setBuying(false)
        return
      }
      if (data.complianceWarning) newWarnings.push(data.complianceWarning)
      if (data.id) {
        purchased.push({
          id:                   data.id,
          e164:                 item.number.phone_number,
          country_code:         item.country,
          capabilities:         item.number.capabilities,
          messaging_profile_id: null,
          purchased_at:         new Date().toISOString(),
          bot_id:               null,
        })
      }
    }

    setWarnings(newWarnings)
    setBuying(false)
    setDone(true)
    onPurchased(purchased)
  }

  const selectedCountry = COUNTRIES.find(c => c.code === country)

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {cartItems.length === 1 ? 'Number activated!' : `${cartItems.length} numbers activated!`}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Your number{cartItems.length > 1 ? 's are' : ' is'} ready to use. Assign a bot or voice agent from the Phone Hub.
          </p>
          {cartItems.map(i => (
            <div key={i.number.phone_number} className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {i.number.phone_number}
            </div>
          ))}
          {warnings.map((w, i) => (
            <div key={i} className="mt-4 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-left max-w-sm">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}
            </div>
          ))}
          <button
            onClick={onClose}
            className="mt-8 px-6 py-2.5 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── Main modal ──────────────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col h-full">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#15A4AE]/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-[#15A4AE]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Find a phone number</h2>
              <p className="text-xs text-gray-400">Search and purchase numbers for SMS and voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT: Filters */}
          <div className="w-64 shrink-0 border-r dark:border-white/8 flex flex-col bg-gray-50 dark:bg-[#1c1c1c] p-5 gap-5 overflow-y-auto">

            {/* Country */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Country
              </label>
              <div className="space-y-1">
                {COUNTRIES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                      country === c.code
                        ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold border border-[#15A4AE]/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    {country === c.code && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Number type */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Number type
              </label>
              <div className="space-y-1">
                {NUMBER_TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setNumberType(t.key)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors border ${
                      numberType === t.key
                        ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold border-[#15A4AE]/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className={`text-[11px] mt-0.5 ${numberType === t.key ? 'text-[#15A4AE]/70' : 'text-gray-400'}`}>
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Area code */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Area code <span className="normal-case font-normal text-gray-300">(optional)</span>
              </label>
              <input
                ref={areaRef}
                type="text"
                value={areaCode}
                onChange={e => setAreaCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void search()}
                placeholder={`e.g. ${selectedCountry?.code === 'AU' ? '02' : selectedCountry?.code === 'US' ? '212' : '020'}`}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
              />
            </div>

            {/* Search button */}
            <button
              onClick={() => void search()}
              disabled={searching}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {searching
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Searching…</>
                : <><Search className="w-4 h-4" />Search</>
              }
            </button>

            {/* Capability legend */}
            <div className="mt-auto pt-4 border-t dark:border-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Capabilities</p>
              <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <CapBadge label="SMS" color="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
                  Text messaging
                </div>
                <div className="flex items-center gap-2">
                  <CapBadge label="Voice" color="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" />
                  Inbound / outbound calls
                </div>
                <div className="flex items-center gap-2">
                  <CapBadge label="MMS" color="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400" />
                  Picture messages
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Results */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">

              {/* Empty state */}
              {!searching && results === null && (
                <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <Globe className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Choose a country and type, then search
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    We'll show available numbers with live pricing
                  </p>
                </div>
              )}

              {/* Loading */}
              {searching && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#15A4AE]" />
                  <p className="text-sm">Searching available numbers…</p>
                </div>
              )}

              {/* Error */}
              {error && !searching && (
                <div className="m-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              )}

              {/* Results list */}
              {!searching && results !== null && (
                <>
                  <div className="flex items-center justify-between px-5 py-3 border-b dark:border-white/8 bg-white dark:bg-[#232323] sticky top-0 z-10">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {results.length === 0
                        ? 'No numbers found — try a different area code or type'
                        : `${results.length} numbers available · ${selectedCountry?.flag} ${selectedCountry?.name} · ${NUMBER_TYPES.find(t => t.key === numberType)?.label}`
                      }
                    </p>
                    {results.length > 0 && (
                      <button
                        onClick={() => void search()}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#15A4AE] transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />Refresh
                      </button>
                    )}
                  </div>

                  <div className="divide-y dark:divide-white/5">
                    {results.map(num => {
                      const inCart   = cart.has(num.phone_number)
                      const cost     = parseFloat(num.monthly_cost)
                      const upfront  = parseFloat(num.upfront_cost ?? '0')

                      return (
                        <div
                          key={num.phone_number}
                          className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                            inCart
                              ? 'bg-[#15A4AE]/5 dark:bg-[#15A4AE]/8'
                              : 'bg-white dark:bg-[#232323] hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Number + region */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                                {num.phone_number}
                              </span>
                              {num.region && (
                                <span className="text-xs text-gray-400 truncate">{num.region}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {num.capabilities.sms && (
                                <CapBadge label="SMS" color="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
                              )}
                              {num.capabilities.voice && (
                                <CapBadge label="Voice" color="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" />
                              )}
                              {num.capabilities.mms && (
                                <CapBadge label="MMS" color="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400" />
                              )}
                              {num.capabilities.fax && (
                                <CapBadge label="Fax" color="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {cost === 0 ? 'Free' : `${fmtCost(num.monthly_cost, num.currency)}/mo`}
                            </p>
                            {upfront > 0 && (
                              <p className="text-[11px] text-gray-400">
                                + {fmtCost(num.upfront_cost, num.currency)} setup
                              </p>
                            )}
                          </div>

                          {/* Add / Remove button */}
                          <button
                            onClick={() => toggleCart(num)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors border ${
                              inCart
                                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20'
                                : 'bg-[#15A4AE] hover:bg-[#0e8f99] text-white border-transparent'
                            }`}
                          >
                            {inCart ? <><Minus className="w-3 h-3" />Remove</> : <><Plus className="w-3 h-3" />Add</>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

            </div>

            {/* ── Cart bar ─────────────────────────────────────────────── */}
            {cart.size > 0 && (
              <div className="shrink-0 border-t dark:border-white/8 bg-white dark:bg-[#232323] px-5 py-3.5">

                {buyError && (
                  <div className="flex items-start gap-2 mb-3 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {buyError}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <ShoppingCart className="w-4 h-4 text-[#15A4AE]" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{cart.size}</span>
                    number{cart.size > 1 ? 's' : ''} selected
                  </div>

                  {/* Selected number pills */}
                  <div className="flex-1 flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {cartItems.map(item => (
                      <span
                        key={item.number.phone_number}
                        className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-1 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] border border-[#15A4AE]/20"
                      >
                        {item.number.phone_number}
                        <button onClick={() => toggleCart(item.number)} className="text-[#15A4AE]/60 hover:text-red-500 transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Total + buy */}
                  <div className="flex items-center gap-3 shrink-0">
                    {totalMonth > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {fmtCost(totalMonth.toFixed(2), currency)}/mo
                        </p>
                        <p className="text-[10px] text-gray-400">recurring</p>
                      </div>
                    )}
                    <button
                      onClick={() => void buy()}
                      disabled={buying}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      {buying
                        ? <><RefreshCw className="w-4 h-4 animate-spin" />Purchasing…</>
                        : <>
                            <ShoppingCart className="w-4 h-4" />
                            Buy {cart.size} number{cart.size > 1 ? 's' : ''}
                          </>
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-4xl h-[80vh] bg-white dark:bg-[#232323] rounded-2xl shadow-2xl border dark:border-white/8 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
