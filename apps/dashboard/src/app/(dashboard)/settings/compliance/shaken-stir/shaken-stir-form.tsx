'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import Link            from 'next/link'
import {
  Phone, CheckCircle2, AlertTriangle, Loader2,
  ChevronLeft, Circle, Clock, Info,
} from 'lucide-react'
import { submitShakenStirRegistration } from '@/app/actions/voice-compliance'
import type { ComplianceRegistration, SmsComplianceProfile } from '@/lib/types'

interface PhoneNumber {
  id:           string
  e164:         string
  country_code: string
}

interface Props {
  registration: ComplianceRegistration | null
  phoneNumbers: PhoneNumber[]
  a2pProfile:   Pick<SmsComplianceProfile, 'legal_business_name' | 'trading_name' | 'business_contact_name' | 'business_contact_email' | 'business_contact_phone'> | null
  isAdmin:      boolean
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active:  { label: 'Active',       cls: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    pending: { label: 'Under review', cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',      icon: <Clock className="w-3 h-3" /> },
    rejected:{ label: 'Rejected',     cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',             icon: <AlertTriangle className="w-3 h-3" /> },
  }
  const c = cfg[status] ?? { label: 'Not enrolled', cls: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10', icon: <Circle className="w-3 h-3" /> }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 focus:border-[#15A4AE] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-500'

export function ShakenStirForm({ registration, phoneNumbers, a2pProfile, isAdmin }: Props) {
  const router = useRouter()

  const existing = registration?.data as Record<string, unknown> | undefined
  const existingIds = existing?.phone_number_ids as string[] | undefined

  const [legalBusinessName, setLegalBusinessName] = useState(
    (existing?.legal_business_name as string) ?? a2pProfile?.legal_business_name ?? '',
  )
  const [contactName,  setContactName]  = useState(
    (existing?.contact_name as string) ?? a2pProfile?.business_contact_name ?? '',
  )
  const [contactEmail, setContactEmail] = useState(
    (existing?.contact_email as string) ?? a2pProfile?.business_contact_email ?? '',
  )
  const [contactPhone, setContactPhone] = useState(
    (existing?.contact_phone as string) ?? a2pProfile?.business_contact_phone ?? '',
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(existingIds ?? []))
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [saved,       setSaved]       = useState(false)

  function toggleNumber(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(prev =>
      prev.size === phoneNumbers.length ? new Set() : new Set(phoneNumbers.map(n => n.id)),
    )
  }

  async function handleSubmit() {
    setError(null); setBusy(true)
    try {
      const r = await submitShakenStirRegistration({
        legalBusinessName,
        contactName,
        contactEmail,
        contactPhone,
        phoneNumberIds: [...selectedIds],
      })
      if (!r.success) setError(r.error ?? 'Submission failed')
      else { setSaved(true); router.refresh() }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setBusy(false)
    }
  }

  const prefilled = !!a2pProfile

  return (
    <div className="max-w-xl mx-auto">

      {/* Header */}
      <div className="bg-[#141c2b] rounded-t-xl px-5 pt-5 pb-4">
        <Link href="/settings/compliance" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80 mb-4 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Compliance
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-white">SHAKEN/STIR</h1>
              <p className="text-xs text-white/50 mt-0.5">Authenticate your caller ID to prevent spam labels</p>
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
            Enrollment submitted. We&apos;ll activate SHAKEN/STIR within 1–3 business days.
          </div>
        )}

        {registration?.status === 'pending' && !saved && (
          <div className="p-3 bg-blue-50 dark:bg-blue-500/8 border border-blue-200 dark:border-blue-500/15 rounded-lg text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Enrollment under review — typically activated within 1–3 business days.
          </div>
        )}

        {registration?.status === 'active' && !saved && (
          <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-xs text-green-700 dark:text-green-400 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            SHAKEN/STIR is active. Your outbound calls carry a verified caller attestation.
          </div>
        )}

        {/* What it does */}
        <div className="p-3.5 bg-purple-50 dark:bg-purple-500/8 border border-purple-200 dark:border-purple-500/15 rounded-lg text-xs text-purple-700 dark:text-purple-400 leading-relaxed flex items-start gap-2">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          SHAKEN/STIR cryptographically signs your outbound calls so carriers can verify they originate from a legitimate business. This prevents your numbers being labelled as &quot;Spam Likely&quot; or &quot;Scam Risk&quot;.
        </div>

        {/* Pre-filled notice */}
        {prefilled && (
          <div className="p-3 bg-amber-50 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/15 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            Business identity pre-filled from your US SMS verification profile. Update below if needed.
          </div>
        )}

        {/* Business identity */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Business identity</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Legal business name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={legalBusinessName}
              onChange={e => setLegalBusinessName(e.target.value)}
              placeholder="Acme Inc."
              disabled={!isAdmin}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Contact name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Jane Smith"
                disabled={!isAdmin}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Contact phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                disabled={!isAdmin}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Contact email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="contact@business.com"
              disabled={!isAdmin}
              className={inputCls}
            />
          </div>
        </div>

        {/* Number selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Phone numbers to enroll
            </label>
            {phoneNumbers.length > 1 && isAdmin && (
              <button type="button" onClick={toggleAll} className="text-xs text-[#15A4AE] hover:underline">
                {selectedIds.size === phoneNumbers.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {phoneNumbers.length === 0 ? (
            <p className="text-sm text-gray-400">
              No phone numbers yet.{' '}
              <Link href="/settings/phone-numbers" className="text-[#15A4AE] hover:underline">Add a number</Link>
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
            disabled={busy || !legalBusinessName.trim() || !contactEmail.trim() || !contactName.trim() || selectedIds.size === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
            {busy ? 'Submitting…' : registration ? 'Update enrollment' : 'Submit enrollment'}
          </button>
        )}

        {!isAdmin && (
          <p className="text-xs text-gray-400 text-center">Only workspace admins can manage SHAKEN/STIR enrollment.</p>
        )}

      </div>
    </div>
  )
}
