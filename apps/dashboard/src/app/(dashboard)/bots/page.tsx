import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { SourcesPoller } from '@/app/(dashboard)/sources/sources-poller'
import { IconSubmitButton } from '@/components/ui/submit-button'
import { deleteSource, resyncSource } from '@/app/actions/source'
import { createVoiceKnowledgeEntry, deleteVoiceKnowledgeEntry } from '@/app/actions/voice'
import {
  Plus, PhoneCall, PhoneIncoming, PhoneOutgoing, Zap,
  BookOpen, RefreshCw, Trash2, Pencil, CheckCircle2, Clock, AlertCircle, Loader2, Mic, Phone,
  Link as LinkIcon, FileText, AlignLeft, Cloud, HardDrive, ChevronRight,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Bot as BotRow, Conversation, UsageEvent, Source, VoiceKnowledgeEntry, VoiceAgent } from '@/lib/types'
import { BotsTabClient } from './bots-tab-client'

export const metadata: Metadata = { title: 'Bots' }

type RecentConversation = Pick<Conversation, 'id' | 'title' | 'platform' | 'status' | 'message_count' | 'last_activity_at'>
type UsageSummaryRow    = Pick<UsageEvent, 'tokens_input' | 'tokens_output' | 'cost_usd'>

const TABS = [
  { key: 'bots',           label: 'Bots' },
  { key: 'training',       label: 'Training' },
  { key: 'knowledge-base', label: 'Knowledge Base' },
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

const TRAINING_PRESETS = [
  {
    id: 'receptionist',
    label: 'Friendly Receptionist',
    icon: '🙋',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-500/10',
    traits: ['Warm & welcoming', 'Asks before answering', 'Routes effectively'],
    tone: 'friendly', pace: 'moderate', empathy: 4, assertiveness: 2, formality: 3,
  },
  {
    id: 'sales',
    label: 'Sales Closer',
    icon: '💼',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    traits: ['Confident & persuasive', 'Handles objections', 'Drives to close'],
    tone: 'professional', pace: 'moderate', empathy: 3, assertiveness: 5, formality: 3,
  },
  {
    id: 'booking',
    label: 'Appointment Setter',
    icon: '📅',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    traits: ['Efficient & clear', 'Time-aware', 'Confirms details'],
    tone: 'professional', pace: 'moderate', empathy: 3, assertiveness: 4, formality: 3,
  },
  {
    id: 'support',
    label: 'Support Specialist',
    icon: '🎧',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    traits: ['Patient & empathetic', 'Problem-solving', 'Escalates when needed'],
    tone: 'friendly', pace: 'slow', empathy: 5, assertiveness: 2, formality: 2,
  },
  {
    id: 'lead_capture',
    label: 'Lead Capture Agent',
    icon: '🎯',
    color: 'text-[#15A4AE]',
    bg: 'bg-[#15A4AE]/10',
    traits: ['Curious & thorough', 'Collects details first', 'Qualifies urgency'],
    tone: 'friendly', pace: 'moderate', empathy: 3, assertiveness: 3, formality: 3,
  },
  {
    id: 'consultant',
    label: 'Professional Consultant',
    icon: '🧑‍💼',
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-white/8',
    traits: ['Expert tone', 'Detailed answers', 'High credibility'],
    tone: 'formal', pace: 'slow', empathy: 3, assertiveness: 3, formality: 5,
  },
]

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
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase.from('bots').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase.from('integrations').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'active'),
      supabase.from('conversations').select('id, title, platform, status, message_count, last_activity_at, created_at').eq('workspace_id', workspaceId).order('last_activity_at', { ascending: false }).limit(8),
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

  if (activeTab === 'training') {
    const { data: botsRaw } = await supabase
      .from('bots').select('id,name,enable_voice,voice_preset,voice_mode').eq('workspace_id', workspaceId).order('name', { ascending: true })
    trainingBots = (botsRaw ?? []) as typeof trainingBots
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
  let voiceAgents: VoiceAgent[] = []

  if (activeTab === 'phone-agents') {
    const { data: agentsRaw } = await supabase.from('voice_agents').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
    voiceAgents = (agentsRaw ?? []) as VoiceAgent[]
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalTokens = usageSummary.reduce((s, e) => s + e.tokens_input + e.tokens_output, 0)
  const totalCost   = usageSummary.reduce((s, e) => s + Number(e.cost_usd), 0)

  const selectedTrainingBot = params.bot ? trainingBots.find(b => b.id === params.bot) : null

  const phoneFilter     = params.filter ?? 'all'
  const filteredAgents  = phoneFilter === 'active'
    ? voiceAgents.filter(a => a.is_active)
    : phoneFilter === 'inbound'
    ? voiceAgents.filter(a => a.type === 'inbound' || a.type === 'both')
    : phoneFilter === 'outbound'
    ? voiceAgents.filter(a => a.type === 'outbound' || a.type === 'both')
    : voiceAgents
  const activeAgentCount   = voiceAgents.filter(a => a.is_active).length
  const inboundAgentCount  = voiceAgents.filter(a => a.type === 'inbound' || a.type === 'both').length
  const outboundAgentCount = voiceAgents.filter(a => a.type === 'outbound' || a.type === 'both').length

  const activeKbCategory = params.category as VoiceKnowledgeEntry['category'] | undefined
  const activeKbBotId    = activeTab === 'knowledge-base' && activeSubtab === 'voice' ? params.bot : undefined

  const TAB_META: Record<string, { title: string; subtitle: string }> = {
    training:        { title: 'Training',       subtitle: 'Voice presets, personality controls, and goal settings' },
    'knowledge-base': { title: 'Knowledge Base', subtitle: 'Sources and voice scripts for your bots' },
    'phone-agents':  { title: 'Phone Agents',   subtitle: 'Manage inbound and outbound voice agents' },
  }

  // Header + dark bar shared for non-bots tabs
  const darkBar = (
    <>
      <div className="flex items-center justify-between px-6 pt-3 pb-2 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {TAB_META[activeTab]?.title ?? 'Bots'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {TAB_META[activeTab]?.subtitle ?? ''}
          </p>
        </div>
        <a
          href="/bots/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />New bot
        </a>
      </div>
      <div className="bg-[#141c2b] mx-3 mb-2 rounded-2xl px-3 py-2 flex items-center gap-2 shrink-0 shadow-lg">
        <div className="ml-auto flex items-center gap-0.5">
          {TABS.map(tab => (
            <Link
              key={tab.key}
              href={`/bots?tab=${tab.key}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <>
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
          <div className="p-8 max-w-5xl mx-auto">
          {true && (
            <>
              {/* Bot selector */}
              {trainingBots.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Training for:</span>
                    <Link href="/bots?tab=training"
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        !params.bot
                          ? 'bg-[#15A4AE]/10 text-[#15A4AE]'
                          : 'border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}>
                      All bots
                    </Link>
                    {trainingBots.filter(b => b.enable_voice).map(b => (
                      <Link key={b.id} href={`/bots?tab=training&bot=${b.id}`}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          params.bot === b.id
                            ? 'bg-[#15A4AE]/10 text-[#15A4AE]'
                            : 'border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}>
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset cards */}
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Voice presets</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Click a preset to apply it to {selectedTrainingBot ? selectedTrainingBot.name : 'a bot'}. Each preset sets tone, pace, empathy, and behaviour defaults.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {TRAINING_PRESETS.map(p => (
                    <div key={p.id} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className={`${p.bg} w-10 h-10 rounded-xl flex items-center justify-center text-xl`}>
                          {p.icon}
                        </div>
                        {selectedTrainingBot?.voice_preset === p.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#15A4AE]/10 text-[#15A4AE]">Active</span>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${p.color}`}>{p.label}</p>
                        <ul className="mt-2 space-y-1">
                          {p.traits.map(t => (
                            <li key={t} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-1 border-t dark:border-white/8">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{p.tone}</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{p.pace} pace</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">E:{p.empathy} A:{p.assertiveness}</span>
                      </div>
                      <Link
                        href={selectedTrainingBot
                          ? `/agent/bots/${selectedTrainingBot.id}?preset=${p.id}`
                          : '/bots?tab=bots'}
                        className="mt-auto block text-center text-xs font-medium px-3 py-2 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                        {selectedTrainingBot ? `Apply to ${selectedTrainingBot.name}` : 'Select a bot first ↑'}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personality + Behaviour controls */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
                  <div className="px-5 py-4 border-b dark:border-white/8">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personality controls</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Per-bot settings available in the bot editor</p>
                  </div>
                  <div className="divide-y dark:divide-white/5">
                    {[
                      { label: 'Tone',          desc: 'Friendly / Professional / Casual / Formal' },
                      { label: 'Pace',          desc: 'Slow / Moderate / Fast' },
                      { label: 'Empathy',       desc: '1 (minimal) → 5 (highly empathetic)' },
                      { label: 'Assertiveness', desc: '1 (passive) → 5 (highly assertive)' },
                      { label: 'Formality',     desc: '1 (very casual) → 5 (very formal)' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between px-5 py-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                        <span className="text-xs text-gray-400">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
                  <div className="px-5 py-4 border-b dark:border-white/8">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Behaviour controls</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Toggle conversation behaviours per bot</p>
                  </div>
                  <div className="divide-y dark:divide-white/5">
                    {[
                      { label: 'Ask one at a time',  desc: 'Never stack multiple questions' },
                      { label: 'Confirm details',     desc: 'Reads back captured info before proceeding' },
                      { label: 'Push for booking',    desc: 'Always close with a next-step ask' },
                      { label: 'Escalate sooner',     desc: 'Lower threshold for human handoff' },
                      { label: 'Collect lead first',  desc: 'Gather contact details before deep answers' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between px-5 py-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                        <span className="text-xs text-gray-400 text-right max-w-[160px]">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Goal presets */}
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 mb-8">
                <div className="px-5 py-4 border-b dark:border-white/8">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Goal presets</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Each bot can be assigned one primary goal that shapes every conversation</p>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x dark:divide-white/8">
                  {[
                    { icon: '📅', label: 'Book a meeting',  desc: 'Drive every call to a calendar booking' },
                    { icon: '🎯', label: 'Capture lead',    desc: 'Collect name, email, phone, and context' },
                    { icon: '🎫', label: 'Resolve ticket',  desc: 'Help caller and create a ticket if needed' },
                    { icon: '💼', label: 'Sales pitch',     desc: 'Qualify and present your offer' },
                    { icon: '📝', label: 'Take a message',  desc: 'Record caller info for follow-up' },
                    { icon: '↗️', label: 'Route to human',  desc: 'Triage and hand off to the right person' },
                  ].map(g => (
                    <div key={g.label} className="px-5 py-4 flex items-start gap-3">
                      <span className="text-xl">{g.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{g.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{g.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          </div>
          </div>
        </>
      )}

      {/* ── TAB 3: KNOWLEDGE BASE ─────────────────────────────────────── */}
      {activeTab === 'knowledge-base' && (
        <>
          {darkBar}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-8 max-w-5xl mx-auto">

              {/* Sub-tab nav */}
              <div className="flex items-center gap-1 mb-6 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit flex-wrap">
                {KB_SUBTABS.map(st => (
                  <Link
                    key={st.key}
                    href={`/bots?tab=knowledge-base&subtab=${st.key}`}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSubtab === st.key
                        ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {st.label}
                  </Link>
                ))}
              </div>

              {/* Sub-tab: Sources */}
              {activeSubtab === 'sources' && (
                <>
                  {hasActiveJobs && <SourcesPoller />}
                  <div className="flex items-center justify-between mb-6">
                    <div />
                    <a
                      href="/sources/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add source
                    </a>
                  </div>

                  {sources.length === 0 ? (
                    <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col items-center justify-center py-16 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No sources yet</p>
                      <p className="text-xs text-gray-400 mb-5">Add a website URL or text to give your bot custom knowledge.</p>
                      <a href="/sources/new" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors">
                        Add your first source
                      </a>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 divide-y dark:divide-white/5">
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
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                  {/* Sidebar: category filters */}
                  <div className="xl:col-span-1 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Categories</p>
                    <Link
                      href={`/bots?tab=knowledge-base&subtab=voice${activeKbBotId ? `&bot=${activeKbBotId}` : ''}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        !activeKbCategory
                          ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}>
                      <span>All entries</span>
                      <span className="text-xs">{allKbEntries.length}</span>
                    </Link>
                    {KB_CATEGORIES.map(cat => (
                      <Link key={cat.id}
                        href={`/bots?tab=knowledge-base&subtab=voice&category=${cat.id}${activeKbBotId ? `&bot=${activeKbBotId}` : ''}`}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeKbCategory === cat.id
                            ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}>
                        <span>{cat.label}</span>
                        {(categoryCounts[cat.id] ?? 0) > 0 && (
                          <span className="text-xs bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 rounded-full">
                            {categoryCounts[cat.id]}
                          </span>
                        )}
                      </Link>
                    ))}

                    {kbBots.filter(b => b.enable_voice).length > 0 && (
                      <>
                        <div className="pt-4 pb-1">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filter by bot</p>
                        </div>
                        <Link
                          href={`/bots?tab=knowledge-base&subtab=voice${activeKbCategory ? `&category=${activeKbCategory}` : ''}`}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            !activeKbBotId
                              ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}>
                          All bots
                        </Link>
                        {kbBots.filter(b => b.enable_voice).map(b => (
                          <Link key={b.id}
                            href={`/bots?tab=knowledge-base&subtab=voice&bot=${b.id}${activeKbCategory ? `&category=${activeKbCategory}` : ''}`}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                              activeKbBotId === b.id
                                ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}>
                            {b.name}
                          </Link>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="xl:col-span-3 space-y-4">
                    <details className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
                      <summary className="px-5 py-4 cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 list-none">
                        <Plus className="w-4 h-4 text-[#15A4AE]" />
                        Add new entry
                        <ChevronRight className="w-4 h-4 ml-auto transition-transform [[open]_&]:rotate-90" />
                      </summary>
                      <form action={createVoiceKnowledgeEntry} className="px-5 pb-5 space-y-4 border-t dark:border-white/8 pt-4">
                        <input type="hidden" name="bot_id" value={activeKbBotId ?? ''} />
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                            <select name="category" defaultValue={activeKbCategory ?? 'faq'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                              {KB_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Usage</label>
                            <select name="usage_type" defaultValue="auto"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                              <option value="auto">Auto — bot uses when relevant</option>
                              <option value="always">Always — included in every session</option>
                              <option value="manual">Manual — reference only</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title / trigger phrase</label>
                          <input type="text" name="title" required placeholder='e.g. "What is your pricing?"'
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content / approved response</label>
                          <textarea name="content" rows={4} required
                            placeholder='e.g. "Our plans start from $49 per month. Would you like me to walk you through the options?"'
                            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
                          <p className="text-xs text-gray-400 mt-1">Write this as spoken language — short sentences, natural pauses.</p>
                        </div>
                        <div className="flex justify-end">
                          <button type="submit"
                            className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-lg transition-colors">
                            Add entry
                          </button>
                        </div>
                      </form>
                    </details>

                    {activeKbCategory && (
                      <div className={`${KB_CATEGORIES.find(c => c.id === activeKbCategory)?.bg ?? 'bg-gray-50 dark:bg-white/5'} rounded-xl border dark:border-white/8 px-5 py-4`}>
                        <p className={`text-sm font-semibold ${KB_CATEGORIES.find(c => c.id === activeKbCategory)?.color ?? 'text-gray-700 dark:text-gray-300'}`}>
                          {KB_CATEGORIES.find(c => c.id === activeKbCategory)?.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {KB_CATEGORIES.find(c => c.id === activeKbCategory)?.desc}
                        </p>
                      </div>
                    )}

                    {kbEntries.length === 0 ? (
                      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 py-16 flex flex-col items-center justify-center text-center">
                        <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No entries yet</p>
                        <p className="text-xs text-gray-400">Add your first voice knowledge entry above.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {kbEntries.map(entry => {
                          const cat = KB_CATEGORIES.find(c => c.id === entry.category)
                          return (
                            <div key={entry.id} className={`bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 ${!entry.is_active ? 'opacity-50' : ''}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat?.bg ?? 'bg-gray-100 dark:bg-white/8'} ${cat?.color ?? 'text-gray-600'}`}>
                                      {cat?.label ?? entry.category}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                      entry.usage_type === 'always'
                                        ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                        : entry.usage_type === 'manual'
                                        ? 'bg-gray-100 dark:bg-white/8 text-gray-500'
                                        : 'bg-[#15A4AE]/10 text-[#15A4AE]'
                                    }`}>
                                      {entry.usage_type}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{entry.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{entry.content}</p>
                                </div>
                                <form action={deleteVoiceKnowledgeEntry.bind(null, entry.id)}>
                                  <button type="submit"
                                    className="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
                                    Remove
                                  </button>
                                </form>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
          </div>
        </>
      )}

      {/* ── TAB 4: PHONE AGENTS ──────────────────────────────────────── */}
      {activeTab === 'phone-agents' && (
        <>
          {darkBar}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-8 max-w-5xl mx-auto">
              {/* Stats strip */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total agents', value: voiceAgents.length,   icon: Mic,          color: 'text-[#15A4AE]',                      bg: 'bg-[#15A4AE]/10' },
                  { label: 'Active',       value: activeAgentCount,     icon: PhoneCall,     color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10' },
                  { label: 'Inbound',      value: inboundAgentCount,    icon: PhoneIncoming, color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10' },
                  { label: 'Outbound',     value: outboundAgentCount,   icon: PhoneOutgoing, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10' },
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

              {/* New agent + filter row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-lg w-fit">
                  {[
                    { key: 'all',      label: 'All agents' },
                    { key: 'active',   label: 'Active' },
                    { key: 'inbound',  label: 'Inbound' },
                    { key: 'outbound', label: 'Outbound' },
                  ].map(tab => (
                    <Link
                      key={tab.key}
                      href={`/bots?tab=phone-agents&filter=${tab.key}`}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        phoneFilter === tab.key
                          ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </div>
                <Link href="/phone/voice-agents/new"
                  className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />New agent
                </Link>
              </div>

              {/* Agent cards */}
              {filteredAgents.length === 0 ? (
                <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#15A4AE]/10 flex items-center justify-center mb-4">
                    <PhoneCall className="w-6 h-6 text-[#15A4AE]" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No voice agents found</p>
                  <p className="text-xs text-gray-400 mb-5">
                    {phoneFilter !== 'all' ? `No ${phoneFilter} agents yet.` : 'Create your first voice agent to start handling calls.'}
                  </p>
                  <Link href="/phone/voice-agents/new"
                    className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm rounded-lg transition-colors">
                    Create agent
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAgents.map(agent => {
                    const typeCfg  = AGENT_TYPE_CONFIG[agent.type] ?? AGENT_TYPE_CONFIG.inbound
                    const TypeIcon = typeCfg.icon
                    return (
                      <div key={agent.id} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex flex-col gap-3">
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
                              : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
                          }`}>
                            {agent.is_active ? 'Active' : 'Inactive'}
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
                          {agent.goal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                              {GOAL_LABELS[agent.goal] ?? agent.goal}
                            </span>
                          )}
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
                          <Link href={`/phone/voice-agents/${agent.id}`}
                            className="flex-1 text-center text-xs font-medium px-3 py-1.5 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                            Configure
                          </Link>
                          <Link href={`/bots?tab=training&bot=${agent.bot_id ?? ''}`}
                            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <Zap className="w-3 h-3" />Train
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>
          </div>
        </>
      )}

    </>
  )
}
