'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, AlertTriangle, Circle,
  Building2, MessageSquare, Phone, Loader2,
  Link2, Link2Off, ChevronRight, RotateCcw,
} from 'lucide-react'
import {
  submitBrandToTelnyx,
  submitCampaignToTelnyx,
  assignNumberToCampaign,
  removeNumberFromCampaign,
} from '@/app/actions/telnyx-10dlc'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  id:                   string
  status:               string
  legal_business_name:  string | null
  trading_name:         string | null
  rejection_reason:     string | null
  submitted_at:         string | null
}

interface Brand {
  id:                string
  brand_status:      string
  provider_brand_id: string | null
  rejection_reason:  string | null
  submitted_at:      string | null
  approved_at:       string | null
}

interface Campaign {
  id:                  string
  campaign_name:       string
  use_case:            string
  campaign_status:     string
  provider_campaign_id: string | null
  rejection_reason:    string | null
  submitted_at:        string | null
  approved_at:         string | null
}

interface PhoneNumber {
  id:   string
  e164: string
}

interface Assignment {
  phone_number_id: string
  campaign_id:     string
  status:          string
}

interface Props {
  profile:      Profile
  brand:        Brand | null
  campaigns:    Campaign[]
  phoneNumbers: PhoneNumber[]   // US numbers only
  assignments:  Assignment[]
  isAdmin:      boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const USE_CASE_LABELS: Record<string, string> = {
  customer_care:             'Customer care',
  account_notifications:     'Account notifications',
  appointment_reminders:     'Appointment reminders',
  delivery_notifications:    'Delivery notifications',
  two_factor_authentication: '2FA / Verification',
  lead_followup:             'Lead follow-up',
  marketing:                 'Marketing',
  mixed:                     'Mixed',
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    approved:              { label: 'Approved',        cls: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',    icon: <CheckCircle2 className="w-3 h-3" /> },
    active:                { label: 'Active',          cls: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',    icon: <CheckCircle2 className="w-3 h-3" /> },
    submitted:             { label: 'Submitted',       cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',          icon: <Clock className="w-3 h-3" /> },
    pending:               { label: 'Under review',    cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',          icon: <Clock className="w-3 h-3" /> },
    pending_carrier_review:{ label: 'Carrier review',  cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',          icon: <Clock className="w-3 h-3" /> },
    ready_for_review:      { label: 'Pending review',  cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',    icon: <Clock className="w-3 h-3" /> },
    rejected:              { label: 'Rejected',        cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',                icon: <AlertTriangle className="w-3 h-3" /> },
    not_submitted:         { label: 'Not submitted',   cls: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10',                icon: <Circle className="w-3 h-3" /> },
    failed:                { label: 'Failed',          cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',                icon: <AlertTriangle className="w-3 h-3" /> },
  }
  const c = cfg[status] ?? cfg.not_submitted
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Main component ────────────────────────────────────────────────────────────

export function SmsVerificationStatus({
  profile, brand, campaigns, phoneNumbers, assignments, isAdmin,
}: Props) {
  const router = useRouter()
  const [busy,   setBusy]   = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const approvedCampaigns = campaigns.filter(c => c.campaign_status === 'approved')

  function getAssignment(numberId: string) {
    return assignments.find(a => a.phone_number_id === numberId && a.status === 'active')
  }

  function setErr(key: string, msg: string) {
    setErrors(prev => ({ ...prev, [key]: msg }))
  }
  function clearErr(key: string) {
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  async function handleSubmitBrand() {
    setBusy('brand'); clearErr('brand')
    try {
      const r = await submitBrandToTelnyx(profile.id)
      if (!r.success) setErr('brand', r.error ?? 'Registration failed')
      else router.refresh()
    } catch (e) { setErr('brand', e instanceof Error ? e.message : 'Unexpected error — check console') }
    finally { setBusy(null) }
  }

  async function handleSubmitCampaign(campaignId: string) {
    setBusy(campaignId); clearErr(campaignId)
    try {
      const r = await submitCampaignToTelnyx(campaignId)
      if (!r.success) setErr(campaignId, r.error ?? 'Registration failed')
      else router.refresh()
    } catch (e) { setErr(campaignId, e instanceof Error ? e.message : 'Unexpected error') }
    finally { setBusy(null) }
  }

  async function handleAssign(numberId: string, campaignId: string) {
    setBusy(`assign-${numberId}`); clearErr(`assign-${numberId}`)
    try {
      const r = await assignNumberToCampaign(numberId, campaignId)
      if (!r.success) setErr(`assign-${numberId}`, r.error ?? 'Assignment failed')
      else router.refresh()
    } catch (e) { setErr(`assign-${numberId}`, e instanceof Error ? e.message : 'Unexpected error') }
    finally { setBusy(null) }
  }

  async function handleRemove(numberId: string) {
    setBusy(`assign-${numberId}`); clearErr(`assign-${numberId}`)
    try {
      const r = await removeNumberFromCampaign(numberId)
      if (!r.success) setErr(`assign-${numberId}`, r.error ?? 'Remove failed')
      else router.refresh()
    } catch (e) { setErr(`assign-${numberId}`, e instanceof Error ? e.message : 'Unexpected error') }
    finally { setBusy(null) }
  }

  const bizName = profile.trading_name || profile.legal_business_name || 'Your business'

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Title */}
      <div>
        <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">US SMS Verification</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Verify your business and messaging use case to send SMS to US phone numbers.
        </p>
      </div>


      {/* ── Brand card ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/6">
          <div className="w-7 h-7 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-[#15A4AE]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{bizName}</p>
            <p className="text-[11px] text-gray-400">Business profile</p>
          </div>
          <StatusPill status={brand?.brand_status ?? profile.status} />
        </div>
        <div className="px-4 py-3 space-y-2 text-xs text-gray-500 dark:text-gray-400">
          {profile.submitted_at && (
            <p>Submitted {fmtDate(profile.submitted_at)}</p>
          )}
          {brand?.approved_at && (
            <p className="text-green-600 dark:text-green-400">✓ Approved {fmtDate(brand.approved_at)}</p>
          )}
          {brand?.rejection_reason && (
            <div className="p-2.5 bg-red-50 dark:bg-red-500/8 border border-red-200 dark:border-red-500/15 rounded-lg text-red-600 dark:text-red-400 leading-relaxed">
              {brand.rejection_reason}
            </div>
          )}
          {profile.status === 'ready_for_review' && isAdmin && (
            <div className="pt-1">
              <p className="mb-2 text-amber-600 dark:text-amber-400">
                Application received — click below to register with the US carrier network.
              </p>
              <button
                onClick={handleSubmitBrand}
                disabled={busy === 'brand'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {busy === 'brand' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                {busy === 'brand' ? 'Submitting…' : 'Register with carriers'}
              </button>
              {errors['brand'] && (
                <p className="mt-2 text-xs text-red-500 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{errors['brand']}
                </p>
              )}
            </div>
          )}
          {profile.status === 'ready_for_review' && !isAdmin && (
            <p className="text-amber-600 dark:text-amber-400">
              Application received — under internal review. We&apos;ll submit to carriers within 1 business day.
            </p>
          )}
          {(profile.status === 'submitted' || profile.status === 'pending_carrier_review') && (
            <p>Your brand is being reviewed by the carrier registry. This typically takes 3–7 business days.</p>
          )}
        </div>
        {(profile.status === 'rejected') && (
          <div className="border-t border-gray-100 dark:border-white/6 px-4 py-3">
            <a
              href="/settings/compliance/sms-verification"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#15A4AE] hover:underline"
            >
              <RotateCcw className="w-3 h-3" /> Edit and resubmit
            </a>
          </div>
        )}
      </div>

      {/* ── Campaign cards ──────────────────────────────────────────────────── */}
      {campaigns.map(campaign => {
        const canSubmit = isAdmin
          && !campaign.provider_campaign_id
          && ['ready_for_review', 'draft'].includes(campaign.campaign_status)
          && !!(brand?.provider_brand_id)

        return (
          <div key={campaign.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/6">
              <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{campaign.campaign_name}</p>
                <p className="text-[11px] text-gray-400">{USE_CASE_LABELS[campaign.use_case] ?? campaign.use_case}</p>
              </div>
              <StatusPill status={campaign.campaign_status} />
            </div>
            <div className="px-4 py-3 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              {campaign.approved_at && (
                <p className="text-green-600 dark:text-green-400">✓ Approved {fmtDate(campaign.approved_at)}</p>
              )}
              {campaign.rejection_reason && (
                <div className="p-2.5 bg-red-50 dark:bg-red-500/8 border border-red-200 dark:border-red-500/15 rounded-lg text-red-600 dark:text-red-400 leading-relaxed">
                  {campaign.rejection_reason}
                </div>
              )}
              {canSubmit && (
                <div className="pt-1">
                  <p className="mb-2">Business verified — register your messaging campaign with US carriers.</p>
                  <button
                    onClick={() => handleSubmitCampaign(campaign.id)}
                    disabled={busy === campaign.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {busy === campaign.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                    {busy === campaign.id ? 'Registering…' : 'Register campaign'}
                  </button>
                  {errors[campaign.id] && (
                    <p className="mt-2 text-xs text-red-500 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{errors[campaign.id]}
                    </p>
                  )}
                </div>
              )}
              {!brand?.provider_brand_id && !['approved'].includes(campaign.campaign_status) && (
                <p>Waiting for brand approval before campaign can be submitted.</p>
              )}
              {(campaign.campaign_status === 'submitted' || campaign.campaign_status === 'pending_carrier_review') && (
                <p>Campaign is under carrier review (3–7 business days).</p>
              )}
            </div>
          </div>
        )
      })}

      {/* ── Number assignment ───────────────────────────────────────────────── */}
      {approvedCampaigns.length > 0 && phoneNumbers.length > 0 && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/6">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5 text-teal-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assign numbers to campaign</p>
              <p className="text-[11px] text-gray-400">Link your US numbers to an approved campaign to enable A2P SMS</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {phoneNumbers.map(num => {
              const assignment  = getAssignment(num.id)
              const assignedTo  = assignment ? campaigns.find(c => c.id === assignment.campaign_id) : null
              const isBusy      = busy === `assign-${num.id}`
              // If multiple approved campaigns, default to first; UI can be enhanced later
              const targetCampaign = approvedCampaigns.find(c => !assignment || c.id === assignment.campaign_id) ?? approvedCampaigns[0]

              return (
                <div key={num.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    assignment ? 'bg-green-50 dark:bg-green-500/10' : 'bg-gray-100 dark:bg-white/5'
                  }`}>
                    {assignment
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      : <Phone className="w-3.5 h-3.5 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{num.e164}</p>
                    <p className="text-[11px] text-gray-400">
                      {assignedTo ? `Assigned to: ${assignedTo.campaign_name}` : 'Not assigned to a campaign'}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => assignment ? handleRemove(num.id) : handleAssign(num.id, targetCampaign.id)}
                      disabled={isBusy}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                        assignment
                          ? 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-red-300 hover:text-red-500'
                          : 'bg-[#15A4AE] hover:bg-[#0e8f99] text-white'
                      }`}
                    >
                      {isBusy
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : assignment ? <Link2Off className="w-3 h-3" /> : <Link2 className="w-3 h-3" />
                      }
                      {isBusy ? '…' : assignment ? 'Remove' : 'Assign'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No US numbers yet */}
      {approvedCampaigns.length > 0 && phoneNumbers.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400">
          Campaign approved! Purchase a US phone number to assign it to this campaign and start sending A2P SMS.
        </div>
      )}

    </div>
  )
}
