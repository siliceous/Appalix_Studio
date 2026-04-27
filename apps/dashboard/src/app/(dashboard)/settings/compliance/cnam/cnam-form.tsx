'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import Link            from 'next/link'
import {
  Mic, Phone, CheckCircle2, AlertTriangle, Loader2,
  ChevronLeft, Circle, Clock,
} from 'lucide-react'
import { submitCnamRegistration } from '@/app/actions/voice-compliance'
import type { ComplianceRegistration } from '@/lib/types'

interface PhoneNumber {
  id:           string
  e164:         string
  country_code: string
}

interface Props {
  registration:       ComplianceRegistration | null
  phoneNumbers:       PhoneNumber[]
  suggestedCallerName: string
  isAdmin:            boolean
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active:   { label: 'Active',        cls: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',  icon: <CheckCircle2 className="w-3 h-3" /> },
    pending:  { label: 'Under review',  cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',        icon: <Clock className="w-3 h-3" /> },
    rejected: { label: 'Rejected',      cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',              icon: <AlertTriangle className="w-3 h-3" /> },
  }
  const c = cfg[status] ?? { label: 'Not set', cls: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10', icon: <Circle className="w-3 h-3" /> }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-500'

export function CnamForm({ registration, phoneNumbers, suggestedCallerName, isAdmin }: Props) {
  const router = useRouter()

  const existingName    = (registration?.data as Record<string, unknown>)?.caller_name as string | undefined
  const existingIds     = (registration?.data as Record<string, unknown>)?.phone_number_ids as string[] | undefined

  const [callerName,     setCallerName]     = useState(existingName ?? suggestedCallerName.toUpperCase().slice(0, 15))
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set(existingIds ?? []))
  const [busy,           setBusy]           = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [partialFails,   setPartialFails]   = useState<string[]>([])
  const [saved,          setSaved]          = useState(false)

  const normalized = callerName.trim().toUpperCase().slice(0, 15)
  const remaining  = 15 - normalized.length

  function toggleNumber(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === phoneNumbers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(phoneNumbers.map(n => n.id)))
    }
  }

  async function handleSubmit() {
    setError(null); setPartialFails([]); setBusy(true)
    try {
      const r = await submitCnamRegistration({
        callerName:     normalized,
        phoneNumberIds: [...selectedIds],
      })
      if (!r.success) {
        setError(r.error ?? 'Update failed')
      } else {
        if (r.failedNumbers?.length) setPartialFails(r.failedNumbers)
        setSaved(true)
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">

      {/* Header */}
      <div className="bg-[#141c2b] rounded-t-xl px-5 pt-5 pb-4">
        <Link href="/settings/compliance" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80 mb-4 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Compliance
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-white">CNAM — Caller ID Name</h1>
              <p className="text-xs text-white/50 mt-0.5">Display your business name on outbound calls</p>
            </div>
          </div>
          {registration && <StatusPill status={registration.status} />}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-b-xl border-x border-b border-gray-200 dark:border-white/8 shadow-xl shadow-black/[0.06] dark:shadow-black/30 p-6 space-y-6">

        {saved && (
          <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-xs text-green-700 dark:text-green-400 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Caller name updated successfully.
            {partialFails.length > 0 && (
              <span className="ml-1">Failed on: {partialFails.join(', ')}</span>
            )}
          </div>
        )}

        {/* What is CNAM */}
        <div className="p-3.5 bg-blue-50 dark:bg-blue-500/8 border border-blue-200 dark:border-blue-500/15 rounded-lg text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          CNAM (Caller Name) shows your business name on recipients&apos; caller IDs when you call from a registered number. Maximum 15 characters, displayed in capitals.
        </div>

        {/* Caller name input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Caller name</label>
            <span className={`text-xs ${remaining <= 2 ? 'text-amber-500' : 'text-gray-400'}`}>
              {remaining} remaining
            </span>
          </div>
          <input
            type="text"
            value={callerName}
            onChange={e => setCallerName(e.target.value.toUpperCase().slice(0, 15))}
            placeholder="ACME CORP"
            maxLength={15}
            disabled={!isAdmin}
            className={inputCls}
          />
          {/* Preview */}
          <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/4 rounded-lg border border-gray-200 dark:border-white/8">
            <div className="w-9 h-9 rounded-full bg-[#15A4AE]/20 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-[#15A4AE]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {normalized || 'YOUR BUSINESS'}
              </p>
              <p className="text-[11px] text-gray-400">How it appears on caller ID</p>
            </div>
          </div>
        </div>

        {/* Number selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Apply to numbers
            </label>
            {phoneNumbers.length > 1 && isAdmin && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-[#15A4AE] hover:underline"
              >
                {selectedIds.size === phoneNumbers.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {phoneNumbers.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No phone numbers in your workspace yet.{' '}
              <Link href="/settings/phone-numbers" className="text-[#15A4AE] hover:underline">
                Add a number
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {phoneNumbers.map(num => {
                const checked = selectedIds.has(num.id)
                return (
                  <label
                    key={num.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[#15A4AE]/5 border-[#15A4AE]/40 dark:border-[#15A4AE]/30'
                        : 'bg-white dark:bg-white/2 border-gray-200 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/15'
                    } ${!isAdmin ? 'cursor-default opacity-70' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => isAdmin && toggleNumber(num.id)}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded accent-[#15A4AE]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{num.e164}</p>
                      <p className="text-[11px] text-gray-400">{num.country_code}</p>
                    </div>
                    {checked && <CheckCircle2 className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
          </div>
        )}

        {/* Submit */}
        {isAdmin && (
          <button
            onClick={handleSubmit}
            disabled={busy || !normalized || selectedIds.size === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            {busy ? 'Applying…' : registration ? 'Update caller name' : 'Register caller name'}
          </button>
        )}

        {!isAdmin && (
          <p className="text-xs text-gray-400 text-center">Only workspace admins can manage CNAM settings.</p>
        )}

      </div>
    </div>
  )
}
