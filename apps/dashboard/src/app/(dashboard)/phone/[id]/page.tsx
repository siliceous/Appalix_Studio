import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import {
  ArrowLeft, Phone, Mic, MessageSquare, Settings, CheckCircle2,
  PhoneIncoming, PhoneOutgoing, Clock, Bot, AlertTriangle,
  ExternalLink, Trash2,
} from 'lucide-react'
import type { WorkspacePhoneNumber, VoiceAgent, Bot as BotType } from '@/lib/types'
import type { Metadata } from 'next'
import { CallListClient, type CallRecord } from './call-list'
import { PhoneVoiceSettingsForm } from './phone-voice-settings-form'
import { updatePhoneNumberBot, updatePhoneNumberVoiceSettings } from '@/app/actions/voice'

export const metadata: Metadata = { title: 'Phone Number' }

type AgentRow  = Pick<VoiceAgent, 'id' | 'name' | 'type' | 'is_active' | 'preset'>
type BotRow    = Pick<BotType, 'id' | 'name'>
type SmsConvo  = { id: string; title: string | null; status: string; message_count: number; last_activity_at: string }

function toFlag(code: string) {
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('')
}

const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia', US: 'United States', GB: 'United Kingdom',
  CA: 'Canada',   NZ: 'New Zealand',
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'calls',    label: 'Calls' },
  { key: 'sms',      label: 'SMS' },
  { key: 'settings', label: 'Settings' },
]

function fmtDuration(secs: number | null) {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default async function PhoneNumberDetailPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id }  = await params
  const { tab } = await searchParams
  const activeTab = tab ?? 'overview'

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
  const { data: numRaw } = await (supabase as any)
    .from('workspace_phone_numbers')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!numRaw) notFound()
  const num = numRaw as WorkspacePhoneNumber

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Always fetch linked agent + bot (used in header + overview)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentQ = (supabase as any)
    .from('voice_agents')
    .select('id, name, type, is_active, preset')
    .eq('workspace_id', workspaceId)
    .eq('phone_number', num.e164)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const botQ = num.bot_id
    ? (supabase as any).from('bots').select('id, name').eq('id', num.bot_id).maybeSingle()
    : Promise.resolve({ data: null as null })

  const [{ data: agentRaw }, { data: botRaw }] = await Promise.all([agentQ, botQ])
  const linkedAgent = agentRaw as AgentRow | null
  const linkedBot   = botRaw   as BotRow  | null

  // ── Per-tab data ──────────────────────────────────────────────────────────
  let calls: CallRecord[] = []
  let smsConvos: SmsConvo[] = []
  let allAgents: AgentRow[] = []
  let allBots: BotRow[] = []
  let totalCalls = 0, inboundCalls = 0, outboundCalls = 0
  let avgDuration: number | null = null
  let smsSent = 0, smsRecv = 0

  if (activeTab === 'overview') {
    const { data: callStatsRaw } = await admin
      .from('call_sessions')
      .select('direction, status, duration_seconds')
      .eq('phone_number_id', id)
    const cs = (callStatsRaw ?? []) as { direction: string; status: string; duration_seconds: number | null }[]
    totalCalls    = cs.length
    inboundCalls  = cs.filter(c => c.direction === 'inbound').length
    outboundCalls = cs.filter(c => c.direction === 'outbound').length
    const durs = cs.filter(c => c.status === 'ended' && c.duration_seconds != null).map(c => c.duration_seconds!)
    avgDuration = durs.length ? Math.round(durs.reduce((s, d) => s + d, 0) / durs.length) : null

    const { data: usageRaw } = await admin
      .from('usage_events')
      .select('usage_type')
      .eq('workspace_id', workspaceId)
      .eq('source_table', 'workspace_phone_numbers')
      .eq('source_id', id)
    const usage = (usageRaw ?? []) as { usage_type: string }[]
    smsSent = usage.filter(u => u.usage_type === 'sms_outbound_segment').length
    smsRecv = usage.filter(u => u.usage_type === 'sms_inbound_message').length
  }

  if (activeTab === 'calls') {
    const { data: callsRaw } = await admin
      .from('call_sessions')
      .select(`id, from_e164, to_e164, direction, status, duration_seconds,
               hangup_cause, conversation_id, transcript, answered_at, ended_at,
               created_at, voice_agents ( name )`)
      .eq('phone_number_id', id)
      .order('created_at', { ascending: false })
      .limit(100)
    calls = (callsRaw ?? []) as CallRecord[]
    totalCalls = calls.length
  }

  if (activeTab === 'sms') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: convosRaw } = await (supabase as any)
      .from('conversations')
      .select('id, title, status, message_count, last_activity_at')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'sms')
      .order('last_activity_at', { ascending: false })
      .limit(50)
    smsConvos = (convosRaw ?? []) as SmsConvo[]
  }

  if (activeTab === 'settings') {
    const [{ data: agentsRaw }, { data: botsRaw }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('voice_agents').select('id, name, type, is_active')
        .eq('workspace_id', workspaceId).order('name'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('bots').select('id, name')
        .eq('workspace_id', workspaceId).order('name'),
    ])
    allAgents = (agentsRaw ?? []) as AgentRow[]
    allBots   = (botsRaw   ?? []) as BotRow[]
  }

  const saveBotAction          = updatePhoneNumberBot.bind(null, id)
  const saveVoiceSettingsAction = updatePhoneNumberVoiceSettings.bind(null, id)

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar pageKey="calls" />

      {/* ── Dark top bar ───────────────────────────────────────────────────── */}
      <div className="bg-[#141c2b] px-8 shrink-0">
        <div className="max-w-5xl mx-auto">

          {/* Back + number identity */}
          <div className="flex items-center gap-4 pt-4 pb-3">
            <Link href="/phone"
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs transition-colors shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" />Back
            </Link>
            <div className="w-px h-4 bg-white/20 shrink-0" />
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{toFlag(num.country_code)}</span>
              <div>
                <p className="text-base font-mono font-bold text-white leading-tight">{num.e164}</p>
                <p className="text-xs text-white/50">{COUNTRY_NAMES[num.country_code] ?? num.country_code}</p>
              </div>
            </div>

            {/* Capability badges */}
            <div className="flex items-center gap-1.5 ml-2">
              {num.capabilities?.sms   && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20   text-blue-300">SMS</span>}
              {num.capabilities?.voice && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Voice</span>}
              {num.capabilities?.mms   && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/20  text-green-300">MMS</span>}
            </div>

            {/* Linked services (compact) */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {linkedAgent && (
                <Link href={`/phone/voice-agents/${linkedAgent.id}`}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                  <Mic className="w-3 h-3" />{linkedAgent.name}
                  {linkedAgent.is_active
                    ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />}
                </Link>
              )}
              {linkedBot && (
                <Link href={`/agent/bots/${linkedBot.id}`}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                  <Bot className="w-3 h-3" />{linkedBot.name}
                </Link>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0.5">
            {TABS.map(t => (
              <Link key={t.key} href={`/phone/${id}?tab=${t.key}`}
                className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === t.key
                    ? 'text-white border-[#15A4AE]'
                    : 'text-white/50 border-transparent hover:text-white/80'
                }`}>
                {t.label}
                {t.key === 'calls' && activeTab === 'calls' && totalCalls > 0 && (
                  <span className="ml-1.5 text-white/40 text-[10px]">{totalCalls}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="px-8 pt-4 pb-8">
      <div className="max-w-5xl mx-auto">

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">

            {/* Call stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total calls',  value: totalCalls,             icon: Phone,         color: 'text-[#15A4AE]',                      bg: 'bg-[#15A4AE]/10' },
                { label: 'Inbound',      value: inboundCalls,           icon: PhoneIncoming, color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10' },
                { label: 'Outbound',     value: outboundCalls,          icon: PhoneOutgoing, color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10' },
                { label: 'Avg duration', value: fmtDuration(avgDuration), icon: Clock,       color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex items-center gap-4">
                  <div className={`${s.bg} p-2.5 rounded-lg shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                  <div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* SMS stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'SMS sent (all time)',     value: smsSent, icon: PhoneOutgoing, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                { label: 'SMS received (all time)', value: smsRecv, icon: MessageSquare, color: 'text-[#15A4AE]',                  bg: 'bg-[#15A4AE]/10' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex items-center gap-4">
                  <div className={`${s.bg} p-2.5 rounded-lg shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                  <div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Linked services */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voice agent card */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Voice Agent</p>
                </div>
                {linkedAgent ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{linkedAgent.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        linkedAgent.is_active
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-white/8 text-gray-500'
                      }`}>{linkedAgent.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-xs text-gray-400 capitalize">
                      {linkedAgent.type} · {linkedAgent.preset ?? 'Custom'}
                    </p>
                    <Link href={`/phone/voice-agents/${linkedAgent.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-[#15A4AE] hover:underline mt-1">
                      Configure agent <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400 mb-3">No voice agent linked to this number.</p>
                    <Link href="/phone/voice-agents/new" className="text-xs text-[#15A4AE] hover:underline">
                      Create a voice agent →
                    </Link>
                  </div>
                )}
              </div>

              {/* SMS bot card */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-[#15A4AE]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">SMS Auto-reply Bot</p>
                </div>
                {linkedBot ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{linkedBot.name}</p>
                    <p className="text-xs text-gray-400">Automatically replies to inbound SMS on this number.</p>
                    <Link href={`/agent/bots/${linkedBot.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-[#15A4AE] hover:underline mt-1">
                      Configure bot <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400 mb-3">No bot linked for SMS auto-replies.</p>
                    <Link href={`/phone/${id}?tab=settings`} className="text-xs text-[#15A4AE] hover:underline">
                      Link a bot in Settings →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/phone/${id}?tab=calls`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <PhoneIncoming className="w-4 h-4 text-green-500" />Call history
                </Link>
                <Link href={`/phone/${id}?tab=sms`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <MessageSquare className="w-4 h-4 text-[#15A4AE]" />SMS conversations
                </Link>
                <Link href={`/phone/${id}?tab=settings`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 dark:bg-white/5 border dark:border-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <Settings className="w-4 h-4 text-gray-500" />Configure
                </Link>
                {!linkedAgent && (
                  <Link href="/phone/voice-agents/new"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#15A4AE]/10 border border-[#15A4AE]/20 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                    <Mic className="w-4 h-4" />Add voice agent
                  </Link>
                )}
                {!linkedBot && (
                  <Link href={`/phone/${id}?tab=settings`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#15A4AE]/10 border border-[#15A4AE]/20 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                    <Bot className="w-4 h-4" />Link SMS bot
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CALLS ──────────────────────────────────────────────────── */}
        {activeTab === 'calls' && (
          <div className="rounded-2xl overflow-hidden shadow-sm border dark:border-white/8">
            <div className="bg-[#141c2b] px-5 py-2.5 flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-white shrink-0" />
              <p className="text-sm font-semibold text-white">Call history</p>
              <span className="text-white/30 text-sm">·</span>
              <p className="text-sm text-white/60">{num.e164}</p>
              {calls.length > 0 && <span className="ml-auto text-xs text-white/40">{calls.length} records</span>}
            </div>
            <div className="bg-white dark:bg-[#232323]">
              <CallListClient calls={calls} />
            </div>
          </div>
        )}

        {/* ── SMS ────────────────────────────────────────────────────── */}
        {activeTab === 'sms' && (
          <div className="rounded-2xl overflow-hidden shadow-sm border dark:border-white/8">
            <div className="bg-[#141c2b] px-5 py-2.5 flex items-center gap-2.5">
              <MessageSquare className="w-3.5 h-3.5 text-white shrink-0" />
              <p className="text-sm font-semibold text-white">SMS conversations</p>
              <span className="text-white/30 text-sm">·</span>
              <p className="text-sm text-white/60">{num.e164}</p>
              <Link href="/dashboard/sms"
                className="ml-auto flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />Open SMS inbox
              </Link>
            </div>
            <div className="bg-white dark:bg-[#232323]">
              {smsConvos.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No SMS conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Inbound SMS will appear here once someone texts this number.</p>
                </div>
              ) : (
                <div className="divide-y dark:divide-white/5">
                  {smsConvos.map(convo => (
                    <Link key={convo.id} href={`/conversations?id=${convo.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-[#15A4AE]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {convo.title ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {convo.message_count} message{convo.message_count === 1 ? '' : 's'} ·{' '}
                          {new Date(convo.last_activity_at).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        convo.status === 'active'
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-white/8 text-gray-500'
                      }`}>{convo.status}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ───────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-4">

            {/* Number details */}
            <div className="rounded-2xl overflow-hidden shadow-sm border dark:border-white/8">
              <div className="bg-[#141c2b] px-5 py-2.5 flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                <p className="text-sm font-semibold text-white">Number details</p>
              </div>
              <div className="bg-white dark:bg-[#232323] p-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  {[
                    { label: 'E.164 number',      value: num.e164 },
                    { label: 'Country',            value: `${toFlag(num.country_code)} ${COUNTRY_NAMES[num.country_code] ?? num.country_code}` },
                    { label: 'Provider',           value: num.provider },
                    { label: 'Purchased',          value: new Date(num.purchased_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { label: 'Capabilities',       value: [num.capabilities?.sms && 'SMS', num.capabilities?.voice && 'Voice', num.capabilities?.mms && 'MMS'].filter(Boolean).join(' · ') || '—' },
                    { label: 'Messaging profile',  value: num.messaging_profile_id ?? '—' },
                  ].map(row => (
                    <div key={row.label}>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{row.label}</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SMS Bot */}
            <div className="rounded-2xl overflow-hidden shadow-sm border dark:border-white/8">
              <div className="bg-[#141c2b] px-5 py-2.5 flex items-center gap-2.5">
                <Bot className="w-3.5 h-3.5 text-white shrink-0" />
                <p className="text-sm font-semibold text-white">SMS Auto-reply Bot</p>
                <span className="text-white/30 text-sm">·</span>
                <p className="text-sm text-white/60">Responds automatically to inbound SMS</p>
              </div>
              <div className="bg-white dark:bg-[#232323] p-6">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Select a bot to auto-reply to inbound SMS on this number. Leave blank to disable auto-replies.
                </p>
                <form action={saveBotAction} className="flex items-center gap-3">
                  <select name="bot_id" defaultValue={num.bot_id ?? ''}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-200">
                    <option value="">— No auto-reply bot —</option>
                    {allBots.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <button type="submit"
                    className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-xl transition-colors shrink-0">
                    Save
                  </button>
                </form>
              </div>
            </div>

            {/* Voice agent */}
            <div className="rounded-2xl overflow-hidden shadow-sm border dark:border-white/8">
              <div className="bg-[#141c2b] px-5 py-2.5 flex items-center gap-2.5">
                <Mic className="w-3.5 h-3.5 text-white shrink-0" />
                <p className="text-sm font-semibold text-white">Voice Agent</p>
                <span className="text-white/30 text-sm">·</span>
                <p className="text-sm text-white/60">Handles inbound & outbound calls</p>
              </div>
              <div className="bg-white dark:bg-[#232323] p-6">
                {linkedAgent ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{linkedAgent.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {linkedAgent.type} · {linkedAgent.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <Link href={`/phone/voice-agents/${linkedAgent.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors">
                      <Settings className="w-3 h-3" />Configure
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      No voice agent assigned. Create one and set this number as its phone number.
                    </p>
                    <Link href="/phone/voice-agents/new"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#15A4AE] text-white hover:bg-[#0e8f99] transition-colors shrink-0 ml-4">
                      <Mic className="w-3 h-3" />Create agent
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Voice settings */}
            <div className="rounded-2xl overflow-hidden shadow-sm border dark:border-white/8">
              <div className="bg-[#141c2b] px-5 py-2.5 flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                <p className="text-sm font-semibold text-white">Voice Settings</p>
                <span className="text-white/30 text-sm">·</span>
                <p className="text-sm text-white/60">Recording, voicemail & text-back for this number</p>
              </div>
              <div className="bg-white dark:bg-[#232323]">
                <PhoneVoiceSettingsForm num={num} action={saveVoiceSettingsAction} />
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-red-200 dark:border-red-500/20">
              <div className="bg-red-50 dark:bg-red-500/10 px-5 py-2.5 flex items-center gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</p>
              </div>
              <div className="bg-white dark:bg-[#232323] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Release this number</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Permanently releases {num.e164} from your account. This cannot be undone.
                    </p>
                  </div>
                  <Link href={`/integrations/sms/setup?release=${id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 ml-4">
                    <Trash2 className="w-3 h-3" />Release number
                  </Link>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
      </div>
      </div>
    </div>
  )
}
