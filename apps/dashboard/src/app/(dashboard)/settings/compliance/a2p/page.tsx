import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, MessageSquare, CheckCircle2, Clock, Circle,
  AlertTriangle, Plus, ChevronRight, Trash2,
} from 'lucide-react'
import type { ComplianceBrandProfile, ComplianceCampaign } from '@/lib/types'
import { submitA2PBrand, submitA2PCampaign, deleteA2PCampaign } from '@/app/actions/compliance'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'A2P 10DLC Registration' }

const STEP_FIELDS: { step: number; label: string; fields: (keyof ComplianceBrandProfile)[] }[] = [
  { step: 1, label: 'Business identity',  fields: ['company_type', 'legal_name', 'ein', 'vertical', 'website_url'] },
  { step: 2, label: 'Business address',   fields: ['street', 'city', 'state', 'postal_code'] },
  { step: 3, label: 'Primary contact',    fields: ['contact_first', 'contact_last', 'contact_email', 'contact_phone'] },
]

function brandCompletedSteps(brand: ComplianceBrandProfile): number {
  let completed = 0
  for (const s of STEP_FIELDS) {
    if (s.fields.every(f => brand[f])) completed++
  }
  return completed
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    approved:    { label: 'Approved',      cls: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    submitted:   { label: 'Submitted',     cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',   icon: <Clock className="w-3 h-3" /> },
    pending:     { label: 'Under review',  cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30', icon: <Clock className="w-3 h-3" /> },
    draft:       { label: 'Draft',         cls: 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10', icon: <Circle className="w-3 h-3" /> },
    rejected:    { label: 'Action needed', cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30', icon: <AlertTriangle className="w-3 h-3" /> },
    not_started: { label: 'Not started',   cls: 'bg-gray-100 dark:bg-white/8 text-gray-500 border-gray-200 dark:border-white/10', icon: <Circle className="w-3 h-3" /> },
  }
  const c = map[status] ?? map.not_started
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}>{c.icon}{c.label}</span>
}

const USE_CASE_LABELS: Record<string, string> = {
  marketing:             'Marketing',
  customer_care:         'Customer care',
  '2fa':                 'Two-factor auth (2FA)',
  delivery_notification: 'Delivery notifications',
  account_notification:  'Account notifications',
  security_alert:        'Security alerts',
  fraud_alert:           'Fraud alerts',
  low_volume:            'Low volume mixed',
  mixed:                 'Mixed',
}

export default async function A2PPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id')
    .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [{ data: brandRaw }, { data: campaignsRaw }] = await Promise.all([
    admin.from('compliance_brand_profiles').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    admin.from('compliance_campaigns').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
  ])

  const brand     = brandRaw as ComplianceBrandProfile | null
  const campaigns = (campaignsRaw ?? []) as ComplianceCampaign[]
  const completedSteps = brand ? brandCompletedSteps(brand) : 0
  const canSubmitBrand = brand && completedSteps === 3 && brand.status === 'draft'
  const brandApproved  = brand?.status === 'approved'
  const brandActive    = brand && ['submitted', 'pending', 'approved'].includes(brand.status)

  const submitBrandAction = brand ? submitA2PBrand.bind(null, brand.id) : null

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back */}
      <Link href="/settings/compliance" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />Back to Compliance
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-[#15A4AE]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">A2P 10DLC Registration</h1>
            <StatusBadge status={brand?.status ?? 'not_started'} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Register your business and messaging campaigns with US carriers to ensure SMS delivery.
          </p>
        </div>
      </div>

      {/* Explainer */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-6 text-sm text-blue-700 dark:text-blue-400">
        <p className="font-semibold mb-1">Two-step process</p>
        <ol className="text-xs leading-relaxed space-y-1 list-decimal list-inside">
          <li><strong>Brand registration</strong> — verify your business identity with The Campaign Registry (TCR). Takes 1–3 business days.</li>
          <li><strong>Campaign registration</strong> — describe how you use SMS. Requires an approved brand. Takes 3–7 business days.</li>
        </ol>
      </div>

      {/* ── Step 1: Brand ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            brandApproved ? 'bg-green-500 text-white' : brandActive ? 'bg-[#15A4AE] text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'
          }`}>
            {brandApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Brand registration</p>
        </div>

        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
          {!brand ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Register your business</p>
                <p className="text-xs text-gray-400 mt-0.5">Provide your legal business details and contact information for TCR review.</p>
              </div>
              <Link href="/settings/compliance/a2p/brand" className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-xl transition-colors">
                Start <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress steps */}
              <div className="flex items-center gap-1">
                {STEP_FIELDS.map((s, i) => {
                  const done = s.fields.every(f => brand[f])
                  return (
                    <div key={s.step} className="flex items-center gap-1 flex-1">
                      <div className={`flex-1 h-1.5 rounded-full ${done ? 'bg-[#15A4AE]' : 'bg-gray-100 dark:bg-white/10'}`} />
                      {i < STEP_FIELDS.length - 1 && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? 'bg-[#15A4AE]' : 'bg-gray-200 dark:bg-white/10'}`} />}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{brand.legal_name ?? 'Unnamed brand'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{completedSteps}/3 sections complete · {brand.company_type?.replace('_', ' ') ?? 'No type set'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {brand.status === 'draft' && (
                    <Link href="/settings/compliance/a2p/brand" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors">
                      Edit
                    </Link>
                  )}
                  {canSubmitBrand && submitBrandAction && (
                    <form action={submitBrandAction}>
                      <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#15A4AE] hover:bg-[#0e8f99] text-white transition-colors">
                        Submit to Telnyx
                      </button>
                    </form>
                  )}
                  {brand.status === 'rejected' && (
                    <Link href="/settings/compliance/a2p/brand" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                      Update & resubmit
                    </Link>
                  )}
                  {['submitted', 'pending', 'approved'].includes(brand.status) && (
                    <span className="text-xs text-gray-400 italic">
                      {brand.status === 'approved' ? `Approved ${brand.reviewed_at ? new Date(brand.reviewed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}` : 'Awaiting TCR review…'}
                    </span>
                  )}
                </div>
              </div>
              {brand.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 text-xs text-red-700 dark:text-red-400">
                  <strong>Rejection reason:</strong> {brand.rejection_reason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Campaigns ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            campaigns.some(c => c.status === 'approved') ? 'bg-green-500 text-white' : brandApproved ? 'bg-[#15A4AE] text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'
          }`}>
            {campaigns.some(c => c.status === 'approved') ? <CheckCircle2 className="w-3.5 h-3.5" /> : '2'}
          </div>
          <p className={`text-sm font-semibold ${brandApproved ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
            Campaign registration
          </p>
          {!brandApproved && <span className="text-xs text-gray-400">(requires approved brand)</span>}
        </div>

        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          {!brandApproved ? (
            <div className="p-5 flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Complete brand registration first to unlock campaigns.</p>
            </div>
          ) : (
            <>
              {/* Campaign list */}
              {campaigns.length > 0 && (
                <div className="divide-y dark:divide-white/5">
                  {campaigns.map(camp => {
                    const submitCampaignAction = submitA2PCampaign.bind(null, camp.id)
                    const deleteCampaignAction = deleteA2PCampaign.bind(null, camp.id)
                    return (
                      <div key={camp.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{camp.name ?? 'Unnamed campaign'}</p>
                            <StatusBadge status={camp.status} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{USE_CASE_LABELS[camp.use_case ?? ''] ?? camp.use_case ?? '—'}</p>
                          {camp.rejection_reason && (
                            <p className="text-xs text-red-500 mt-0.5">{camp.rejection_reason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {camp.status === 'draft' && (
                            <>
                              <form action={submitCampaignAction}>
                                <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#15A4AE] hover:bg-[#0e8f99] text-white transition-colors">Submit</button>
                              </form>
                              <form action={deleteCampaignAction}>
                                <button type="submit" className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add campaign */}
              <div className="p-4 border-t dark:border-white/5 first:border-t-0">
                <Link
                  href={`/settings/compliance/a2p/campaign/new?brand=${brand?.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-500 hover:border-[#15A4AE]/50 hover:text-[#15A4AE] hover:bg-[#15A4AE]/5 transition-colors"
                >
                  <Plus className="w-4 h-4" />New campaign
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  )
}
