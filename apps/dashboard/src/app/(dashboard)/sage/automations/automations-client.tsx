'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, TrendingUp, TrendingDown, Minus,
  Mail, MessageSquare, Phone,
  Play, Pause, ChevronDown,
  Plus, Loader2,
  CheckCircle2, AlertTriangle, Search, User,
  Download, Upload, ArrowUpRight, UserPlus, BarChart2, X, Ticket,
} from 'lucide-react'
import {
  pauseAutomation, resumeAutomation, createAutomation, searchContactsForAutomation,
} from '@/app/actions/automations'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ActivitySidebar } from '@/components/team/activity-sidebar'
import type { ActivityEntry, ViewingAsInfo } from '@/app/actions/activity-feed'
import type {
  AutomationListItem, AutomationGoal, AutomationStatus,
  AutomationMomentum, AutomationChannel,
} from '@/lib/types'

// ── Display maps ──────────────────────────────────────────────────────────────

const GOAL_LABEL: Record<AutomationGoal, string> = {
  warm_introduction:  'Warm Intro',
  qualification:      'Qualification',
  reengagement:       'Re-engagement',
  meeting_conversion: 'Meeting',
}

const GOAL_CONFIGS: { goal: AutomationGoal; label: string; desc: string; channels: string }[] = [
  { goal: 'warm_introduction',  label: 'Warm Introduction',  desc: 'First contact with a cold or enriched lead',          channels: 'Email → SMS' },
  { goal: 'qualification',      label: 'Qualification',      desc: 'Understand fit and intent before creating a deal',    channels: 'Email' },
  { goal: 'reengagement',       label: 'Re-engagement',      desc: 'Re-activate leads that have gone quiet',              channels: 'SMS → Email' },
  { goal: 'meeting_conversion', label: 'Meeting Conversion', desc: 'Move an interested lead to a scheduled conversation', channels: 'Email → Call' },
]

const STATUS_CONFIG: Record<AutomationStatus, { label: string; dot: string; badge: string }> = {
  running:   { label: 'Running',   dot: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-500 dark:text-amber-400' },
  waiting:   { label: 'Waiting',   dot: 'bg-amber-300',   badge: 'bg-amber-500/10 text-amber-400' },
  engaged:   { label: 'Engaged',   dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' },
  escalated: { label: 'Escalated', dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' },
  paused:    { label: 'Paused',    dot: 'bg-gray-400',    badge: 'bg-gray-500/10 text-gray-500 dark:text-gray-400' },
  completed: { label: 'Completed', dot: 'bg-gray-300',    badge: 'bg-gray-500/10 text-gray-400' },
  stopped:   { label: 'Stopped',   dot: 'bg-gray-300',    badge: 'bg-gray-500/10 text-gray-400' },
}

const PRIORITY_STRIP: Record<string, string> = {
  high:   'bg-emerald-500',
  medium: 'bg-amber-400',
  low:    'bg-gray-300 dark:bg-gray-600',
}

const CHANNEL_ICON: Record<string, React.ElementType> = { email: Mail, sms: MessageSquare, call: Phone }

function MomentumIcon({ momentum }: { momentum: AutomationMomentum }) {
  if (momentum === 'increasing') return <TrendingUp  className="w-3.5 h-3.5 text-emerald-500" />
  if (momentum === 'declining')  return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-gray-400" />
}

// ── Inline detail section ─────────────────────────────────────────────────────

function DetailSection({ item }: { item: AutomationListItem }) {
  const router = useRouter()
  const nextActionLabels: Record<string, string> = {
    send_email: 'Send email', send_sms: 'Send SMS',
    call: 'Call', wait: 'Waiting', handoff: 'Handoff ready',
  }

  return (
    <div className="px-4 pb-4 pt-3 bg-gray-50/60 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/6 space-y-4">

      {/* AI Summary */}
      {item.current_summary && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Insights</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.current_summary}</p>
        </div>
      )}

      {/* 2-col grid for small fields */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Momentum</p>
          <div className="flex items-center gap-1.5">
            <MomentumIcon momentum={item.momentum} />
            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{item.momentum}</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Next Suggested Action</p>
          {item.next_action_type ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {nextActionLabels[item.next_action_type] ?? item.next_action_type}
              {item.next_action_at && item.next_action_type !== 'handoff' && (
                <span className="text-gray-400 ml-1.5">· {timeAgo(item.next_action_at)}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Channels</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[item.primary_channel, item.fallback_channel].filter(Boolean).map((ch, i) => {
              const Ch = CHANNEL_ICON[ch as AutomationChannel] ?? Mail
              return (
                <span key={i} className="flex items-center gap-1 text-sm px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400">
                  <Ch className="w-3.5 h-3.5" />{ch}
                </span>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Steps Taken</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{item.step_count}</p>
        </div>
      </div>

      {/* CTA row */}
      <div className="flex items-center gap-2 pt-1 flex-wrap border-t border-gray-100 dark:border-white/6 mt-1">
        <button
          onClick={() => router.push('/sage/contacts')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#15A4AE]/40 text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add a Contact
        </button>
        <button
          onClick={() => router.push('/sage/pipelines')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#15A4AE]/40 text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Add a Deal
        </button>
        <button
          onClick={() => router.push('/sage/tickets')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#15A4AE]/40 text-[#15A4AE] hover:bg-[#15A4AE]/8 transition-colors"
        >
          <Ticket className="w-3.5 h-3.5" />
          Add a Ticket
        </button>
      </div>
    </div>
  )
}

// ── Automation row ────────────────────────────────────────────────────────────

function AutomationRow({ item, expanded, onToggle, onPause, onResume }: {
  item:      AutomationListItem
  expanded:  boolean
  onToggle:  (id: string) => void
  onPause:   (id: string) => void
  onResume:  (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const status  = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.running
  const Channel = CHANNEL_ICON[item.primary_channel] ?? Mail
  const canPause  = (['running','waiting','engaged'] as AutomationStatus[]).includes(item.status)
  const canResume = item.status === 'paused'

  return (
    <div className="border-b border-gray-200 dark:border-white/15 last:border-0">
      {/* Main row — clickable */}
      <div
        className="flex items-center gap-0 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
        onClick={() => onToggle(item.id)}
      >
        {/* Priority strip */}
        <div className={`w-0.5 self-stretch shrink-0 ${PRIORITY_STRIP[item.priority]}`} />

        {/* Content */}
        <div className="flex flex-1 items-center gap-3 px-4 py-2.5 min-w-0">
          {/* Left: name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.contact_name ?? 'Unknown contact'}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                status.badge,
              )}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-gray-400">{GOAL_LABEL[item.goal]}</span>
              <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
              <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                <Channel className="w-2.5 h-2.5" />
                {item.primary_channel}
              </span>
              {item.deal_title && (
                <>
                  <span className="text-gray-300 dark:text-gray-700 text-[11px]">·</span>
                  <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{item.deal_title}</span>
                </>
              )}
            </div>
          </div>

          {/* Right: always-visible actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <MomentumIcon momentum={item.momentum} />
            {canPause && (
              <button
                onClick={() => startTransition(() => onPause(item.id))}
                disabled={isPending}
                title="Pause"
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}
            {canResume && (
              <button
                onClick={() => startTransition(() => onResume(item.id))}
                disabled={isPending}
                title="Resume"
                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-gray-400 transition-transform duration-150',
              expanded && 'rotate-180',
            )} />
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && <DetailSection item={item} />}
    </div>
  )
}

// ── New Automation modal ──────────────────────────────────────────────────────

function NewAutomationModal({ onClose, onCreated }: {
  onClose:   () => void
  onCreated: (id: string) => void
}) {
  type ContactOption = { id: string; name: string; email: string | null; phone: string | null; company_name: string | null }

  const [step,      setStep]      = useState<'contact' | 'goal'>('contact')
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<ContactOption[]>([])
  const [searching, setSearching] = useState(false)
  const [contact,   setContact]   = useState<ContactOption | null>(null)
  const [goal,      setGoal]      = useState<AutomationGoal>('warm_introduction')
  const [channel,   setChannel]   = useState<AutomationChannel>('email')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const res = await searchContactsForAutomation(q)
    setResults(res)
    setSearching(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  async function handleCreate() {
    if (!contact) { setError('Select a contact first'); return }
    setSaving(true); setError(null)
    try {
      const automation = await createAutomation({
        contact_id: contact.id, source_type: 'manual', goal, primary_channel: channel,
      })
      onCreated(automation.id)
      onClose()
    } catch {
      setError('Failed to create automation. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Automation</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'contact' ? 'Choose a contact' : `${contact?.name ?? 'Contact'} · Choose a goal`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {step === 'contact' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search contacts by name or email…"
                  className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/30"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />}
              </div>
              {results.length > 0 && (
                <div className="border border-gray-100 dark:border-white/8 rounded-xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 max-h-52 overflow-y-auto">
                  {results.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setContact(c); setStep('goal') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-[#15A4AE]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{c.email ?? c.phone ?? c.company_name ?? '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No contacts found for "{query}"</p>
              )}
            </>
          )}

          {step === 'goal' && (
            <>
              {contact && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#15A4AE]/8 rounded-xl">
                  <User className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{contact.name}</span>
                  <button onClick={() => setStep('contact')} className="ml-auto text-[11px] text-gray-400 hover:text-gray-600">change</button>
                </div>
              )}
              <div className="space-y-2">
                {GOAL_CONFIGS.map(g => (
                  <button key={g.goal} onClick={() => setGoal(g.goal)}
                    className={cn('w-full text-left px-4 py-3 rounded-xl border transition-colors',
                      goal === g.goal ? 'border-[#15A4AE] bg-[#15A4AE]/5' : 'border-gray-100 dark:border-white/8 hover:border-[#15A4AE]/40',
                    )}>
                    <div className="flex items-center justify-between">
                      <span className={cn('text-sm font-medium', goal === g.goal ? 'text-[#15A4AE]' : 'text-gray-800 dark:text-gray-200')}>{g.label}</span>
                      <span className="text-[11px] text-gray-400">{g.channels}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{g.desc}</p>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Primary channel</p>
                <div className="flex gap-2">
                  {(['email', 'sms', 'call'] as AutomationChannel[]).map(ch => {
                    const Ch = CHANNEL_ICON[ch]
                    return (
                      <button key={ch} onClick={() => setChannel(ch)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                          channel === ch ? 'border-[#15A4AE] bg-[#15A4AE]/10 text-[#15A4AE]' : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300',
                        )}>
                        <Ch className="w-3.5 h-3.5" />
                        <span className="capitalize">{ch}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-white/8">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
          {step === 'goal' ? (
            <button onClick={handleCreate} disabled={saving || !contact}
              className="flex items-center gap-2 px-5 py-2 bg-[#15A4AE] hover:bg-[#0e8b94] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Start Automation
            </button>
          ) : (
            <button onClick={() => { if (contact) setStep('goal') }} disabled={!contact}
              className="px-5 py-2 bg-[#15A4AE] hover:bg-[#0e8b94] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty card body ───────────────────────────────────────────────────────────

function EmptyRows({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-[#15A4AE]/10 flex items-center justify-center mb-3">
        <Zap className="w-5 h-5 text-[#15A4AE]" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No automations running</p>
      <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed mb-4">
        Start one from a contact, prospect, or inbound lead.
      </p>
      <button onClick={onNew}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8b94] text-white text-sm font-semibold rounded-xl transition-colors">
        <Plus className="w-3.5 h-3.5" />
        New Automation
      </button>
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

export function AutomationsClient({ active, insights, activity, activityDate, viewingAs }: {
  active:       AutomationListItem[]
  insights:     { active: number; engaged: number; completed: number; escalated: number }
  activity:     ActivityEntry[]
  activityDate: string
  viewingAs?:   ViewingAsInfo | null
}) {
  const [items,         setItems]         = useState<AutomationListItem[]>(active)
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [showNew,       setShowNew]       = useState(false)
  const [activeSection, setActiveSection] = useState<'active' | 'engaged' | 'escalated' | 'completed' | null>(null)
  const [searchQuery,   setSearchQuery]   = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  async function handlePause(id: string) {
    await pauseAutomation(id)
    setItems(prev => prev.map(a => a.id === id ? { ...a, status: 'paused' as const, paused_at: new Date().toISOString() } : a))
  }

  async function handleResume(id: string) {
    await resumeAutomation(id)
    setItems(prev => prev.map(a => a.id === id ? { ...a, status: 'running' as const, paused_at: null } : a))
  }

  function handleExportCSV() {
    const rows = [
      ['Contact', 'Goal', 'Status', 'Channel', 'Momentum', 'Steps', 'Last Activity'],
      ...items.map(a => [
        a.contact_name ?? '',
        GOAL_LABEL[a.goal],
        a.status,
        a.primary_channel,
        a.momentum,
        String(a.step_count),
        a.last_activity_at ? new Date(a.last_activity_at).toLocaleDateString() : '',
      ]),
    ]
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'automations.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const q = searchQuery.trim().toLowerCase()
  const filteredItems = q ? items.filter(a => (a.contact_name ?? '').toLowerCase().includes(q)) : items

  const SECTIONS = [
    {
      key:       'active'    as const,
      title:     'Active',
      accent:    'bg-emerald-500',
      border:    'border-emerald-500',
      statColor: 'text-emerald-500',
      statIcon:  Zap,
      statValue: insights.active,
      items:     filteredItems.filter(a => ['running','waiting'].includes(a.status)),
      emptyLabel: 'No active automations.',
    },
    {
      key:       'engaged'   as const,
      title:     'Engaged',
      accent:    'bg-violet-500',
      border:    'border-violet-500',
      statColor: 'text-violet-500',
      statIcon:  ArrowUpRight,
      statValue: insights.engaged,
      items:     filteredItems.filter(a => a.status === 'engaged'),
      emptyLabel: 'No engaged automations.',
    },
    {
      key:       'escalated' as const,
      title:     'Escalated',
      accent:    'bg-amber-400',
      border:    'border-amber-400',
      statColor: 'text-amber-400',
      statIcon:  AlertTriangle,
      statValue: insights.escalated,
      items:     filteredItems.filter(a => a.status === 'escalated'),
      emptyLabel: 'No escalated automations.',
    },
    {
      key:       'completed' as const,
      title:     'Completed',
      accent:    'bg-blue-500',
      border:    'border-blue-500',
      statColor: 'text-blue-500',
      statIcon:  CheckCircle2,
      statValue: insights.completed,
      items:     filteredItems.filter(a => ['completed','stopped','paused'].includes(a.status)),
      emptyLabel: 'No completed automations.',
    },
  ]
  // active section first (if any), remaining in original order below
  const orderedSections = activeSection
    ? [SECTIONS.find(s => s.key === activeSection)!, ...SECTIONS.filter(s => s.key !== activeSection)]
    : SECTIONS

  return (
    <div className="flex h-full min-h-0 overflow-hidden">

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden px-4 pt-6 pb-4">
        <div className="flex flex-col flex-1 min-h-0 w-full" style={{ maxWidth: '78rem', margin: '0 auto' }}>

          {/* ── Stat boxes — outside the card, above the header ────────────── */}
          <div className="grid grid-cols-4 gap-3 mb-5 shrink-0">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => { setActiveSection(prev => prev === s.key ? null : s.key); setExpandedId(null) }}
                className={cn(
                  'rounded-xl overflow-hidden text-left transition-all',
                  activeSection === s.key
                    ? 'ring-2 ring-[#15A4AE]/30 shadow-[0_2px_12px_rgba(21,164,174,0.18)]'
                    : 'shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_3px_10px_rgba(0,0,0,0.13)]',
                )}
              >
                {/* Colour bar with name */}
                <div className={cn('px-4 py-2 flex items-center gap-2', s.accent)}>
                  <s.statIcon className="w-4 h-4 text-white shrink-0" />
                  <span className="text-base font-bold text-white">{s.title}</span>
                </div>
                {/* Count */}
                <div className="bg-white dark:bg-[#1e1e1e] px-4 py-2.5 border border-t-0 border-gray-100 dark:border-white/8 rounded-b-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{s.statValue}</p>
                  <p className="text-[11px] text-gray-400 mt-1">total</p>
                </div>
              </button>
            ))}
          </div>

          {/* ── Outer card ─────────────────────────────────────────────────── */}
          <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#242424] rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.5)] border border-gray-200/70 dark:border-white/8 overflow-hidden">

            {/* ── Header bar ─────────────────────────────────────────────── */}
            <div className="theme-stable shrink-0 bg-[#141c2b] px-4 py-2.5 flex items-center gap-3 border-b border-white/10">
              <span className="text-sm font-semibold text-white shrink-0">Automations</span>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full pl-7 pr-7 py-1.5 text-xs bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1" />

              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors">
                <Download className="w-3 h-3" /> Export CSV
              </button>
              <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors">
                <Upload className="w-3 h-3" /> Import CSV
              </button>
              <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={() => {}} />
              <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#15A4AE] hover:bg-[#0e8b94] text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus className="w-3 h-3" /> New Automation
              </button>
            </div>

            {/* ── Stacked section cards ─────────────────────────────────── */}
            <div className="relative flex-1 min-h-0 m-3 overflow-hidden">
              {SECTIONS.map((s, sectionIdx) => {
                const isActive  = s.key === activeSection
                const H         = 44   // header bar height px
                const R         = 40   // row height px
                const GAP       = 8    // gap between stacked bars px
                const BAR_STACK = H * 3 + GAP * 4  // 3 inactive bars + gaps = 164px

                // ── Compute position style ──────────────────────────────
                let cardStyle: React.CSSProperties

                if (!activeSection) {
                  // No selection — all 4 peek with content, stacked from top
                  // Card N starts where card N-1 header + rows end
                  const tops: (number | string)[] = [
                    0,
                    H + 3 * R,             // 164px — 3 rows below card 1 header
                    H * 2 + 6 * R,         // 328px — 3 rows below card 2 header
                    H * 3 + 9 * R,         // 492px — 3 rows below card 3 header
                  ]
                  cardStyle = { top: tops[sectionIdx] ?? 0, bottom: 0, zIndex: sectionIdx + 1 }

                } else if (isActive) {
                  // Selected — active card fills top, leaves room for 3 bars at bottom
                  cardStyle = { top: 0, bottom: BAR_STACK, zIndex: 1 }

                } else {
                  // Selected — inactive: slim header bar only, stacked at bottom, no overlap
                  const inactiveRank = orderedSections.slice(1).findIndex(os => os.key === s.key)
                  const barBottoms   = [
                    GAP + (H + GAP) * 2,  // 100px — top bar
                    GAP + (H + GAP) * 1,  // 52px  — middle bar
                    GAP,                   // 4px   — bottom bar
                  ]
                  cardStyle = {
                    bottom:  barBottoms[inactiveRank] ?? GAP,
                    height:  H,
                    zIndex:  inactiveRank + 2,
                  }
                }

                // Render content in peek mode (no selection) or active mode
                const showContent = !activeSection || isActive

                return (
                  <div
                    key={s.key}
                    className={cn(
                      'absolute left-0 right-0 rounded-xl overflow-hidden',
                      'transition-all duration-300 ease-out',
                      'bg-white dark:bg-[#242424]',
                      isActive
                        ? 'shadow-[0_4px_20px_rgba(0,0,0,0.22)]'
                        : 'shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-white/10',
                    )}
                    style={cardStyle}
                  >
                    {/* Header bar */}
                    <button
                      onClick={() => { setActiveSection(prev => prev === s.key ? null : s.key); setExpandedId(null) }}
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-3 w-full shrink-0 transition-all duration-200',
                        s.accent,
                        !isActive && 'hover:brightness-110',
                      )}
                    >
                      <s.statIcon className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="text-xs font-semibold text-white flex-1 text-left">{s.title}</span>
                      <span className="text-xs font-medium text-white/70 tabular-nums">{s.items.length}</span>
                      <ChevronDown className={cn('w-3.5 h-3.5 text-white/60 transition-transform duration-200', isActive ? 'rotate-180' : '')} />
                    </button>

                    {/* Rows — shown in peek mode and active mode */}
                    {showContent && (
                      <div
                        className={isActive ? 'overflow-y-auto' : 'overflow-hidden pointer-events-none'}
                        style={{ height: 'calc(100% - 44px)' }}
                      >
                        {s.items.length === 0
                          ? (isActive ? <EmptyRows onNew={() => setShowNew(true)} /> : null)
                          : s.items.map(item => (
                              <AutomationRow
                                key={item.id}
                                item={item}
                                expanded={isActive && expandedId === item.id}
                                onToggle={isActive ? toggleExpand : (_id: string) => { setActiveSection(s.key); setExpandedId(null) }}
                                onPause={isActive ? handlePause : async (_id: string) => {}}
                                onResume={isActive ? handleResume : async (_id: string) => {}}
                              />
                            ))
                        }
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>

      {/* ── Right: activity feed ─────────────────────────────────────────────── */}
      <ActivitySidebar
        activity={activity}
        date={activityDate}
        currentPath="/sage/automations"
        viewingAs={viewingAs ?? null}
      />

      {showNew && (
        <NewAutomationModal
          onClose={() => setShowNew(false)}
          onCreated={() => setShowNew(false)}
        />
      )}
    </div>
  )
}
