import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, MessageSquare, Phone, Mic, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, Circle,
} from 'lucide-react'
import type { SmsProfileStatus, ComplianceRegistration } from '@/lib/types'
import { OptedOutContacts } from './opted-out-contacts'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance' }

type StatusBadgeProps = { status: string }
function StatusBadge({ status }: StatusBadgeProps) {
  const cfg: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    approved:     { label: 'Verified',      className: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    active:       { label: 'Active',        className: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    submitted:    { label: 'Submitted',     className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',    icon: <Clock className="w-3 h-3" /> },
    pending:      { label: 'Under review',  className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30', icon: <Clock className="w-3 h-3" /> },
    draft:        { label: 'Draft',         className: 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10',            icon: <Circle className="w-3 h-3" /> },
    rejected:     { label: 'Action needed', className: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',            icon: <AlertTriangle className="w-3 h-3" /> },
    not_started:  { label: 'Not started',   className: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10',            icon: <Circle className="w-3 h-3" /> },
  }
  const c = cfg[status] ?? cfg.not_started
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  )
}

export default async function CompliancePage() {
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

  const [{ data: profileRaw }, { data: regsRaw }, { data: campaignsCountRaw }] = await Promise.all([
    admin.from('sms_compliance_profiles').select('id, status').eq('workspace_id', workspaceId).eq('country_code', 'US').eq('compliance_type', 'A2P_10DLC').maybeSingle(),
    admin.from('compliance_registrations').select('*').eq('workspace_id', workspaceId),
    admin.from('sms_10dlc_campaigns').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('campaign_status', 'approved'),
  ])

  const smsProfile = profileRaw as { id: string; status: SmsProfileStatus } | null
  const regs       = (regsRaw ?? []) as ComplianceRegistration[]
  const approvedCampaignCount = (campaignsCountRaw as unknown as number | null) ?? 0

  const getReg = (type: string) => regs.find(r => r.type === type)
  const shakenReg = getReg('shaken_stir')
  const cnamReg   = getReg('cnam')
  const viReg     = getReg('voice_integrity')

  const a2pStatus = smsProfile?.status ?? 'not_started'

  const cards = [
    {
      key:      'a2p',
      title:    'US SMS Verification',
      subtitle: 'Required to send business SMS in the United States via mobile carriers.',
      icon:     <MessageSquare className="w-5 h-5 text-[#15A4AE]" />,
      bg:       'bg-[#15A4AE]/10',
      status:   a2pStatus,
      href:     '/settings/compliance/sms-verification',
      cta:      a2pStatus === 'not_started' ? 'Start verification' : a2pStatus === 'draft' ? 'Continue' : 'Manage',
      meta:     a2pStatus === 'approved' ? `${approvedCampaignCount} active campaign${approvedCampaignCount === 1 ? '' : 's'}` : null,
    },
    {
      key:      'shaken_stir',
      title:    'SHAKEN/STIR',
      subtitle: 'Authenticates your caller ID to prevent spam labelling on outbound calls.',
      icon:     <Phone className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      bg:       'bg-purple-50 dark:bg-purple-500/10',
      status:   shakenReg?.status ?? 'not_started',
      href:     '/settings/compliance/shaken-stir',
      cta:      shakenReg?.status === 'active' ? 'Manage' : 'Register',
      meta:     null,
    },
    {
      key:      'cnam',
      title:    'CNAM',
      subtitle: 'Displays your business name on outbound caller ID for higher answer rates.',
      icon:     <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      bg:       'bg-blue-50 dark:bg-blue-500/10',
      status:   cnamReg?.status ?? 'not_started',
      href:     '/settings/compliance/cnam',
      cta:      cnamReg?.status === 'active' ? 'Manage' : 'Register',
      meta:     null,
    },
    {
      key:      'voice_integrity',
      title:    'Voice Integrity',
      subtitle: 'Monitors your caller reputation and prevents your number being marked as spam.',
      icon:     <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />,
      bg:       'bg-green-50 dark:bg-green-500/10',
      status:   viReg?.status ?? 'not_started',
      href:     '/settings/compliance/voice-integrity',
      cta:      viReg?.status === 'active' ? 'Manage' : 'Enable',
      meta:     null,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#15A4AE]" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Compliance Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Registration and compliance status for SMS and voice channels.
          </p>
        </div>
      </div>

      {/* Registration status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.key} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`${card.bg} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</p>
                  {card.meta && <p className="text-xs text-gray-400">{card.meta}</p>}
                </div>
              </div>
              <StatusBadge status={card.status} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{card.subtitle}</p>
            <Link
              href={card.href}
              className="mt-auto flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              {card.cta}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        ))}
      </div>

      {/* A2P urgent notice if not started */}
      {a2pStatus === 'not_started' && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">US SMS verification required for delivery</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              US mobile carriers block unregistered business SMS. Complete US SMS verification to ensure your messages are delivered.
            </p>
            <Link href="/settings/compliance/sms-verification" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
              Start verification <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Opt-out management */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">
        <div className="bg-[#141c2b] rounded-xl border border-white/10 px-5 py-2.5 flex items-center gap-2.5 -m-px mb-0">
          <ShieldCheck className="w-3.5 h-3.5 text-white shrink-0" />
          <p className="text-[15px] font-semibold text-white">SMS Opt-out Management</p>
          <span className="text-white/30 text-sm">·</span>
          <p className="text-sm text-white/60">Contacts who replied STOP</p>
        </div>
        <div className="p-5">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Contacts who reply <strong>STOP, UNSUBSCRIBE, CANCEL, END,</strong> or <strong>QUIT</strong> are automatically opted out. Reply <strong>START</strong> or <strong>YES</strong> resubscribes them. You can also manually re-subscribe below.
          </div>
          <OptedOutContacts />
        </div>
      </div>

    </div>
  )
}
