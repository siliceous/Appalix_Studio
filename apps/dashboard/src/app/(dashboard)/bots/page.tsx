import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { SourcesPoller } from '@/app/(dashboard)/sources/sources-poller'
import { IconSubmitButton } from '@/components/ui/submit-button'
import { deleteSource, resyncSource } from '@/app/actions/source'
import { deleteVoiceKnowledgeEntry } from '@/app/actions/voice'
import {
  Plus, PhoneCall, PhoneIncoming, PhoneOutgoing, Zap,
  BookOpen, RefreshCw, Trash2, Pencil, CheckCircle2, Clock, AlertCircle, Loader2, Mic, Phone,
  Link as LinkIcon, FileText, AlignLeft, Cloud, HardDrive,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Bot as BotRow, Conversation, UsageEvent, Source, VoiceKnowledgeEntry, VoiceAgent } from '@/lib/types'
import { BotsTabClient } from './bots-tab-client'
import { BotTrainingForm } from './bot-training-form'
import { VoiceEntryForm } from './voice-entry-form'

export const metadata: Metadata = { title: 'Bots' }

type RecentConversation = Pick<Conversation, 'id' | 'title' | 'platform' | 'status' | 'message_count' | 'last_activity_at'>
type UsageSummaryRow    = Pick<UsageEvent, 'tokens_input' | 'tokens_output' | 'cost_usd'>

const TABS = [
  { key: 'bots',           label: 'Bots' },
  { key: 'knowledge-base', label: 'Knowledge Base' },
  { key: 'training',       label: 'Voice Training' },
  { key: 'phone-agents',   label: 'Phone Agents' },
]

const KB_SUBTABS = [
  { key: 'sources', label: 'Sources' },
  { key: 'voice',   label: 'Voice Scripts' },
]

const TYPE_ICON: Record<string, React.ReactNode> = {
  url:          <LinkIcon className="w-4 h-4 text-brand-600" />,
  sitemap:      <LinkIcon className="w-4 h-4 text-brand-600" />,
  text:         <AlignLeft className="w-4 h-4 text-brand-600" />,
  file:         <FileText className="w-4 h-4 text-brand-600" />,
  excel:        <FileText className="w-4 h-4 text-green-600" />,
  csv:          <FileText className="w-4 h-4 text-blue-500" />,
  notion:       <BookOpen className="w-4 h-4 text-brand-600" />,
  gitbook:      <BookOpen className="w-4 h-4 text-brand-600" />,
  google_drive: <Cloud className="w-4 h-4 text-brand-600" />,
  dropbox:      <Cloud className="w-4 h-4 text-brand-600" />,
  onedrive:     <HardDrive className="w-4 h-4 text-brand-600" />,
  sharepoint:   <HardDrive className="w-4 h-4 text-brand-600" />,
}

const STATUS_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    className: 'bg-gray-100 text-gray-600',     icon: <Clock className="w-3 h-3" /> },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700',     icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  ready:      { label: 'Ready',      className: 'bg-green-100 text-green-700',   icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:     { label: 'Failed',     className: 'bg-red-100 text-red-700',       icon: <AlertCircle className="w-3 h-3" /> },
  outdated:   { label: 'Outdated',   className: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
}

const PRESET_LABELS: Record<string, string> = {
  receptionist: 'Receptionist',
  sales:        'Sales Closer',
  support:      'Support Specialist',
  booking:      'Appointment Setter',
  lead_capture: 'Lead Capture',
}

const GOAL_LABELS: Record<string, string> = {
  book_meeting:   'Book Meeting',
  capture_lead:   'Capture Lead',
  resolve_ticket: 'Resolve Ticket',
  sales_pitch:    'Sales Pitch',
  take_message:   'Take Message',
  route_human:    'Route to Human',
}

const AGENT_TYPE_CONFIG = {
  inbound:  { label: 'Inbound',       icon: PhoneIncoming,  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10' },
  outbound: { label: 'Outbound',      icon: PhoneOutgoing,  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10' },
  both:     { label: 'Inbound + Out', icon: Phone,          color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
}

const KB_CATEGORIES: { id: VoiceKnowledgeEntry['category']; label: string; color: string; bg: string; desc: string }[] = [
  { id: 'faq',        label: 'FAQs',                color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-500/10',     desc: 'Common questions and spoken answers' },
  { id: 'objection',  label: 'Objection Handling',  color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10',   desc: 'How to respond to pushback and hesitation' },
  { id: 'booking',    label: 'Booking Phrases',      color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-500/10',   desc: 'Scripts for scheduling and confirming appointments' },
  { id: 'escalation', label: 'Escalation Phrases',   color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-500/10',       desc: 'Handoff language for routing to a human' },
  { id: 'script',     label: 'Call Scripts',         color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', desc: 'Full flow scripts for specific call types' },
  { id: 'compliance', label: 'Compliance Lines',     color: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-100 dark:bg-white/8',        desc: 'Required disclosures and consent language' },
  { id: 'greeting',   label: 'Greetings',            color: 'text-[#15A4AE]',                       bg: 'bg-[#15A4AE]/10',                    desc: 'Opening lines for different call types' },
  { id: 'fallback',   label: 'Fallback Phrases',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', desc: "What to say when the bot doesn't understand" },
]

export default async function BotsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; subtab?: string; bot?: string; filter?: string; category?: string; new?: string }>
}) {
  const params = await searchParams
  const activeTab    = params.tab ?? 'bots'
  const activeSubtab = params.subtab ?? 'sources'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const workspaceId = membership.workspace_id

  // ── Tab 1: Bots ──────────────────────────────────────────────────────────
  let bots: BotRow[] = []
  let recentConversations: RecentConversation[] = []
  let usageSummary: UsageSummaryRow[] = []
  let totalConversations = 0
  let totalBots = 0
  let totalIntegrations = 0

  if (activeTab === 'bots') {
    const [
      { data: botsRaw },
      { count: convCount },
      { count: botCount },
      { count: intCount },
      { data: recentRaw },
      { data: usageRaw },
    ] = await Promise.all([
      supabase.from('bots').select('*, integrations(count)').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('platform', 'sms').neq('platform', 'voice'),
      supabase.from('bots').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase.from('integrations').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'active'),
      supabase.from('conversations').select('id, title, platform, status, message_count, last_activity_at, created_at').eq('workspace_id', workspaceId).neq('platform', 'sms').neq('platform', 'voice').order('last_activity_at', { ascending: false }).limit(8),
      supabase.from('usage_events').select('tokens_input, tokens_output, cost_usd').eq('workspace_id', workspaceId).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ])
    bots                = (botsRaw   ?? []) as BotRow[]
    recentConversations = (recentRaw  ?? []) as RecentConversation[]
    usageSummary        = (usageRaw   ?? []) as UsageSummaryRow[]
    totalConversations  = convCount ?? 0
    totalBots           = botCount  ?? 0
    totalIntegrations   = intCount  ?? 0
  }

  // ── Tab 2: Training ───────────────────────────────────────────────────────
  let trainingBots: Pick<BotRow, 'id' | 'name' | 'enable_voice' | 'voice_preset' | 'voice_mode'>[] = []
  let selectedBotFull: Pick<BotRow, 'id' | 'name' | 'enable_voice' | 'voice_mode' | 'voice_name' | 'voice_preset' | 'voice_goal' | 'voice_config'> | null = null

  if (activeTab === 'training') {
    const { data: botsRaw } = await supabase
      .from('bots').select('id,name,enable_voice,voice_preset,voice_mode')
      .eq('workspace_id', workspaceId).order('name', { ascending: true })
    trainingBots = (botsRaw ?? []) as typeof trainingBots

    if (params.bot) {
      const { data: fullBotRaw } = await supabase
        .from('bots').select('id,name,enable_voice,voice_mode,voice_name,voice_preset,voice_goal,voice_config')
        .eq('id', params.bot).eq('workspace_id', workspaceId).single()
      selectedBotFull = (fullBotRaw ?? null) as typeof selectedBotFull
    }
  }

  // ── Tab 3: Knowledge Base ─────────────────────────────────────────────────
  let sources: Source[] = []
  let hasActiveJobs = false
  let kbEntries: VoiceKnowledgeEntry[] = []
  let kbBots: Pick<BotRow, 'id' | 'name' | 'enable_voice'>[] = []
  let allKbEntries: { category: string }[] = []
  let categoryCounts: Record<string, number> = {}

  if (activeTab === 'knowledge-base') {
    if (activeSubtab === 'sources') {
      const { data: rawSources } = await supabase.from('sources').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
      sources      = (rawSources ?? []) as Source[]
      hasActiveJobs = sources.some(s => s.status === 'pending' || s.status === 'processing')
    } else {
      const activeCategory = params.category as VoiceKnowledgeEntry['category'] | undefined
      const activeBotId    = params.bot

      let entriesQuery = supabase
        .from('voice_knowledge_entries').select('*').eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: false })
      if (activeCategory) entriesQuery = entriesQuery.eq('category', activeCategory)
      if (activeBotId)    entriesQuery = entriesQuery.eq('bot_id', activeBotId)

      const [
        { data: entriesRaw },
        { data: botsRaw },
        { data: allEntriesRaw },
      ] = await Promise.all([
        entriesQuery,
        supabase.from('bots').select('id,name,enable_voice').eq('workspace_id', workspaceId).order('name', { ascending: true }),
        supabase.from('voice_knowledge_entries').select('category').eq('workspace_id', workspaceId),
      ])

      kbEntries     = (entriesRaw    ?? []) as VoiceKnowledgeEntry[]
      kbBots        = (botsRaw       ?? []) as typeof kbBots
      allKbEntries  = (allEntriesRaw ?? []) as { category: string }[]
      categoryCounts = allKbEntries.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + 1
        return acc
      }, {})
    }
  }

  // ── Tab 4: Phone Agents ───────────────────────────────────────────────────
  // Built from voice-enabled bots + their workspace_phone_numbers connections.
  let voiceAgents: VoiceAgent[] = []

  if (activeTab === 'phone-agents') {
    type PhoneNumRow = { id: string; e164: string; bot_id: string | null; capabilities: { sms: boolean; voice: boolean } | null }
    type VoiceBotRow = { id: string; name: string; voice_preset: string | null; voice_name: string | null; voice_goal: string | string[] | null; voice_config: Record<string, unknown> | null }

    const [{ data: voiceBotsRaw }, { data: phoneNumsRaw }] = await Promise.all([
      supabase
        .from('bots')
        .select('id,name,voice_preset,voice_name,voice_goal,voice_config')
        .eq('workspace_id', workspaceId)
        .eq('enable_voice', true)
        .order('name', { ascending: true }),
      supabase
        .from('workspace_phone_numbers')
        .select('id,e164,bot_id,capabilities')
        .eq('workspace_id', workspaceId)
        .is('released_at', null),
    ])

    const phoneByBot = new Map<string, PhoneNumRow>()
    for (const p of (phoneNumsRaw ?? []) as PhoneNumRow[]) {
      if (p.bot_id) phoneByBot.set(p.bot_id, p)
    }

    voiceAgents = ((voiceBotsRaw ?? []) as VoiceBotRow[]).map(bot => {
      const phone   = phoneByBot.get(bot.id) ?? null
      const hasVoice = phone?.capabilities?.voice ?? false
      const goals    = bot.voice_goal
        ? (Array.isArray(bot.voice_goal) ? bot.voice_goal as string[] : [bot.voice_goal as string])
        : null
      return {
        id:           bot.id,
        workspace_id: workspaceId,
        name:         bot.name,
        type:         'inbound' as const,
        phone_number: phone?.e164 ?? null,
        bot_id:       bot.id,
        preset:       bot.voice_preset as VoiceAgent['preset'],
        goal:         goals as VoiceAgent['goal'],
        is_active:    hasVoice,
        config:       bot.voice_config as VoiceAgent['config'],
        created_at:   '',
        updated_at:   '',
      } satisfies VoiceAgent
    })
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalTokens = usageSummary.reduce((s, e) => s + e.tokens_input + e.tokens_output, 0)
  const totalCost   = usageSummary.reduce((s, e) => s + Number(e.cost_usd), 0)

  const phoneFilter    = params.filter ?? 'all'
  const filteredAgents = phoneFilter === 'active'
    ? voiceAgents.filter(a => a.is_active)
    : phoneFilter === 'no-number'
    ? voiceAgents.filter(a => !a.phone_number)
    : voiceAgents
  const activeAgentCount = voiceAgents.filter(a => a.is_active).length
  const withNumberCount  = voiceAgents.filter(a => !!a.phone_number).length

  const activeKbCategory = params.category as VoiceKnowledgeEntry['category'] | undefined
  const activeKbBotId    = activeTab === 'knowledge-base' && activeSubtab === 'voice' ? params.bot : undefined

  const TAB_META: Record<string, { title: string; subtitle: string }> = {
    training:        { title: 'Voice Training',  subtitle: 'Voice presets, personality controls, and goal settings' },
    'knowledge-base': { title: 'Knowledge Base', subtitle: 'Sources and voice scripts for your bots' },
    'phone-agents':  { title: 'Phone Agents',   subtitle: 'Manage inbound and outbound voice agents' },
  }

  // Header + dark bar shared for non-bots tabs
  const darkBar = (
    <div className="px-8 shrink-0">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between pt-4 pb-1">
          <div>
            <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
              {TAB_META[activeTab]?.title ?? 'Bots'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {TAB_META[activeTab]?.subtitle ?? ''}
            </p>
          </div>
          {activeTab === 'phone-agents' ? (
            <Link
              href="/phone/voice-agents/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />New Agent
            </Link>
          ) : (
            <a
              href="/bots/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />New bot
            </a>
          )}
        </div>
        <div className="bg-[#141c2b] rounded-xl border border-white/10 px-3 py-2 flex items-center gap-2 mb-2">
          <div className="ml-auto flex items-center gap-0.5">
            {TABS.map(tab => (
              <Link
                key={tab.key}
                href={`/bots?tab=${tab.key}`}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap text-white ${
                  activeTab === tab.key ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SageToolbar pageKey="bots" />

      {/* ── TAB 1: BOTS — 3-panel client layout ─────────────────────── */}
      {activeTab === 'bots' && (
        <div className="flex flex-1 overflow-hidden">
          <BotsTabClient
            bots={bots as any}
            recentConversations={recentConversations as any}
            totalTokens={totalTokens}
            totalCost={totalCost}
            totalConversations={totalConversations}
            totalBots={totalBots}
            totalIntegrations={totalIntegrations}
            showNewBotBanner={params.new === '1'}
          />
        </div>
      )}

      {/* ── TAB 2: TRAINING ──────────────────────────────────────────── */}
      {activeTab === 'training' && (
        <>
          {darkBar}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-8 pt-2 pb-8">
          <div className="max-w-5xl mx-auto">

            {/* Bot selector */}
            {trainingBots.length > 0 && (
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Bot:</span>
                <Link href="/bots?tab=training"
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    !params.bot ? 'bg-[#15A4AE]/10 text-[#15A4AE]' : 'border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}>
                  All bots
                </Link>
                {trainingBots.map(b => (
                  <Link key={b.id} href={`/bots?tab=training&bot=${b.id}`}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      params.bot === b.id ? 'bg-[#15A4AE]/10 text-[#15A4AE]' : 'border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}>
                    {b.name}
                  </Link>
                ))}
              </div>
            )}

            {selectedBotFull ? (
              <BotTrainingForm bot={selectedBotFull as any} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#15A4AE]/10 flex items-center justify-center mb-4">
                  <Mic className="w-7 h-7 text-[#15A4AE]" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Select a bot to configure</p>
                <p className="text-xs text-gray-400 max-w-sm">
                  Choose a bot from the selector above to set its voice preset, personality, behaviour toggles, goal, and scripts — all in one place.
                </p>
              </div>
            )}

          </div>
          </div>
          </div>
        </>
      )}

      {/* ── TAB 3: KNOWLEDGE BASE ─────────────────────────────────────── */}
      {activeTab === 'knowledge-base' && (
        <>
          {darkBar}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-8 pt-2 pb-8">
          <div className="max-w-5xl mx-auto">

              {/* Card with dark header bar */}
              <div className="mb-6 space-y-1">
                {/* Dark bar: subtabs + action */}
                <div className="bg-[#141c2b] rounded-xl border border-white/10 px-4 py-2.5 flex items-center gap-2">
                  {KB_SUBTABS.map(st => (
                    <Link
                      key={st.key}
                      href={`/bots?tab=knowledge-base&subtab=${st.key}`}
                      className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap text-white ${
                        activeSubtab === st.key ? 'bg-white/20' : 'hover:bg-white/10'
                      }`}
                    >
                      {st.label}
                    </Link>
                  ))}
                  {activeSubtab === 'sources' && (
                    <a
                      href="/sources/new"
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />Add source
                    </a>
                  )}
                </div>

              {/* Card body */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-hidden">

              {/* Sub-tab: Sources */}
              {activeSubtab === 'sources' && (
                <>
                  {hasActiveJobs && <SourcesPoller />}

                  {sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No sources yet</p>
                      <p className="text-xs text-gray-400 mb-5">Add a website URL or text to give your bot custom knowledge.</p>
                      <a href="/sources/new" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors">
                        Add your first source
                      </a>
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-white/5">
                      {sources.map(source => {
                        const status = STATUS_META[source.status] ?? STATUS_META.pending
                        return (
                          <div key={source.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                              {TYPE_ICON[source.type] ?? <LinkIcon className="w-4 h-4 text-brand-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{source.name}</p>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {source.type === 'text'
                                  ? ((source.metadata as Record<string, string>)?.raw_text ?? '').slice(0, 120) || '(no content)'
                                  : (source.url ?? source.type)}
                                {source.chunk_count != null && (
                                  <><span className="ml-2 text-gray-300 dark:text-gray-600">·</span><span className="ml-2">{source.chunk_count} chunks</span></>
                                )}
                                {(source.last_synced_at ?? source.created_at) && (
                                  <><span className="mx-1 text-gray-300 dark:text-gray-600">·</span>{source.last_synced_at ? 'indexed' : 'added'}{' '}{formatDateTime(source.last_synced_at ?? source.created_at)}</>
                                )}
                              </p>
                              {source.error_message && (
                                <p className="text-xs text-red-500 mt-0.5 truncate">{source.error_message}</p>
                              )}
                            </div>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${status.className}`}>
                              {status.icon}
                              {status.label}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a href={`/sources/${source.id}/edit`} title="Edit" className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </a>
                              <form action={resyncSource.bind(null, source.id)}>
                                <IconSubmitButton title="Re-sync" className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors disabled:opacity-40">
                                  <RefreshCw className="w-4 h-4" />
                                </IconSubmitButton>
                              </form>
                              <form action={deleteSource.bind(null, source.id)}>
                                <IconSubmitButton title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40">
                                  <Trash2 className="w-4 h-4" />
                                </IconSubmitButton>
                              </form>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Sub-tab: Voice Scripts */}
              {activeSubtab === 'voice' && (
                <div className="flex min-h-[480px]">

                  {/* Left: category sidebar */}
                  <div className="w-44 shrink-0 border-r dark:border-white/8 p-3 space-y-0.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pb-2">Categories</p>
                    <Link
                      href={`/bots?tab=knowledge-base&subtab=voice${activeKbBotId ? `&bot=${activeKbBotId}` : ''}`}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        !activeKbCategory ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}>
                      <span>All entries</span>
                      {allKbEntries.length > 0 && <span className="text-[10px] bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 rounded-full">{allKbEntries.length}</span>}
                    </Link>
                    {KB_CATEGORIES.map(cat => (
                      <Link key={cat.id}
                        href={`/bots?tab=knowledge-base&subtab=voice&category=${cat.id}${activeKbBotId ? `&bot=${activeKbBotId}` : ''}`}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors group ${
                          activeKbCategory === cat.id ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.color.replace('text-', 'bg-').split(' ')[0]}`} />
                        <span className="flex-1 truncate">{cat.label}</span>
                        {(categoryCounts[cat.id] ?? 0) > 0 && (
                          <span className="text-[10px] bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 rounded-full shrink-0">{categoryCounts[cat.id]}</span>
                        )}
                      </Link>
                    ))}

                    {kbBots.filter(b => b.enable_voice).length > 0 && (
                      <>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pt-4 pb-2">Bot</p>
                        <Link
                          href={`/bots?tab=knowledge-base&subtab=voice${activeKbCategory ? `&category=${activeKbCategory}` : ''}`}
                          className={`flex items-center px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            !activeKbBotId ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}>
                          All bots
                        </Link>
                        {kbBots.filter(b => b.enable_voice).map(b => (
                          <Link key={b.id}
                            href={`/bots?tab=knowledge-base&subtab=voice&bot=${b.id}${activeKbCategory ? `&category=${activeKbCategory}` : ''}`}
                            className={`flex items-center px-2 py-1.5 rounded-lg text-xs transition-colors truncate ${
                              activeKbBotId === b.id ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}>
                            {b.name}
                          </Link>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Right: main content */}
                  <div className="flex-1 p-4 space-y-3">

                    {/* Add new entry */}
                    <VoiceEntryForm
                      activeKbBotId={activeKbBotId}
                      activeKbCategory={activeKbCategory}
                    />

                    {/* Active category banner */}
                    {activeKbCategory && (() => {
                      const cat = KB_CATEGORIES.find(c => c.id === activeKbCategory)
                      return cat ? (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${cat.bg} border border-current/10`}>
                          <span className={`w-2 h-2 rounded-full ${cat.color.replace('text-', 'bg-').split(' ')[0]} shrink-0`} />
                          <div>
                            <p className={`text-xs font-semibold ${cat.color}`}>{cat.label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{cat.desc}</p>
                          </div>
                        </div>
                      ) : null
                    })()}

                    {/* Entries */}
                    {kbEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <BookOpen className="w-7 h-7 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No entries yet</p>
                        <p className="text-xs text-gray-400 mt-0.5">Use the form above to add your first entry.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {kbEntries.map(entry => {
                          const cat = KB_CATEGORIES.find(c => c.id === entry.category)
                          return (
                            <div key={entry.id} className={`group flex items-start gap-3 px-4 py-3 rounded-xl border dark:border-white/8 bg-white dark:bg-white/[0.02] hover:shadow-sm transition-all ${!entry.is_active ? 'opacity-40' : ''}`}>
                              {cat && <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${cat.color.replace('text-', 'bg-').split(' ')[0]}`} />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{entry.title}</p>
                                {entry.trigger_phrases?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {entry.trigger_phrases.map(p => (
                                      <span key={p} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#15A4AE]/10 text-[#15A4AE] text-[10px] font-medium">
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{entry.content}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {cat && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>{cat.label}</span>}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    entry.usage_type === 'always' ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                    : entry.usage_type === 'manual' ? 'bg-gray-100 dark:bg-white/8 text-gray-500'
                                    : 'bg-[#15A4AE]/10 text-[#15A4AE]'
                                  }`}>{entry.usage_type}</span>
                                </div>
                              </div>
                              <form action={deleteVoiceKnowledgeEntry.bind(null, entry.id)}>
                                <button type="submit" className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              </div>{/* end card body */}
              </div>{/* end card wrapper */}

          </div>
          </div>
          </div>
        </>
      )}

      {/* ── TAB 4: PHONE AGENTS ──────────────────────────────────────── */}
      {activeTab === 'phone-agents' && (
        <>
          {darkBar}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-8 pt-2 pb-8">
          <div className="max-w-5xl mx-auto">

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Voice bots',    value: voiceAgents.length,  icon: Mic,       color: 'text-[#15A4AE]',                     bg: 'bg-[#15A4AE]/10' },
                { label: 'With number',   value: withNumberCount,     icon: PhoneCall, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
                { label: 'Voice-capable', value: activeAgentCount,    icon: PhoneCall, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-500/10' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex items-center gap-4">
                  <div className={`${s.bg} p-2.5 rounded-lg`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dark-header card: filter tabs + agent grid */}
            <div className="space-y-1">

              {/* Dark bar */}
              <div className="bg-[#141c2b] rounded-xl border border-white/10 px-4 py-2.5 flex items-center gap-2">
                {[
                  { key: 'all',       label: 'All bots' },
                  { key: 'active',    label: 'Voice-capable' },
                  { key: 'no-number', label: 'No number' },
                ].map(f => (
                  <Link
                    key={f.key}
                    href={`/bots?tab=phone-agents&filter=${f.key}`}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap text-white ${
                      phoneFilter === f.key ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                    {f.key === 'all'       && voiceAgents.length > 0 && <span className="ml-1.5 text-white/50">{voiceAgents.length}</span>}
                    {f.key === 'active'    && activeAgentCount > 0   && <span className="ml-1.5 text-white/50">{activeAgentCount}</span>}
                  </Link>
                ))}
                <Link
                  href="/integrations/phone/setup"
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />Assign number
                </Link>
              </div>

              {/* Card body */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4">
                {filteredAgents.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-[#15A4AE]/10 flex items-center justify-center mb-4">
                      <PhoneCall className="w-6 h-6 text-[#15A4AE]" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No voice agents found</p>
                    <p className="text-xs text-gray-400 mb-5">
                      {phoneFilter === 'active' ? 'No bots have a voice-capable number assigned yet.' : phoneFilter === 'no-number' ? 'All your voice bots have a number assigned.' : 'Enable voice on a bot to see it here.'}
                    </p>
                    <Link href="/bots/new"
                      className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm rounded-lg transition-colors">
                      Create bot
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAgents.map(agent => {
                      const typeCfg  = AGENT_TYPE_CONFIG[agent.type] ?? AGENT_TYPE_CONFIG.inbound
                      const TypeIcon = typeCfg.icon
                      return (
                        <div key={agent.id} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border dark:border-white/8 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`${typeCfg.bg} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
                                <TypeIcon className={`w-4 h-4 ${typeCfg.color}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{agent.name}</p>
                                <p className="text-xs text-gray-400 truncate">{agent.phone_number ?? 'No number assigned'}</p>
                              </div>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              agent.is_active
                                ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                : agent.phone_number
                                ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
                            }`}>
                              {agent.is_active ? 'Voice ready' : agent.phone_number ? 'SMS only' : 'No number'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeCfg.bg} ${typeCfg.color}`}>
                              {typeCfg.label}
                            </span>
                            {agent.preset && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                                {PRESET_LABELS[agent.preset] ?? agent.preset}
                              </span>
                            )}
                            {agent.goal && (Array.isArray(agent.goal) ? agent.goal : [agent.goal]).map(g => (
                              <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                {GOAL_LABELS[g] ?? g}
                              </span>
                            ))}
                          </div>

                          {agent.config?.tone && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-1 border-t dark:border-white/8">
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{agent.config.tone}</span>
                              {agent.config.pace && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{agent.config.pace} pace</span>
                              )}
                              {agent.config.empathy != null && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">Empathy {agent.config.empathy}/5</span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1 mt-auto border-t dark:border-white/8">
                            <Link href={`/bots?tab=training&bot=${agent.id}`}
                              className="flex-1 text-center text-xs font-medium px-3 py-1.5 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                              Configure
                            </Link>
                            <Link href="/integrations/phone/setup"
                              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <Phone className="w-3 h-3" />Number
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>{/* end dark-header card */}

          </div>
          </div>
          </div>
        </>
      )}

    </div>
  )
}
