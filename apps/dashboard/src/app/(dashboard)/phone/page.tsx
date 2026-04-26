import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import {
  Phone, PhoneIncoming, PhoneOutgoing, MessageSquare,
  Plus, Settings, ShoppingCart, Mic, CheckCircle2, XCircle,
} from 'lucide-react'
import type { WorkspacePhoneNumber, VoiceAgent, Bot } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Phone Numbers' }

function toFlag(code: string) {
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('')
}

const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia', US: 'United States', GB: 'United Kingdom',
  CA: 'Canada',   NZ: 'New Zealand',
}

export default async function PhonePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id')
    .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const admin = createAdminClient()

  // Fetch all active numbers + supporting data in parallel
  const [
    { data: numbersRaw },
    { data: agentsRaw },
    { data: botsRaw },
    { data: callCountsRaw },
    { data: smsUsageRaw },
  ] = await Promise.all([
    supabase.from('workspace_phone_numbers')
      .select('*').eq('workspace_id', workspaceId).is('released_at', null)
      .order('purchased_at', { ascending: false }),

    supabase.from('voice_agents')
      .select('id, name, type, phone_number, is_active')
      .eq('workspace_id', workspaceId),

    supabase.from('bots')
      .select('id, name').eq('workspace_id', workspaceId).order('name'),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('call_sessions')
      .select('phone_number_id')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('usage_events')
      .select('source_id, usage_type')
      .eq('workspace_id', workspaceId)
      .eq('source_table', 'workspace_phone_numbers')
      .gte('occurred_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const numbers   = (numbersRaw  ?? []) as WorkspacePhoneNumber[]
  const agents    = (agentsRaw   ?? []) as Pick<VoiceAgent, 'id' | 'name' | 'type' | 'phone_number' | 'is_active'>[]
  const bots      = (botsRaw     ?? []) as Pick<Bot, 'id' | 'name'>[]

  // Aggregate call counts per phone_number_id
  const callMap = ((callCountsRaw ?? []) as { phone_number_id: string }[])
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.phone_number_id] = (acc[r.phone_number_id] ?? 0) + 1
      return acc
    }, {})

  // Aggregate SMS usage per source_id
  const smsSentMap  = ((smsUsageRaw ?? []) as { source_id: string; usage_type: string }[])
    .filter(r => r.usage_type === 'sms_outbound_segment')
    .reduce<Record<string, number>>((acc, r) => { acc[r.source_id] = (acc[r.source_id] ?? 0) + 1; return acc }, {})
  const smsRecvMap  = ((smsUsageRaw ?? []) as { source_id: string; usage_type: string }[])
    .filter(r => r.usage_type === 'sms_inbound_message')
    .reduce<Record<string, number>>((acc, r) => { acc[r.source_id] = (acc[r.source_id] ?? 0) + 1; return acc }, {})

  const smsCapable   = numbers.filter(n => n.capabilities?.sms).length
  const voiceCapable = numbers.filter(n => n.capabilities?.voice).length
  const totalCalls30d = Object.values(callMap).reduce((s, v) => s + v, 0)

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar pageKey="phone" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-8 shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between pt-4 pb-1">
            <div>
              <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Phone Numbers</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage numbers, voice agents, SMS, and call activity
              </p>
            </div>
            <a
              href="/integrations/sms/setup"
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />Buy a number
            </a>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="px-8 pt-3 pb-8">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total numbers', value: numbers.length,   icon: Phone,         color: 'text-[#15A4AE]',                      bg: 'bg-[#15A4AE]/10' },
            { label: 'SMS-capable',   value: smsCapable,       icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'Voice-capable', value: voiceCapable,     icon: Mic,           color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
            { label: 'Calls (30d)',   value: totalCalls30d,    icon: PhoneIncoming, color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex items-center gap-4">
              <div className={`${s.bg} p-2.5 rounded-lg shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Numbers card */}
        <div className="rounded-2xl overflow-hidden shadow-sm border dark:border-white/8">

          {/* Dark bar */}
          <div className="bg-[#141c2b] px-4 py-2.5 flex items-center gap-3">
            <Phone className="w-3.5 h-3.5 text-white/60 shrink-0" />
            <p className="text-sm font-semibold text-white">Your numbers</p>
            {numbers.length > 0 && (
              <span className="text-xs text-white/40">{numbers.length} active</span>
            )}
            <a
              href="/integrations/sms/setup"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />Buy number
            </a>
          </div>

          {/* Card body */}
          <div className="bg-white dark:bg-[#232323]">
            {numbers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#15A4AE]/10 flex items-center justify-center mb-4">
                  <Phone className="w-7 h-7 text-[#15A4AE]" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">No phone numbers yet</p>
                <p className="text-xs text-gray-400 max-w-sm mb-5">
                  Purchase a number to start receiving inbound calls, handling SMS, and running voice agents.
                </p>
                <a
                  href="/integrations/sms/setup"
                  className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm rounded-lg transition-colors"
                >
                  Buy your first number
                </a>
              </div>
            ) : (
              <div className="divide-y dark:divide-white/5">
                {numbers.map(num => {
                  const linkedAgent = agents.find(a => a.phone_number === num.e164)
                  const linkedBot   = bots.find(b => b.id === num.bot_id)
                  const calls30d    = callMap[num.id] ?? 0
                  const smsSent     = smsSentMap[num.id] ?? 0
                  const smsRecv     = smsRecvMap[num.id] ?? 0

                  return (
                    <div key={num.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">

                      {/* Flag + number */}
                      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 text-xl">
                        {toFlag(num.country_code)}
                      </div>
                      <div className="w-52 shrink-0">
                        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{num.e164}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{COUNTRY_NAMES[num.country_code] ?? num.country_code}</p>
                      </div>

                      {/* Capabilities */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {num.capabilities?.sms && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <MessageSquare className="w-2.5 h-2.5" />SMS
                          </span>
                        )}
                        {num.capabilities?.voice && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Mic className="w-2.5 h-2.5" />Voice
                          </span>
                        )}
                        {num.capabilities?.mms && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400">
                            MMS
                          </span>
                        )}
                      </div>

                      {/* Linked services */}
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        {linkedAgent ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20">
                            <Mic className="w-3 h-3" />
                            {linkedAgent.name}
                            {linkedAgent.is_active
                              ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                              : <XCircle className="w-3 h-3 text-gray-400" />}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600 italic">No voice agent</span>
                        )}
                        {linkedBot && (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] border border-[#15A4AE]/20">
                            <MessageSquare className="w-3 h-3" />{linkedBot.name}
                          </span>
                        )}
                      </div>

                      {/* 30d stats */}
                      <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1 text-center">
                          <PhoneIncoming className="w-3.5 h-3.5 text-green-500" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{calls30d}</span>
                          <span>calls</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{smsSent}</span>
                          <span>out</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-[#15A4AE]" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{smsRecv}</span>
                          <span>in</span>
                        </div>
                      </div>

                      {/* Configure */}
                      <Link
                        href={`/phone/${num.id}`}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Settings className="w-3.5 h-3.5" />Configure
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
      </div>
      </div>
    </div>
  )
}
