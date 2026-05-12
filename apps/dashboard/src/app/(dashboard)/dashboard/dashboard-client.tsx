'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Mail, MessageSquare, FileText, Ticket as TicketIcon,
  Plus, Kanban, Zap, RefreshCw, Calendar,
  ChevronDown, X, CheckCircle2,
  Sparkles, LayoutList, LayoutGrid,
  Loader2, TrendingUp, BarChart2, CreditCard, Settings,
  Smartphone, Phone,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { useUserAvatar } from '@/contexts/user-avatar-context'
import { UpcomingPanel } from '@/components/sage/upcoming-panel'
import { updateAutoSetting, dismissFeedItem, runAutoBackfill, setDefaultPipeline } from '@/app/actions/sage-auto-settings'
import type { BackfillResultItem } from '@/app/actions/sage-auto-settings'
import { getWorkspacePipelines, batchMatchContacts } from '@/app/actions/sage-triage'
import type { ContactMatch } from '@/app/actions/sage-triage'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { ItemPopup } from '@/components/inbox/ItemPopup'
import type { PopupState } from '@/components/inbox/ItemPopup'
import { NotificationBell } from '@/components/layout/notification-bell'

// ── Types ─────────────────────────────────────────────────────────────────────
type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

interface RawEmail   { id: string; from_name: string | null; from_address: string; subject: string; received_at: string; ai_priority: string | null; ai_summary: string | null; ai_entities?: Record<string, string> | null }
interface RawBot     { id: string; title: string | null; platform: string | null; message_count: number; last_activity_at: string; ai_priority: string | null; bot: { name: string } | null; ai_entities?: Record<string, string> | null }
interface RawLead    { id: string; name: string; email: string | null; phone: string | null; company: string | null; lead_score: string | null; source_platform: string; created_at: string }
interface RawTicket  { id: string; title: string; priority: string; status: string; created_at: string; contact: { name: string; email: string | null; phone: string | null } | null }

type TItem =
  | { kind: 'email';  data: RawEmail;  time: string }
  | { kind: 'bot';    data: RawBot;    time: string }
  | { kind: 'sms';    data: RawBot;    time: string }
  | { kind: 'call';   data: RawBot;    time: string }
  | { kind: 'form';   data: RawLead;   time: string }
  | { kind: 'ticket'; data: RawTicket; time: string }

// Priority colours: High=green, Medium=yellow, Low=grey
const P_COLORS: Record<string, string> = {
  high:   '#22c55e',
  urgent: '#22c55e',
  medium: '#eab308',
  low:    '#9ca3af',
}
const P_BG: Record<string, string> = {
  high:   'bg-green-500',
  urgent: 'bg-green-500',
  medium: 'bg-yellow-400',
  low:    'bg-gray-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRange(preset: DatePreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now   = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  switch (preset) {
    case 'today':     return { from: today.toISOString(), to: now.toISOString() }
    case 'yesterday': {
      const s = new Date(today); s.setDate(s.getDate() - 1)
      const e = new Date(today); e.setMilliseconds(-1)
      return { from: s.toISOString(), to: e.toISOString() }
    }
    case '7d':  { const s = new Date(today); s.setDate(s.getDate() - 7);  return { from: s.toISOString(), to: now.toISOString() } }
    case '30d': { const s = new Date(today); s.setDate(s.getDate() - 30); return { from: s.toISOString(), to: now.toISOString() } }
    case 'custom': {
      if (customFrom && customTo) {
        const f = new Date(customFrom + 'T00:00:00'); const t = new Date(customTo + 'T23:59:59')
        return { from: f.toISOString(), to: t.toISOString() }
      }
      return { from: today.toISOString(), to: now.toISOString() }
    }
  }
}

// ── Recharts donut ────────────────────────────────────────────────────────────
interface DonutSegment { name: string; value: number; fill: string }

function DonutChart({ segments, total, size = 130 }: { segments: DonutSegment[]; total: number; size?: number }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const ir = Math.round(size * 0.29)
  const or = Math.round(size * 0.44)
  const filtered = segments.filter(s => s.value > 0)
  const data = (total === 0 || filtered.length === 0)
    ? [{ name: 'empty', value: 1, fill: '#e5e7eb' }]
    : filtered

  if (!mounted) return <div className="relative flex-shrink-0" style={{ width: size, height: size }} />

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie data={data} cx="50%" cy="50%" innerRadius={ir} outerRadius={or}
          dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0} isAnimationActive={total > 0}>
          {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
        </Pie>
        {total > 0 && <Tooltip formatter={(v: number, n: string) => [v, n]}
          contentStyle={{ fontSize: 11, borderRadius: 8, padding: '4px 8px' }} />}
      </PieChart>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`font-bold text-gray-900 dark:text-gray-100 leading-none ${size <= 60 ? 'text-sm' : size <= 80 ? 'text-lg' : 'text-xl'}`}>{total}</span>
      </div>
    </div>
  )
}

// ── Collapsed deck (drawer file tabs) ────────────────────────────────────────
interface DeckCard { label: string; Icon: React.ElementType; color: string; total: number; href: string }
function CollapsedDeck({ cards, loadingDonut, onNavigate }: { cards: DeckCard[]; loadingDonut: string | null; onNavigate: (label: string, href: string) => void }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', height: 52, overflow: 'visible' }}>
      {cards.map((card, i) => (
        <button
          key={card.label}
          onClick={() => onNavigate(card.label, card.href)}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.zIndex = '50' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.zIndex = String(i + 1) }}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 38,
            padding: '0 10px',
            marginLeft: i === 0 ? 0 : -18,
            borderRadius: '10px 10px 0 0',
            flex: 1,
            minWidth: 0,
            zIndex: i + 1,
            background: card.color,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            color: 'white',
            overflow: 'hidden',
          }}
        >
          {loadingDonut === card.label
            ? <Loader2 style={{ width: 13, height: 13, flexShrink: 0 }} className="animate-spin" />
            : <card.Icon style={{ width: 13, height: 13, flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{card.label}</span>
          <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
            {card.total}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Priority dot ──────────────────────────────────────────────────────────────
function PriorityDot({ priority, pulse = false }: { priority: string; pulse?: boolean }) {
  const cls = P_BG[priority] ?? 'bg-gray-400'
  if (pulse && (priority === 'high' || priority === 'urgent')) {
    return (
      <span className="relative flex h-2 w-2 shrink-0 mt-[5px]">
        <span className={`animate-ping absolute inset-0 rounded-full ${cls} opacity-70`} />
        <span className={`relative rounded-full h-2 w-2 ${cls}`} />
      </span>
    )
  }
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-[5px] ${cls}`} />
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} aria-label="Toggle"
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#15A4AE]' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Main dashboard component ──────────────────────────────────────────────────

interface TeamMember { user_id: string; name: string; role: WorkspaceMemberRole }

export function SageDashboardClient({
  workspaceId,
  callerRole,
  currentUserId,
  viewAsUserId,
  viewAsName,
  teamMembers = [],
  userName,
  emailConnected = true,
  connectProvider = null,
}: {
  workspaceId: string
  callerRole?: WorkspaceMemberRole
  currentUserId?: string | null
  viewAsUserId?: string | null
  viewAsName?: string | null  // kept for API compatibility
  teamMembers?: TeamMember[]
  userName?: string | null
  emailConnected?: boolean
  connectProvider?: string | null
}) {
  const [dateRange,  setDateRange]  = useState<DatePreset>('7d')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo,   setCustomTo]   = useState<string>('')
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    const base = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
    return userName ? `${base}, ${userName}` : base
  }, [userName])
  const [sageAuto,      setSageAuto]      = useState(false)
  const [backfilling,      setBackfilling]      = useState(false)
  const [backfillResults,  setBackfillResults]  = useState<BackfillResultItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [emails,     setEmails]     = useState<RawEmail[]>([])
  const [bots,       setBots]       = useState<RawBot[]>([])
  const [smsConvs,   setSmsConvs]   = useState<RawBot[]>([])
  const [callConvs,  setCallConvs]  = useState<RawBot[]>([])
  const [forms,      setForms]      = useState<RawLead[]>([])
  const [tickets,    setTickets]    = useState<RawTicket[]>([])
  const [popup,      setPopup]      = useState<PopupState | null>(null)
  const [feedView,    setFeedView]   = useState<'list' | 'grid'>('list')
  const [showFeedCal, setShowFeedCal] = useState(false)
  const feedCalRef = useRef<HTMLDivElement>(null)
  const [topType,     setTopType]    = useState<'email' | 'bot' | 'sms' | 'call' | 'form' | 'ticket' | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    setBannerDismissed(localStorage.getItem('inbox_banner_dismissed') === '1')
  }, [])
  const [donutsCollapsed,  setDonutsCollapsed]  = useState(false)
  const [loadingDonut,     setLoadingDonut]     = useState<string | null>(null)
  const [collapsingCard,   setCollapsingCard]   = useState<string | null>(null)
  const [showProfile,     setShowProfile]     = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  // Clear donut loading state once navigation settles
  useEffect(() => { setLoadingDonut(null) }, [pathname])

  // Avatar context
  const { avatarUrl, userName: avatarUserName, plan, brandColor, workspaceId: ctxWorkspaceId } = useUserAvatar()
  const initials = avatarUserName
    ? avatarUserName.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
    : '?'
  const planBadgeCls =
    plan === 'enterprise' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300' :
    plan === 'pro'        ? 'bg-[#15A4AE]/20 text-[#15A4AE]'  :
                           'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!showProfile) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProfile])

  // Sage voice: open a feed item popup without navigating away
  useEffect(() => {
    function handler(e: Event) {
      const { kind, id, action } = (e as CustomEvent<{ kind: 'email' | 'bot' | 'form' | 'ticket'; id: string; action?: string }>).detail
      if (kind && id) setPopup({ kind, id, action: action ?? undefined })
    }
    window.addEventListener('sage:open_item', handler)
    return () => window.removeEventListener('sage:open_item', handler)
  }, [])

  // Sage voice: filter the activity feed to a specific type (+ optional date range)
  useEffect(() => {
    function handler(e: Event) {
      const { filter, date_range } = (e as CustomEvent<{ filter: string; date_range?: string }>).detail
      const typeMap: Record<string, 'email' | 'bot' | 'sms' | 'call' | 'form' | 'ticket' | null> = {
        email: 'email', emails: 'email',
        bot: 'bot', bots: 'bot', conversations: 'bot', conversation: 'bot',
        sms: 'sms', text: 'sms', texts: 'sms',
        call: 'call', calls: 'call', phone: 'call', voice: 'call',
        form: 'form', forms: 'form',
        ticket: 'ticket', tickets: 'ticket',
        all: null,
      }
      if (filter in typeMap) {
        setDonutsCollapsed(true)
        setFeedView('grid')
        setTopType(typeMap[filter])
      }
      // Apply date range if provided — map common phrases to preset or custom
      if (date_range) {
        const lower = date_range.toLowerCase().trim()
        if (lower === 'today') {
          setDateRange('today')
        } else if (lower === 'yesterday') {
          setDateRange('yesterday')
        } else if (lower === 'this week' || lower === 'last 7 days' || lower === 'past 7 days') {
          setDateRange('7d')
        } else if (lower === 'this month' || lower === 'last 30 days' || lower === 'past 30 days') {
          setDateRange('30d')
        } else {
          // For other phrases (last week, past N days, from…to…) parse into custom range
          const today0 = new Date(); today0.setHours(0, 0, 0, 0)

          // "past/last N days"
          const nDays = lower.match(/(?:past|last)\s+(\d+)\s+days?/)
          if (nDays) {
            const n       = parseInt(nDays[1])
            const fromD   = new Date(today0.getTime() - n * 86_400_000)
            const toD     = new Date(today0.getTime() + 86_400_000 - 1)
            setCustomFrom(fromD.toISOString().slice(0, 10))
            setCustomTo(toD.toISOString().slice(0, 10))
            setDateRange('custom')
            return
          }
          // "last week"
          if (lower === 'last week') {
            const dow        = today0.getDay() || 7
            const thisMonday = new Date(today0.getTime() - (dow - 1) * 86_400_000)
            const lastMonday = new Date(thisMonday.getTime() - 7 * 86_400_000)
            const lastSunday = new Date(thisMonday.getTime() - 1)
            setCustomFrom(lastMonday.toISOString().slice(0, 10))
            setCustomTo(lastSunday.toISOString().slice(0, 10))
            setDateRange('custom')
            return
          }
          // "from YYYY-MM-DD to YYYY-MM-DD"
          const rangeMatch = lower.match(/(?:from\s+)?(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/)
          if (rangeMatch) {
            setCustomFrom(rangeMatch[1])
            setCustomTo(rangeMatch[2])
            setDateRange('custom')
          }
        }
      }
    }
    window.addEventListener('sage:filter_feed', handler)
    return () => window.removeEventListener('sage:filter_feed', handler)
  }, [])

  // Sage activity-feed trigger: ?section=bots|emails|tickets|forms
  // Collapses the overview donuts and opens the relevant grid section.
  useEffect(() => {
    const section = searchParams.get('section')
    const sectionMap: Record<string, 'bot' | 'email' | 'ticket' | 'form'> = {
      bots:    'bot',
      emails:  'email',
      tickets: 'ticket',
      forms:   'form',
    }
    const type = section ? sectionMap[section] : null
    if (type) {
      setDonutsCollapsed(true)
      setFeedView('grid')
      setTopType(type)
    }
  }, [searchParams])
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])
  const [defaultPipelineId, setDefaultPipelineId] = useState<string | null>(null)
  const [contactMatches, setContactMatches] = useState<Record<string, ContactMatch | null | undefined>>({})
  const [showAutoDesc, setShowAutoDesc] = useState(false)
  const autoDescTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Load preferences + DB settings on mount
  useEffect(() => {
    const r = localStorage.getItem('sage-range')
    if (r) setDateRange(r as DatePreset)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAny = supabase as any
    sbAny.from('sage_workspace_settings')
      .select('global_auto_enabled, default_pipeline_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
      .then(({ data }: { data: { global_auto_enabled: boolean; default_pipeline_id: string | null } | null }) => {
        if (data != null) {
          setSageAuto(data.global_auto_enabled ?? false)
          setDefaultPipelineId(data.default_pipeline_id ?? null)
        }
      })
    sbAny.from('sage_feed_dismissals')
      .select('source_type, source_id')
      .eq('workspace_id', workspaceId)
      .then(({ data }: { data: { source_type: string; source_id: string }[] | null }) => {
        if (data) setDismissedIds(new Set(data.map(d => `${d.source_type}-${d.source_id}`)))
      })
    getWorkspacePipelines().then(({ pipelines: p }) => setPipelines(p))
  }, [workspaceId])

  const handleDateChange = (v: DatePreset) => {
    setDateRange(v)
    if (v !== 'custom') localStorage.setItem('sage-range', v)
  }
  const handleBackfill = async () => {
    setBackfilling(true)
    const result = await runAutoBackfill()
    setBackfilling(false)
    if (result.results && result.results.length > 0) {
      setBackfillResults(prev => [...result.results!, ...prev])
    }
  }

  const dismissBackfillResult = (id: string) => {
    setBackfillResults(prev => prev.filter(r => r.id !== id))
  }

  const toggleSageAuto = async () => {
    const next = !sageAuto
    setSageAuto(next)
    await updateAutoSetting('global_auto_enabled', next)
    setShowAutoDesc(true)
    if (autoDescTimer.current) clearTimeout(autoDescTimer.current)
    autoDescTimer.current = setTimeout(() => setShowAutoDesc(false), 10000)
  }

  // Close feed calendar on outside click
  useEffect(() => {
    if (!showFeedCal) return
    const handler = (e: MouseEvent) => {
      if (feedCalRef.current && !feedCalRef.current.contains(e.target as Node)) setShowFeedCal(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFeedCal])

  const handleDismiss = async (kind: 'email' | 'bot' | 'form' | 'ticket', id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedIds(prev => new Set([...prev, `${kind}-${id}`]))
    await dismissFeedItem(kind, id)
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (dateRange === 'custom' && (!customFrom || !customTo)) return
    let cancelled = false
    if (refreshKey === 0) setLoading(true) // only show spinner on initial load
    const { from, to } = getRange(dateRange, customFrom, customTo)
    const supabase = createClient()

    // Roles below admin see a scoped subset of data:
    //   manager  — own data + employees below them
    //   employee — own data only
    const callerRankNow = callerRole ? ROLE_RANK[callerRole] : ROLE_RANK.owner
    const isRestricted  = callerRankNow < ROLE_RANK.admin
    // IDs this user is allowed to see (own + direct reports for managers)
    const visibleUserIds: string[] = isRestricted && currentUserId
      ? [
          currentUserId,
          // employees/members below manager
          ...(callerRankNow >= ROLE_RANK.manager
            ? teamMembers
                .filter(m => ROLE_RANK[m.role] < ROLE_RANK.manager)
                .map(m => m.user_id)
            : []),
        ]
      : []

    Promise.all([
      (() => {
        let q = supabase.from('sage_emails')
          .select('id, from_name, from_address, subject, received_at, ai_priority, ai_summary, ai_entities')
          .eq('workspace_id', workspaceId).eq('direction', 'inbound').eq('is_read', false).eq('is_trashed', false)
          .gte('received_at', from).lte('received_at', to)
          .order('received_at', { ascending: false })
        if (viewAsUserId) q = (q as any).eq('user_id', viewAsUserId)
        else if (visibleUserIds.length === 1) q = (q as any).eq('user_id', visibleUserIds[0])
        else if (visibleUserIds.length > 1) q = (q as any).in('user_id', visibleUserIds)
        return q
      })(),
      (() => {
        let q = supabase.from('conversations')
          .select('id, title, platform, message_count, last_activity_at, ai_priority, ai_entities, bot:bots(name)')
          .eq('workspace_id', workspaceId).eq('status', 'active').neq('platform', 'sms').neq('platform', 'voice')
          .gte('last_activity_at', from).lte('last_activity_at', to)
          .order('last_activity_at', { ascending: false })
        if (viewAsUserId) q = (q as any).eq('assigned_to', viewAsUserId)
        else if (visibleUserIds.length === 1) q = (q as any).eq('assigned_to', visibleUserIds[0])
        else if (visibleUserIds.length > 1) q = (q as any).in('assigned_to', visibleUserIds)
        return q
      })(),
      (() => {
        let q = supabase.from('conversations')
          .select('id, title, platform, message_count, last_activity_at, ai_priority, ai_entities, bot:bots(name)')
          .eq('workspace_id', workspaceId).eq('status', 'active').eq('platform', 'sms')
          .gte('last_activity_at', from).lte('last_activity_at', to)
          .order('last_activity_at', { ascending: false })
        if (viewAsUserId) q = (q as any).eq('assigned_to', viewAsUserId)
        else if (visibleUserIds.length === 1) q = (q as any).eq('assigned_to', visibleUserIds[0])
        else if (visibleUserIds.length > 1) q = (q as any).in('assigned_to', visibleUserIds)
        return q
      })(),
      (() => {
        let q = supabase.from('conversations')
          .select('id, title, platform, message_count, last_activity_at, ai_priority, ai_entities, bot:bots(name)')
          .eq('workspace_id', workspaceId).eq('status', 'active').eq('platform', 'voice')
          .gte('last_activity_at', from).lte('last_activity_at', to)
          .order('last_activity_at', { ascending: false })
        if (viewAsUserId) q = (q as any).eq('assigned_to', viewAsUserId)
        else if (visibleUserIds.length === 1) q = (q as any).eq('assigned_to', visibleUserIds[0])
        else if (visibleUserIds.length > 1) q = (q as any).in('assigned_to', visibleUserIds)
        return q
      })(),
      (() => {
        let q = supabase.from('sage_form_submissions')
          .select('id, fields, ai_priority, source_platform, created_at, assigned_to')
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null)
          .gte('created_at', from).lte('created_at', to)
          .order('created_at', { ascending: false })
          .limit(100)
        if (viewAsUserId) q = (q as any).eq('assigned_to', viewAsUserId)
        else if (visibleUserIds.length === 1) q = (q as any).eq('assigned_to', visibleUserIds[0])
        else if (visibleUserIds.length > 1) q = (q as any).in('assigned_to', visibleUserIds)
        return q
      })(),
      (() => {
        // Tickets: show all active tickets — no date filter, active = needs attention regardless of age
        let q = supabase.from('sage_tickets')
          .select('id, title, priority, status, created_at, contact:sage_contacts(name, email, phone)')
          .eq('workspace_id', workspaceId)
          .in('status', ['open', 'pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(100)
        if (viewAsUserId) q = (q as any).eq('owner_id', viewAsUserId)
        else if (visibleUserIds.length === 1) q = (q as any).eq('owner_id', visibleUserIds[0])
        else if (visibleUserIds.length > 1)  q = (q as any).in('owner_id', visibleUserIds)
        return q
      })(),
    ]).then(([eR, bR, smsR, callsR, fR, tR]) => {
      console.log('[dash:then]', 'cancelled=', cancelled, '| tickets=', tR.data?.length ?? 0, tR.error ? `ERR:${tR.error.message}` : 'ok')
      if (tR.error)  console.error('[dash:tickets-err]', tR.error)
      if (cancelled) return
      const newEmails  = (eR.data     ?? []) as RawEmail[]
      const newBots    = (bR.data     ?? []) as RawBot[]
      const newSms     = (smsR.data   ?? []) as RawBot[]
      const newCalls   = (callsR.data ?? []) as RawBot[]
      const newForms = ((fR.data ?? []) as Array<{
        id: string; fields: Record<string, string> | null; ai_priority: string | null
        source_platform: string; created_at: string; assigned_to: string | null
      }>).map(f => ({
        id:              f.id,
        name:            f.fields?.name ?? f.fields?.full_name ?? f.fields?.first_name ?? '(unknown)',
        email:           f.fields?.email ?? null,
        phone:           f.fields?.phone ?? null,
        company:         f.fields?.company ?? f.fields?.company_name ?? null,
        lead_score:      f.ai_priority,
        source_platform: f.source_platform,
        created_at:      f.created_at,
      })) as RawLead[]
      const newTickets = (tR.data  ?? []) as RawTicket[]
      setEmails(newEmails)
      setBots(newBots)
      setSmsConvs(newSms)
      setCallConvs(newCalls)
      setForms(newForms)
      setTickets(newTickets)
      setLoading(false)

      // Batch contact match — runs once after feed loads, no loading spinner needed
      const matchItems = [
        ...newEmails.map(e  => ({ id: e.id, email: e.ai_entities?.email ?? e.from_address, name: e.ai_entities?.name ?? e.from_name ?? undefined, phone: e.ai_entities?.phone ?? undefined, company: (e.ai_entities as Record<string, string> | null)?.company ?? undefined })),
        ...newBots.map(b    => ({ id: b.id, email: b.ai_entities?.email ?? undefined, name: b.ai_entities?.name ?? b.title ?? undefined, phone: b.ai_entities?.phone ?? undefined, company: (b.ai_entities as Record<string, string> | null)?.company ?? undefined })),
        ...newForms.map(f   => ({ id: f.id, email: f.email ?? undefined, name: f.name, phone: f.phone ?? undefined, company: f.company ?? undefined })),
        ...newTickets.map(t => ({ id: t.id, email: t.contact?.email ?? undefined, name: t.contact?.name ?? undefined, phone: t.contact?.phone ?? undefined })),
      ]
      setContactMatches(Object.fromEntries(matchItems.map(i => [i.id, undefined])))
      batchMatchContacts(matchItems)
        .then(results => { if (!cancelled) setContactMatches(results) })
        .catch(() => {
          // On error fall back to null (no match) so the UI doesn't stay stuck on "Checking…"
          if (!cancelled) setContactMatches(Object.fromEntries(matchItems.map(i => [i.id, null])))
        })
    }).catch((err: unknown) => {
      console.error('[dash:promise-all-threw]', err)
    })

    return () => { cancelled = true }
  }, [dateRange, customFrom, customTo, workspaceId, viewAsUserId, refreshKey])

  // ── Realtime: instant updates when Supabase replication is enabled ────────
  useEffect(() => {
    if (!workspaceId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard-forms-${workspaceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sage_form_submissions', filter: `workspace_id=eq.${workspaceId}` },
        () => setRefreshKey(k => k + 1),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [workspaceId])

  // ── Silent 10s poll + tab-focus refresh ──────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 10_000)
    const onVisible = () => { if (document.visibilityState === 'visible') setRefreshKey(k => k + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  // ── Visible (non-dismissed) subsets — used by both donuts and timeline ───
  const visEmails  = useMemo(() => emails.filter(e    => !dismissedIds.has(`email-${e.id}`)),     [emails,     dismissedIds])
  const visBots    = useMemo(() => bots.filter(b      => !dismissedIds.has(`bot-${b.id}`)),       [bots,       dismissedIds])
  const visSms     = useMemo(() => smsConvs.filter(s  => !dismissedIds.has(`bot-${s.id}`)),       [smsConvs,   dismissedIds])
  const visCalls   = useMemo(() => callConvs.filter(c => !dismissedIds.has(`bot-${c.id}`)),       [callConvs,  dismissedIds])
  const visForms   = useMemo(() => forms.filter(f     => !dismissedIds.has(`form-${f.id}`)),      [forms,      dismissedIds])
  // Tickets are open support items — always show regardless of dismissal until status changes
  const visTickets = useMemo(() => tickets, [tickets])

  // ── Donut segments (always reflect visible feed, same as triage counts) ──
  const emailSegs:  DonutSegment[] = [{ name: 'High', value: visEmails.filter(e => e.ai_priority === 'high').length,  fill: P_COLORS.high }, { name: 'Medium', value: visEmails.filter(e => e.ai_priority === 'medium').length,  fill: P_COLORS.medium }]
  const botSegs:    DonutSegment[] = [{ name: 'High', value: visBots.filter(b => b.ai_priority === 'high').length,    fill: P_COLORS.high }, { name: 'Medium', value: visBots.filter(b => b.ai_priority === 'medium').length,    fill: P_COLORS.medium }]
  const smsSegs:    DonutSegment[] = [{ name: 'High', value: visSms.filter(s => s.ai_priority === 'high').length,     fill: P_COLORS.high }, { name: 'Medium', value: visSms.filter(s => s.ai_priority === 'medium').length,     fill: P_COLORS.medium }]
  const callSegs:   DonutSegment[] = [{ name: 'High', value: visCalls.filter(c => c.ai_priority === 'high').length,   fill: P_COLORS.high }, { name: 'Medium', value: visCalls.filter(c => c.ai_priority === 'medium').length,   fill: P_COLORS.medium }]
  const formSegs:   DonutSegment[] = [{ name: 'High', value: visForms.filter(f => f.lead_score === 'high').length, fill: P_COLORS.high }, { name: 'Medium', value: visForms.filter(f => f.lead_score === 'medium').length, fill: P_COLORS.medium }, { name: 'Low', value: visForms.filter(f => f.lead_score === 'low' || !f.lead_score).length, fill: P_COLORS.low }]
  const ticketSegs: DonutSegment[] = [{ name: 'High', value: visTickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length, fill: P_COLORS.high }, { name: 'Medium', value: visTickets.filter(t => t.priority === 'medium').length, fill: P_COLORS.medium }, { name: 'Low', value: visTickets.filter(t => t.priority === 'low').length, fill: P_COLORS.low }]

  // ── Timeline (uses pre-filtered visible arrays) ───────────────────────────
  const P_RANK: Record<string, number> = { urgent: 0, high: 0, medium: 1, low: 2 }
  function itemPriority(item: TItem): number {
    const d = item.data as unknown as Record<string, unknown>
    const p = (d.ai_priority ?? d.priority ?? d.lead_score ?? '') as string
    return P_RANK[p] ?? 3
  }
  const timeline = useMemo<TItem[]>(() => {
    const all: TItem[] = [
      ...visEmails.map(d  => ({ kind: 'email'  as const, data: d, time: d.received_at     })),
      ...visBots.map(d    => ({ kind: 'bot'    as const, data: d, time: d.last_activity_at })),
      ...visSms.map(d     => ({ kind: 'sms'    as const, data: d, time: d.last_activity_at })),
      ...visCalls.map(d   => ({ kind: 'call'   as const, data: d, time: d.last_activity_at })),
      ...visForms.map(d   => ({ kind: 'form'   as const, data: d, time: d.created_at      })),
      ...visTickets.map(d => ({ kind: 'ticket' as const, data: d, time: d.created_at      })),
    ]
    // List mode: high + medium only (but always include tickets). Grid mode: all items.
    const items = feedView === 'list'
      ? all.filter(item => item.kind === 'ticket' || itemPriority(item) <= 1)
      : all
    return items.sort((a, b) => {
      const pd = itemPriority(a) - itemPriority(b)
      if (pd !== 0) return pd
      return new Date(b.time).getTime() - new Date(a.time).getTime()
    })
  }, [visEmails, visBots, visSms, visCalls, visForms, visTickets, feedView])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* AI Summary popup */}
      {popup && (
        <ItemPopup
          popup={popup}
          pipelines={pipelines}
          contactMatch={contactMatches[popup.id]}
          onClose={() => setPopup(null)}
          onPriorityChanged={(emailId, priority) => {
            setEmails(prev => prev.map(e => e.id === emailId ? { ...e, ai_priority: priority } : e))
          }}
          onAction={(extra) => {
            if (popup) {
              // Always dismiss the source feed item
              const allKeys = [
                { kind: popup.kind, id: popup.id },
                ...(extra ?? []),
              ]
              setDismissedIds(prev => {
                const next = new Set(prev)
                allKeys.forEach(k => next.add(`${k.kind}-${k.id}`))
                return next
              })
              allKeys.forEach(k => dismissFeedItem(k.kind as 'email' | 'bot' | 'form' | 'ticket', k.id))
            }
          }}
        />
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-3 flex-wrap pt-2 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{greeting}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Here&apos;s what needs your attention today
          </p>
        </div>

        <div className="flex items-start gap-3 flex-wrap">
          {/* Quick actions */}
          <Link href="/sage/contacts" className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl bg-[#2a7d6e] hover:bg-[#1f6157] text-white shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </Link>
          <Link href="/sage/pipelines" className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
            <Kanban className="w-3.5 h-3.5" /> Pipelines
          </Link>

          {/* View as — team member picker for managers */}
          {teamMembers.length > 0 && (
            <div className="relative">
              <select
                value={viewAsUserId ?? ''}
                onChange={e => {
                  const val = e.target.value
                  window.location.href = val ? `/dashboard?viewAs=${val}` : '/dashboard'
                }}
                className="appearance-none pl-3 pr-7 py-2 text-sm border dark:border-white/10 rounded-xl bg-white dark:bg-[#232323] text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                {viewAsUserId
                  ? <option value="">← My view</option>
                  : <option value="" disabled>View as…</option>
                }
                {teamMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={dateRange} onChange={e => handleDateChange(e.target.value as DatePreset)}
                className="appearance-none bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl pl-3 pr-8 py-2 focus:outline-none cursor-pointer">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Choose...</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
            {dateRange === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 focus:outline-none"
                  placeholder="dd/mm/yyyy" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 focus:outline-none"
                  placeholder="dd/mm/yyyy" />
              </div>
            )}
          </div>

          {/* Sage Auto */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl px-4 py-2">
              <Zap className={`w-3.5 h-3.5 shrink-0 ${sageAuto ? 'text-[#15A4AE]' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sage Auto</span>
              <Toggle checked={sageAuto} onChange={toggleSageAuto} />
              <span className={`text-xs font-bold ${sageAuto ? 'text-[#15A4AE]' : 'text-gray-400'}`}>
                {sageAuto ? 'ON' : 'OFF'}
              </span>
              {/* Right side — always fills the gap */}
              <div className="ml-auto flex items-center gap-2">
                {pipelines.length > 0 && (
                  <select
                    value={defaultPipelineId ?? ''}
                    onChange={async e => {
                      const val = e.target.value || null
                      setDefaultPipelineId(val)
                      await setDefaultPipeline(val)
                    }}
                    className="text-[11px] bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 cursor-pointer"
                  >
                    <option value="">Default pipeline</option>
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                {sageAuto && (
                  <button
                    onClick={handleBackfill}
                    disabled={backfilling}
                    title="Process existing emails, bots & forms that were analysed before Sage Auto was enabled"
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 hover:text-[#3a9e8a] hover:border-[#15A4AE]/40 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {backfilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    {backfilling ? 'Processing…' : 'Process existing'}
                  </button>
                )}

                {/* Notification bell */}
                {(ctxWorkspaceId || workspaceId) && (
                  <NotificationBell workspaceId={ctxWorkspaceId || workspaceId} />
                )}

                {/* User avatar + dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfile(v => !v)}
                    title="Account"
                    className={`flex items-center rounded-full border-2 transition-all ${
                      showProfile ? 'border-gray-400 dark:border-white/40 ring-2 ring-gray-200 dark:ring-white/10' : 'border-gray-200 dark:border-white/20 hover:border-gray-300 dark:hover:border-white/40'
                    }`}
                  >
                    <div
                      className="relative w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase select-none overflow-hidden"
                      style={{ backgroundColor: brandColor }}
                    >
                      {initials}
                      {avatarUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      )}
                    </div>
                  </button>

                  {showProfile && (
                    <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/12 rounded-2xl shadow-xl w-52 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8 flex items-center gap-2.5">
                        <div
                          className="relative w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase select-none overflow-hidden"
                          style={{ backgroundColor: brandColor }}
                        >
                          {initials}
                          {avatarUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {avatarUserName && <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{avatarUserName}</p>}
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none mt-0.5 ${planBadgeCls}`}>
                            {plan}
                          </span>
                        </div>
                      </div>
                      <div className="py-1.5">
                        {[
                          { href: '/settings',         label: 'Settings',       Icon: Settings   },
                          { href: '/sage/roi',         label: 'ROI',            Icon: TrendingUp },
                          { href: '/analytics',        label: 'Analytics',      Icon: BarChart2  },
                          { href: '/settings/upgrade', label: 'Plan (Upgrade)', Icon: CreditCard },
                          { href: '/settings/billing', label: 'Billing',        Icon: CreditCard },
                          { href: '/settings/support', label: 'Support',        Icon: Sparkles   },
                        ].map(({ href, label, Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setShowProfile(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <Icon className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" />
                            {label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Status description — fades in briefly after toggle */}
            <p className={`text-[11px] px-1 transition-opacity duration-500 ${showAutoDesc ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${sageAuto ? 'text-[#15A4AE]' : 'text-gray-400 dark:text-gray-500'}`}>
              {sageAuto
                ? 'Full automation ON — AI creates contacts & deals automatically.'
                : 'Assist mode — AI analyses only. You act manually in the dashboard.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sage Auto process results ────────────────────────────────── */}
      {backfillResults.length > 0 && (
        <div className="mb-2 space-y-1 shrink-0">
          {backfillResults.map(r => {
            const pipeline = pipelines.find(p => p.id === r.pipelineId)
            const channelLabel = r.channel === 'email' ? 'email' : r.channel === 'bots' ? 'bot chat' : r.channel === 'forms' ? 'form' : 'ticket'
            const line = r.action === 'create_lead'
              ? `Contact created from ${channelLabel} for "${r.name}"${pipeline ? ` — deal created under "${pipeline.name}"` : ''}`
              : `Ticket created from ${channelLabel} for "${r.name}"`
            return (
              <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#15A4AE]/8 dark:bg-[#15A4AE]/10 border border-[#15A4AE]/20 dark:border-[#15A4AE]/15">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3a9e8a] dark:text-[#15A4AE] shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{line}</span>
                <button
                  onClick={() => dismissBackfillResult(r.id)}
                  className="shrink-0 p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Sync inbox banner — shown when no email is connected ───────── */}
      {!emailConnected && !viewAsUserId && !bannerDismissed && (
        <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-[#15A4AE] rounded-xl shadow-md shrink-0">
          <Mail className="w-5 h-5 text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Connect &amp; sync your inbox</p>
            <p className="text-xs text-white/80">Link Gmail or Outlook so Sage AI can read and prioritise your emails.</p>
          </div>
          <Link
            href={connectProvider ? `/onboarding/connect?provider=${connectProvider}` : '/onboarding/connect'}
            className="text-sm font-bold text-white whitespace-nowrap hover:underline shrink-0"
          >
            Get started →
          </Link>
          <button
            onClick={() => {
              localStorage.setItem('inbox_banner_dismissed', '1')
              setBannerDismissed(true)
            }}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 4 Donut cards ──────────────────────────────────────────────── */}
      <div className="mb-3 overflow-visible shrink-0">
        {/* Section header with collapse toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overview</span>
          <button
            onClick={() => setDonutsCollapsed(c => !c)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${donutsCollapsed ? '-rotate-90' : ''}`} />
            {donutsCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>

        {donutsCollapsed ? (
          <CollapsedDeck
            cards={[
              { label: 'Emails',        Icon: Mail,          color: '#5E6BFA', total: visEmails.length, href: viewAsUserId ? `/dashboard/email?viewAs=${viewAsUserId}`    : '/dashboard/email'    },
              { label: 'SMS',           Icon: Smartphone,    color: '#88D400', total: visSms.length,    href: '/dashboard/sms'   },
              { label: 'Phone Calls',   Icon: Phone,         color: '#EC4E96', total: visCalls.length,  href: '/dashboard/calls' },
              { label: 'Conversations', Icon: MessageSquare, color: '#9737E8', total: visBots.length,   href: viewAsUserId ? `/dashboard/bots?viewAs=${viewAsUserId}`    : '/dashboard/bots'    },
              { label: 'Forms',         Icon: FileText,      color: '#14B824', total: visForms.length,  href: viewAsUserId ? `/dashboard/forms?viewAs=${viewAsUserId}`   : '/dashboard/forms'   },
              { label: 'Tickets',       Icon: TicketIcon,    color: '#D9A400', total: tickets.length,   href: viewAsUserId ? `/dashboard/tickets?viewAs=${viewAsUserId}` : '/dashboard/tickets' },
            ]}
            loadingDonut={loadingDonut}
            onNavigate={(label, href) => { setLoadingDonut(label); router.push(href) }}
          />
        ) : (
          <div className={`grid grid-cols-6 gap-3 overflow-visible transition-all duration-300 ${collapsingCard ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {[
              { label: 'Emails',        sub: 'unread',      Icon: Mail,          accentCls: 'bg-blue-600',   accentColor: undefined,  segs: emailSegs,  total: visEmails.length,  href: viewAsUserId ? `/dashboard/email?viewAs=${viewAsUserId}`    : '/dashboard/email'    },
              { label: 'SMS',           sub: 'threads',     Icon: Smartphone,    accentCls: '',              accentColor: '#7bcd13',  segs: smsSegs,    total: visSms.length,     href: '/dashboard/sms'   },
              { label: 'Phone Calls',   sub: 'calls',       Icon: Phone,         accentCls: '',              accentColor: '#eb5297',  segs: callSegs,   total: visCalls.length,   href: '/dashboard/calls' },
              { label: 'Conversations', sub: 'active',      Icon: MessageSquare, accentCls: 'bg-purple-600', accentColor: undefined,  segs: botSegs,    total: visBots.length,    href: viewAsUserId ? `/dashboard/bots?viewAs=${viewAsUserId}`    : '/dashboard/bots'    },
              { label: 'Forms',         sub: 'submissions', Icon: FileText,      accentCls: 'bg-green-600',  accentColor: undefined,  segs: formSegs,   total: visForms.length,   href: viewAsUserId ? `/dashboard/forms?viewAs=${viewAsUserId}`   : '/dashboard/forms'   },
              { label: 'Tickets',       sub: 'open',        Icon: TicketIcon,    accentCls: 'bg-amber-500',  accentColor: undefined,  segs: ticketSegs, total: tickets.length,    href: viewAsUserId ? `/dashboard/tickets?viewAs=${viewAsUserId}` : '/dashboard/tickets' },
            ].map(card => {
              const isLoading = loadingDonut === card.label
              const accentStyle = card.accentColor ? { backgroundColor: card.accentColor } : undefined
              return (
                <button key={card.label}
                  onClick={() => {
                    setCollapsingCard(card.label)
                    setTimeout(() => {
                      setDonutsCollapsed(true)
                      setCollapsingCard(null)
                      setLoadingDonut(card.label)
                      router.push(card.href)
                    }, 280)
                  }}
                  className="relative bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 overflow-visible flex flex-col hover:shadow-md hover:border-gray-300 dark:hover:border-white/15 transition-all cursor-pointer w-full group">
                  {/* Top colour bar */}
                  <div
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-t-xl ${card.accentCls}`}
                    style={accentStyle}
                  >
                    <p className="text-xs font-semibold text-white truncate">{card.label}</p>
                    {isLoading
                      ? <Loader2 className="w-3 h-3 animate-spin text-white/70 shrink-0" />
                      : <card.Icon className="w-3 h-3 text-white/70 shrink-0" />}
                  </div>
                  {/* Content + donut */}
                  <div className="flex-1 flex flex-col items-center justify-center px-3 py-4 overflow-visible h-[120px]">
                    {/* Donut centered */}
                    <div className="opacity-85 group-hover:opacity-100 transition-opacity relative z-10">
                      <DonutChart segments={card.segs} total={card.total} size={72} />
                    </div>
                    {/* Segments in one row */}
                    <div className="flex items-center gap-3 mt-2">
                      {card.segs.map(s => (
                        <span key={s.name} className="flex items-center gap-1 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.fill }} />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-none">{s.value}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">{s.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 2 : 1 layout ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-4 overflow-hidden">

        {/* Left: activity feed */}
        <div className="xl:col-span-2 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-[#141c2b] border-b border-white/10 flex items-center justify-between rounded-t-xl shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Activity Feed</h2>
              {/* List / Grid toggle */}
              <div className="flex items-center gap-0.5 bg-white/10 rounded-lg px-0.5 py-0">
                <button
                  onClick={() => setFeedView('list')}
                  className={`p-1 rounded-md transition-colors ${feedView === 'list' ? 'bg-white/25 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                  title="List view"
                >
                  <LayoutList className="w-[18px] h-[18px]" />
                </button>
                <button
                  onClick={() => setFeedView('grid')}
                  className={`p-1 rounded-md transition-colors ${feedView === 'grid' ? 'bg-white/25 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-[18px] h-[18px]" />
                </button>
              </div>
              {/* Date filter */}
              <div className="relative" ref={feedCalRef}>
                <button
                  onClick={() => setShowFeedCal(v => !v)}
                  title="Filter by date"
                  className="flex items-center gap-1.5 py-1 px-1.5 rounded-lg border transition-colors text-xs border-[#ccd7ff]/40 text-[#ccd7ff] bg-[#ccd7ff]/5 hover:bg-[#ccd7ff]/10"
                >
                  <Calendar className="w-[18px] h-[18px]" />
                  <span className="hidden sm:inline font-medium">
                    {dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : dateRange === '7d' ? '7d' : dateRange === '30d' ? '30d' : 'Custom'}
                  </span>
                </button>
                {showFeedCal && (
                  <div className="absolute left-0 top-full mt-2 z-30 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/12 rounded-2xl shadow-xl p-4 w-72">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Date Range</p>
                    {/* Quick presets */}
                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                      {(['today', 'yesterday', '7d', '30d'] as const).map(preset => (
                        <button
                          key={preset}
                          onClick={() => { handleDateChange(preset); setShowFeedCal(false) }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            dateRange === preset
                              ? 'bg-[#15A4AE] text-white'
                              : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/12'
                          }`}
                        >
                          {preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yest.' : preset === '7d' ? '7 days' : '30 days'}
                        </button>
                      ))}
                    </div>
                    {/* Custom range */}
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Custom Range</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 w-7 shrink-0">From</span>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={e => { setCustomFrom(e.target.value); handleDateChange('custom') }}
                          className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 w-7 shrink-0">To</span>
                        <input
                          type="date"
                          value={customTo}
                          onChange={e => { setCustomTo(e.target.value); handleDateChange('custom') }}
                          className="flex-1 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
                        />
                      </div>
                    </div>
                    {customFrom && customTo && dateRange === 'custom' && (
                      <button
                        onClick={() => setShowFeedCal(false)}
                        className="mt-3 w-full py-1.5 bg-[#15A4AE] hover:bg-[#1290a0] text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Type icon counts — clickable in both views; in grid view also brings that tablet to top */}
            <div className="flex items-center gap-3 text-xs font-bold">
              <button
                onClick={() => { setFeedView('grid'); setTopType('email') }}
                className={`flex items-center gap-1 text-white/80 hover:text-white transition-colors ${topType === 'email' && feedView === 'grid' ? 'font-bold text-white' : ''}`}
                title="Emails"
              >
                <Mail className="w-[18px] h-[18px] text-blue-400" />{visEmails.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('sms') }}
                className={`flex items-center gap-1 text-white/80 hover:text-white transition-colors ${topType === 'sms' && feedView === 'grid' ? 'font-bold text-white' : ''}`}
                title="SMS"
              >
                <Smartphone className="w-[18px] h-[18px]" style={{ color: '#7bcd13' }} />{visSms.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('call') }}
                className={`flex items-center gap-1 text-white/80 hover:text-white transition-colors ${topType === 'call' && feedView === 'grid' ? 'font-bold text-white' : ''}`}
                title="Phone Calls"
              >
                <Phone className="w-[18px] h-[18px]" style={{ color: '#eb5297' }} />{visCalls.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('bot') }}
                className={`flex items-center gap-1 text-white/80 hover:text-white transition-colors ${topType === 'bot' && feedView === 'grid' ? 'font-bold text-white' : ''}`}
                title="Bot chats"
              >
                <MessageSquare className="w-[18px] h-[18px] text-purple-400" />{visBots.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('form') }}
                className={`flex items-center gap-1 text-white/80 hover:text-white transition-colors ${topType === 'form' && feedView === 'grid' ? 'font-bold text-white' : ''}`}
                title="Form submissions"
              >
                <FileText className="w-[18px] h-[18px] text-green-400" />{visForms.length}
              </button>
              <button
                onClick={() => { setFeedView('grid'); setTopType('ticket') }}
                className={`flex items-center gap-1 text-white/80 hover:text-white transition-colors ${topType === 'ticket' && feedView === 'grid' ? 'font-bold text-white' : ''}`}
                title="Tickets"
              >
                <TicketIcon className="w-[18px] h-[18px] text-amber-400" />{visTickets.length}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24"><RefreshCw className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : feedView === 'list' ? (
            /* ── LIST VIEW ──────────────────────────────────────────────── */
            timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                <p className="text-sm text-gray-400">No activity for this period.</p>
                <p className="text-xs text-gray-400 mt-1">Try selecting a wider date range.</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-white/8 overflow-y-auto flex-1 min-h-0">
                {timeline.map(item => {
                  const timeKey = `${item.kind}-${item.data.id}`
                  const timeLabel = timeAgo(item.time)
                  if (item.kind === 'email') {
                    const e = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'email', id: e.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                        <div className="w-6 h-6 rounded-md bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{e.from_name ?? e.from_address}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.subject}</p>
                          {e.ai_summary && <p className="text-[11px] text-gray-400 italic truncate mt-0.5">{e.ai_summary}</p>}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('email', e.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'bot') {
                    const b = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'bot', id: b.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                        <div className="w-6 h-6 rounded-md bg-purple-200 dark:bg-purple-500/30 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{b.title ?? 'Untitled conversation'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {b.bot?.name && <span className="font-medium">{b.bot.name} · </span>}{b.message_count} msgs
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('bot', b.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'sms') {
                    const s = item.data
                    const contact = s.ai_entities?.name ?? s.ai_entities?.phone ?? null
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'bot', id: s.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={s.ai_priority ?? 'low'} pulse={s.ai_priority === 'high'} />
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: '#7bcd1320' }}>
                          <Smartphone className="w-3.5 h-3.5" style={{ color: '#7bcd13' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{s.title ?? contact ?? 'SMS'}</p>
                          {contact && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact}</p>}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('bot', s.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'call') {
                    const c = item.data
                    const caller = c.ai_entities?.name ?? c.ai_entities?.phone ?? null
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'bot', id: c.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={c.ai_priority ?? 'low'} pulse={c.ai_priority === 'high'} />
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: '#eb529720' }}>
                          <Phone className="w-3.5 h-3.5" style={{ color: '#eb5297' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.title ?? caller ?? 'Phone call'}</p>
                          {caller && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{caller}</p>}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('bot', c.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'form') {
                    const f = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'form', id: f.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={f.lead_score ?? 'low'} />
                        <div className="w-6 h-6 rounded-md bg-green-200 dark:bg-green-500/30 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-green-700 dark:text-green-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.company ?? f.email ?? f.source_platform}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('form', f.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  if (item.kind === 'ticket') {
                    const t = item.data
                    return (
                      <div key={timeKey} onClick={() => setPopup({ kind: 'ticket', id: t.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                        <PriorityDot priority={t.priority} pulse={t.priority === 'high' || t.priority === 'urgent'} />
                        <div className="w-6 h-6 rounded-md bg-yellow-200 dark:bg-yellow-500/30 flex items-center justify-center shrink-0">
                          <TicketIcon className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {t.contact && <span className="text-xs text-gray-500 dark:text-gray-400">{t.contact.name}</span>}
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${P_COLORS[t.priority] ?? '#9ca3af'}20`, color: P_COLORS[t.priority] ?? '#9ca3af' }}>
                              {t.priority}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{timeLabel}</span>
                        <button onClick={ev => handleDismiss('ticket', t.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            )
          ) : (
            /* ── GRID VIEW: 4 stacked tablets ───────────────────────────── */
            (() => {
              const sortP = (p: string | null | undefined) => P_RANK[p ?? ''] ?? 3
              const sortedEmails  = [...visEmails].sort((a, b) => sortP(a.ai_priority) - sortP(b.ai_priority))
              const sortedBots    = [...visBots].sort((a, b)   => sortP(a.ai_priority) - sortP(b.ai_priority))
              const sortedForms   = [...visForms].sort((a, b)  => sortP(a.lead_score)  - sortP(b.lead_score))
              const sortedTickets = [...visTickets].sort((a, b) => sortP(a.priority)   - sortP(b.priority))
              const sortedSms     = [...visSms].sort((a, b)    => sortP(a.ai_priority) - sortP(b.ai_priority))
              const sortedCalls   = [...visCalls].sort((a, b)  => sortP(a.ai_priority) - sortP(b.ai_priority))
              const allTablets: Array<{
                key: 'email' | 'bot' | 'sms' | 'call' | 'form' | 'ticket'
                label: string
                icon: React.ReactNode
                accentClass: string
                borderClass: string
                bgClass: string
                headerBg: string
                count: number
                rows: React.ReactNode
                previewRows: React.ReactNode | null
              }> = [
                {
                  key: 'email',
                  label: 'Emails',
                  icon: <Mail className="w-3.5 h-3.5" />,
                  accentClass: 'text-blue-700 dark:text-blue-300',
                  borderClass: 'border-blue-300 dark:border-blue-500/30',
                  bgClass: 'bg-blue-200 dark:bg-blue-500/25',
                  headerBg: '#6877ed',
                  count: visEmails.filter(e => e.ai_priority === 'high' || e.ai_priority === 'urgent' || e.ai_priority === 'medium').length,
                  rows: sortedEmails.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No emails this period.</p>
                    : sortedEmails.map(e => (
                      <div key={e.id} onClick={() => setPopup({ kind: 'email', id: e.id })}
                        className="group flex items-start gap-3 px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer border-b border-blue-100 dark:border-blue-500/15 last:border-0">
                        <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{e.from_name ?? e.from_address}</p>
                          <p className="text-[11px] text-blue-600/80 dark:text-blue-300/70 truncate">{e.subject}</p>
                          {e.ai_summary && <p className="text-[10px] text-blue-500/60 dark:text-blue-400/60 italic truncate mt-0.5">{e.ai_summary}</p>}
                        </div>
                        <span className="text-[10px] text-blue-500/70 dark:text-blue-400/60 shrink-0">{timeAgo(e.received_at)}</span>
                        <button onClick={ev => handleDismiss('email', e.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                  previewRows: sortedEmails.slice(0, 3).map(e => (
                    <div key={e.id} onClick={() => setPopup({ kind: 'email', id: e.id })}
                      className="group flex items-start gap-3 px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer border-b border-blue-100 dark:border-blue-500/15 last:border-0">
                      <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{e.from_name ?? e.from_address}</p>
                        <p className="text-[11px] text-blue-600/80 dark:text-blue-300/70 truncate">{e.subject}</p>
                        {e.ai_summary && <p className="text-[10px] text-blue-500/60 dark:text-blue-400/60 italic truncate mt-0.5">{e.ai_summary}</p>}
                      </div>
                      <span className="text-[10px] text-blue-500/70 dark:text-blue-400/60 shrink-0">{timeAgo(e.received_at)}</span>
                    </div>
                  )),
                },
                {
                  key: 'sms' as const,
                  label: 'SMS',
                  icon: <Smartphone className="w-3.5 h-3.5" />,
                  accentClass: 'text-[#7bcd13]',
                  borderClass: 'border-[#7bcd13]/30',
                  bgClass: 'bg-[#7bcd13]/15',
                  headerBg: '#7bcd13',
                  count: visSms.length,
                  rows: sortedSms.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No SMS conversations this period.</p>
                    : sortedSms.map(s => {
                        const contact = s.ai_entities?.name ?? s.ai_entities?.phone ?? null
                        return (
                          <div key={s.id} onClick={() => setPopup({ kind: 'bot', id: s.id })}
                            className="group flex items-start gap-3 px-5 py-3 hover:bg-[#7bcd13]/5 transition-colors cursor-pointer border-b border-[#7bcd13]/15 last:border-0">
                            <PriorityDot priority={s.ai_priority ?? 'low'} pulse={s.ai_priority === 'high'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{s.title ?? contact ?? 'SMS'}</p>
                              {contact && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{contact}</p>}
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(s.last_activity_at)}</span>
                            <button onClick={ev => handleDismiss('bot', s.id, ev)} title="Dismiss"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 transition-all shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      }),
                  previewRows: sortedSms.slice(0, 2).map(s => {
                    const contact = s.ai_entities?.name ?? s.ai_entities?.phone ?? null
                    return (
                      <div key={s.id} onClick={() => setPopup({ kind: 'bot', id: s.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-[#7bcd13]/5 transition-colors cursor-pointer border-b border-[#7bcd13]/15 last:border-0">
                        <PriorityDot priority={s.ai_priority ?? 'low'} pulse={s.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{s.title ?? contact ?? 'SMS'}</p>
                          {contact && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{contact}</p>}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(s.last_activity_at)}</span>
                      </div>
                    )
                  }),
                },
                {
                  key: 'call' as const,
                  label: 'Phone Calls',
                  icon: <Phone className="w-3.5 h-3.5" />,
                  accentClass: 'text-[#eb5297]',
                  borderClass: 'border-[#eb5297]/30',
                  bgClass: 'bg-[#eb5297]/15',
                  headerBg: '#eb5297',
                  count: visCalls.length,
                  rows: sortedCalls.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No phone calls this period.</p>
                    : sortedCalls.map(c => {
                        const caller = c.ai_entities?.name ?? c.ai_entities?.phone ?? null
                        return (
                          <div key={c.id} onClick={() => setPopup({ kind: 'bot', id: c.id })}
                            className="group flex items-start gap-3 px-5 py-3 hover:bg-[#eb5297]/5 transition-colors cursor-pointer border-b border-[#eb5297]/15 last:border-0">
                            <PriorityDot priority={c.ai_priority ?? 'low'} pulse={c.ai_priority === 'high'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{c.title ?? caller ?? 'Phone call'}</p>
                              {caller && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{caller}</p>}
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(c.last_activity_at)}</span>
                            <button onClick={ev => handleDismiss('bot', c.id, ev)} title="Dismiss"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 transition-all shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      }),
                  previewRows: sortedCalls.slice(0, 2).map(c => {
                    const caller = c.ai_entities?.name ?? c.ai_entities?.phone ?? null
                    return (
                      <div key={c.id} onClick={() => setPopup({ kind: 'bot', id: c.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-[#eb5297]/5 transition-colors cursor-pointer border-b border-[#eb5297]/15 last:border-0">
                        <PriorityDot priority={c.ai_priority ?? 'low'} pulse={c.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{c.title ?? caller ?? 'Phone call'}</p>
                          {caller && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{caller}</p>}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(c.last_activity_at)}</span>
                      </div>
                    )
                  }),
                },
                {
                  key: 'bot',
                  label: 'Conversations',
                  icon: <MessageSquare className="w-3.5 h-3.5" />,
                  accentClass: 'text-purple-700 dark:text-purple-300',
                  borderClass: 'border-purple-300 dark:border-purple-500/30',
                  bgClass: 'bg-purple-200 dark:bg-purple-500/25',
                  headerBg: '#9a3bdd',
                  count: visBots.length,
                  rows: sortedBots.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No conversations this period.</p>
                    : sortedBots.map(b => (
                      <div key={b.id} onClick={() => setPopup({ kind: 'bot', id: b.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors cursor-pointer border-b border-purple-100 dark:border-purple-500/15 last:border-0">
                        <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{b.title ?? 'Untitled conversation'}</p>
                          <p className="text-[11px] text-purple-600/80 dark:text-purple-300/70">
                            {b.bot?.name && <span className="font-medium">{b.bot.name} · </span>}{b.message_count} msgs
                          </p>
                        </div>
                        <span className="text-[10px] text-purple-500/70 dark:text-purple-400/60 shrink-0">{timeAgo(b.last_activity_at)}</span>
                        <button onClick={ev => handleDismiss('bot', b.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                  previewRows: sortedBots.slice(0, 1).map(b => (
                    <div key={b.id} onClick={() => setPopup({ kind: 'bot', id: b.id })}
                      className="group flex items-start gap-3 px-5 py-3 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors cursor-pointer border-b border-purple-100 dark:border-purple-500/15 last:border-0">
                      <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{b.title ?? 'Untitled conversation'}</p>
                        <p className="text-[11px] text-purple-600/80 dark:text-purple-300/70">
                          {b.bot?.name && <span className="font-medium">{b.bot.name} · </span>}{b.message_count} msgs
                        </p>
                      </div>
                      <span className="text-[10px] text-purple-500/70 dark:text-purple-400/60 shrink-0">{timeAgo(b.last_activity_at)}</span>
                    </div>
                  )),
                },
                {
                  key: 'form',
                  label: 'Form Submissions',
                  icon: <FileText className="w-3.5 h-3.5" />,
                  accentClass: 'text-green-700 dark:text-green-300',
                  borderClass: 'border-green-300 dark:border-green-500/30',
                  bgClass: 'bg-green-200 dark:bg-green-500/25',
                  headerBg: '#16b425',
                  count: visForms.length,
                  rows: sortedForms.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No form submissions this period.</p>
                    : sortedForms.map(f => (
                      <div key={f.id} onClick={() => setPopup({ kind: 'form', id: f.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors cursor-pointer border-b border-green-100 dark:border-green-500/15 last:border-0">
                        <PriorityDot priority={f.lead_score ?? 'low'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {[f.email, f.phone, f.company].filter(Boolean).join(' · ') || f.source_platform}
                          </p>
                        </div>
                        <span className="text-[10px] text-green-500/70 dark:text-green-400/60 shrink-0">{timeAgo(f.created_at)}</span>
                        <button onClick={ev => handleDismiss('form', f.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-100 dark:hover:bg-green-500/20 text-green-400 hover:text-green-600 dark:hover:text-green-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                  previewRows: null,
                },
                {
                  key: 'ticket',
                  label: 'Tickets',
                  icon: <TicketIcon className="w-3.5 h-3.5" />,
                  accentClass: 'text-amber-700 dark:text-amber-400',
                  borderClass: 'border-amber-300 dark:border-amber-500/25',
                  bgClass: 'bg-amber-100 dark:bg-amber-500/15',
                  headerBg: '#ddb405',
                  count: visTickets.length,
                  rows: sortedTickets.length === 0
                    ? <p className="px-5 py-6 text-xs text-gray-400 text-center">No tickets this period.</p>
                    : sortedTickets.map(t => (
                      <div key={t.id} onClick={() => setPopup({ kind: 'ticket', id: t.id })}
                        className="group flex items-start gap-3 px-5 py-3 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer border-b border-amber-100 dark:border-amber-500/15 last:border-0">
                        <PriorityDot priority={t.priority} pulse={t.priority === 'high' || t.priority === 'urgent'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                          {t.contact && <p className="text-[11px] text-amber-600/80 dark:text-amber-300/70">{t.contact.name}</p>}
                        </div>
                        <span className="text-[10px] text-amber-500/70 dark:text-amber-400/60 shrink-0">{timeAgo(t.created_at)}</span>
                        <button onClick={ev => handleDismiss('ticket', t.id, ev)} title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-all shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )),
                  previewRows: null,
                },
              ]

              // Bring topType to front of the stack
              const ordered = topType
                ? [...allTablets.filter(t => t.key === topType), ...allTablets.filter(t => t.key !== topType)]
                : allTablets

              const activeTablet    = topType ? ordered.find(t => t.key === topType) : null
              const TAB_ORDER = ['email', 'sms', 'call', 'bot', 'form', 'ticket']
              const collapsedTablets = topType
                ? allTablets.filter(t => t.key !== topType).sort((a, b) => TAB_ORDER.indexOf(a.key) - TAB_ORDER.indexOf(b.key))
                : []

              const renderTabletHeader = (tablet: typeof ordered[number], isActive: boolean) => (
                <div
                  className="tablet-header px-4 py-2.5 flex items-center justify-between cursor-pointer shrink-0"
                  style={{ backgroundColor: tablet.headerBg }}
                  onClick={() => setTopType(isActive ? null : tablet.key)}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    {tablet.icon}
                    {tablet.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white">
                      {tablet.count}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/60 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              )

              return (
                <div className="flex flex-col gap-2 p-4 overflow-hidden flex-1 min-h-0">
                  {topType === null ? (
                    /* ── No selection: scrollable stacked preview ── */
                    <div className="overflow-y-auto flex flex-col gap-2 flex-1 min-h-0">
                      {ordered.map(tablet => (
                        <div key={tablet.key} className="shrink-0 rounded-xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
                          {renderTabletHeader(tablet, false)}
                          {tablet.previewRows && <div>{tablet.previewRows}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* ── Active tablet: fills all available space ── */}
                      {activeTablet && (
                        <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
                          {renderTabletHeader(activeTablet, true)}
                          <div className="flex-1 overflow-y-auto">{activeTablet.rows}</div>
                        </div>
                      )}
                      {/* ── Collapsed tablets: drawer file tabs ── */}
                      <div className="shrink-0" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', height: 52, overflow: 'visible' }}>
                        {collapsedTablets.map((tablet, i) => (
                          <button
                            key={tablet.key}
                            onClick={() => setTopType(tablet.key)}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.zIndex = '50' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.zIndex = String(i + 1) }}
                            style={{
                              position: 'relative',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              height: 38,
                              padding: '0 10px',
                              marginLeft: i === 0 ? 0 : -18,
                              borderRadius: '10px 10px 0 0',
                              flex: 1,
                              minWidth: 0,
                              zIndex: i + 1,
                              backgroundColor: tablet.headerBg,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none',
                              color: 'white',
                              overflow: 'hidden',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', width: 13, height: 13, flexShrink: 0 }}>{tablet.icon}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{tablet.label}</span>
                            <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                              {tablet.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })()
          )}
        </div>

        {/* Right: tasks & reminders */}
        <div className="xl:col-span-1 flex flex-col min-h-0 overflow-hidden">
          <UpcomingPanel workspaceId={workspaceId} userId={currentUserId ?? ''} />
        </div>
      </div>
    </div>
  )
}
