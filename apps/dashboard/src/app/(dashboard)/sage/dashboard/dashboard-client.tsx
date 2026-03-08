'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Mail, MessageSquare, FileText, Ticket as TicketIcon,
  Plus, Kanban, CheckSquare, Zap, RefreshCw, Calendar,
  ChevronDown,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
type DatePreset = 'today' | 'yesterday' | '7d' | '30d'

interface RawEmail {
  id: string
  from_name: string | null
  from_address: string
  subject: string
  received_at: string
  ai_priority: string | null
  ai_summary: string | null
}
interface RawBot {
  id: string
  title: string | null
  platform: string | null
  message_count: number
  last_activity_at: string
  ai_priority: string | null
  bot: { name: string } | null
}
interface RawLead {
  id: string
  name: string
  email: string | null
  company: string | null
  lead_score: string | null
  source_platform: string
  created_at: string
}
interface RawTicket {
  id: string
  title: string
  priority: string
  status: string
  created_at: string
  contact: { name: string } | null
}
interface RawTask {
  id: string
  title: string | null
  body: string | null
  due_at: string | null
  deal_id: string
  created_at: string
  deal: { title: string } | null
}

type TItem =
  | { kind: 'email';  data: RawEmail;  time: string }
  | { kind: 'bot';    data: RawBot;    time: string }
  | { kind: 'form';   data: RawLead;   time: string }
  | { kind: 'ticket'; data: RawTicket; time: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRange(preset: DatePreset): { from: string; to: string } {
  const now  = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  switch (preset) {
    case 'today':
      return { from: today.toISOString(), to: now.toISOString() }
    case 'yesterday': {
      const s = new Date(today); s.setDate(s.getDate() - 1)
      const e = new Date(today); e.setMilliseconds(-1)
      return { from: s.toISOString(), to: e.toISOString() }
    }
    case '7d': {
      const s = new Date(today); s.setDate(s.getDate() - 7)
      return { from: s.toISOString(), to: now.toISOString() }
    }
    case '30d': {
      const s = new Date(today); s.setDate(s.getDate() - 30)
      return { from: s.toISOString(), to: now.toISOString() }
    }
  }
}

// ── Recharts donut ────────────────────────────────────────────────────────────
interface DonutSegment { name: string; value: number; fill: string }

function DonutChart({
  segments,
  total,
  size = 130,
}: {
  segments: DonutSegment[]
  total: number
  size?: number
}) {
  const ir = Math.round(size * 0.3)
  const or = Math.round(size * 0.44)
  const isEmpty = total === 0
  const data: DonutSegment[] = isEmpty
    ? [{ name: 'empty', value: 1, fill: 'var(--donut-empty, #e5e7eb)' }]
    : segments.filter(s => s.value > 0)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={ir}
          outerRadius={or}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
          strokeWidth={0}
          isAnimationActive={!isEmpty}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        {!isEmpty && (
          <Tooltip
            formatter={(value: number, name: string) => [value, name]}
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.1)',
              padding: '4px 8px',
            }}
          />
        )}
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">
          {total}
        </span>
      </div>
    </div>
  )
}

// ── Priority dot ──────────────────────────────────────────────────────────────
function PriorityDot({ priority, pulse = false }: { priority: string; pulse?: boolean }) {
  const isHigh = priority === 'high' || priority === 'urgent'
  const color  = isHigh ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-400' : 'bg-green-500'
  if (pulse && isHigh) {
    return (
      <span className="relative flex h-2 w-2 shrink-0 mt-[5px]">
        <span className={`animate-ping absolute inset-0 rounded-full ${color} opacity-70`} />
        <span className={`relative rounded-full h-2 w-2 ${color}`} />
      </span>
    )
  }
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-[5px] ${color}`} />
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-label="Toggle Sage Auto"
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#61c2ad]' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function SageDashboardClient({
  workspaceId,
  greeting,
}: {
  workspaceId: string
  greeting: string
}) {
  const [dateRange, setDateRange]   = useState<DatePreset>('today')
  const [sageAuto, setSageAuto]     = useState(true)
  const [loading, setLoading]       = useState(true)
  const [emails,  setEmails]        = useState<RawEmail[]>([])
  const [bots,    setBots]          = useState<RawBot[]>([])
  const [forms,   setForms]         = useState<RawLead[]>([])
  const [tickets, setTickets]       = useState<RawTicket[]>([])
  const [tasks,   setTasks]         = useState<RawTask[]>([])

  // Persist Sage Auto in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sage-auto')
    if (stored !== null) setSageAuto(stored === 'true')
  }, [])

  const toggleSageAuto = () => {
    const next = !sageAuto
    setSageAuto(next)
    localStorage.setItem('sage-auto', String(next))
  }

  // ── Data fetch ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getRange(dateRange)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAny = supabase as any

    const [emailsRes, botsRes, formsRes, ticketsRes, tasksRes] = await Promise.all([
      // Emails: unread inbound, high + medium only
      supabase
        .from('sage_emails')
        .select('id, from_name, from_address, subject, received_at, ai_priority, ai_summary')
        .eq('workspace_id', workspaceId)
        .eq('direction', 'inbound')
        .eq('is_read', false)
        .eq('is_trashed', false)
        .in('ai_priority', ['high', 'medium'])
        .gte('received_at', from)
        .lte('received_at', to)
        .order('received_at', { ascending: false }),

      // Bot conversations: active, high + medium only
      supabase
        .from('conversations')
        .select('id, title, platform, message_count, last_activity_at, ai_priority, bot:bots(name)')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .in('ai_priority', ['high', 'medium'])
        .gte('last_activity_at', from)
        .lte('last_activity_at', to)
        .order('last_activity_at', { ascending: false }),

      // Form leads: all submissions in date range
      supabase
        .from('leads')
        .select('id, name, email, company, lead_score, source_platform, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false }),

      // Tickets: all created in date range
      supabase
        .from('sage_tickets')
        .select('id, title, priority, status, created_at, contact:sage_contacts(name)')
        .eq('workspace_id', workspaceId)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false }),

      // Pipeline tasks: all pending (no date filter — show all outstanding tasks)
      sbAny
        .from('sage_deal_activities')
        .select('id, title, body, due_at, deal_id, created_at, deal:sage_deals(title)')
        .eq('workspace_id', workspaceId)
        .eq('type', 'task')
        .is('completed_at', null)
        .order('due_at', { ascending: true })
        .limit(40),
    ])

    setEmails((emailsRes.data  ?? []) as RawEmail[])
    setBots((botsRes.data      ?? []) as RawBot[])
    setForms((formsRes.data    ?? []) as RawLead[])
    setTickets((ticketsRes.data ?? []) as RawTicket[])
    setTasks((tasksRes.data    ?? []) as RawTask[])
    setLoading(false)
  }, [dateRange, workspaceId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Donut data ────────────────────────────────────────────────────────────
  const emailSegments: DonutSegment[] = [
    { name: 'High',   value: emails.filter(e => e.ai_priority === 'high').length,   fill: '#ef4444' },
    { name: 'Medium', value: emails.filter(e => e.ai_priority === 'medium').length, fill: '#f59e0b' },
  ]
  const botSegments: DonutSegment[] = [
    { name: 'High',   value: bots.filter(b => b.ai_priority === 'high').length,   fill: '#ef4444' },
    { name: 'Medium', value: bots.filter(b => b.ai_priority === 'medium').length, fill: '#f59e0b' },
  ]
  const formSegments: DonutSegment[] = [
    { name: 'High',   value: forms.filter(f => f.lead_score === 'high').length,                         fill: '#ef4444' },
    { name: 'Medium', value: forms.filter(f => f.lead_score === 'medium').length,                       fill: '#f59e0b' },
    { name: 'Low',    value: forms.filter(f => f.lead_score === 'low' || !f.lead_score).length,          fill: '#22c55e' },
  ]
  const ticketSegments: DonutSegment[] = [
    { name: 'High',   value: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length, fill: '#ef4444' },
    { name: 'Medium', value: tickets.filter(t => t.priority === 'medium').length,                          fill: '#f59e0b' },
    { name: 'Low',    value: tickets.filter(t => t.priority === 'low').length,                             fill: '#22c55e' },
  ]

  // ── Merged timeline ───────────────────────────────────────────────────────
  const timeline = useMemo<TItem[]>(() => {
    const items: TItem[] = [
      ...emails.map(d  => ({ kind: 'email'  as const, data: d, time: d.received_at    })),
      ...bots.map(d    => ({ kind: 'bot'    as const, data: d, time: d.last_activity_at })),
      ...forms.map(d   => ({ kind: 'form'   as const, data: d, time: d.created_at      })),
      ...tickets.map(d => ({ kind: 'ticket' as const, data: d, time: d.created_at      })),
    ]
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [emails, bots, forms, tickets])

  const overdue = (due: string | null) => due && new Date(due) < new Date()

  const datePresets: { value: DatePreset; label: string }[] = [
    { value: 'today',     label: 'Today'       },
    { value: 'yesterday', label: 'Yesterday'   },
    { value: '7d',        label: 'Last 7 days' },
    { value: '30d',       label: 'Last 30 days'},
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-5 flex-wrap">
        {/* Left: greeting + nav */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{greeting}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
            Here&apos;s what needs your attention today
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sage/contacts"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#61c2ad] hover:bg-[#4fa898] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Contact
            </Link>
            <Link
              href="/sage/emails"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-green-500" /> Inbox
            </Link>
            <Link
              href="/conversations"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Bot Chats
            </Link>
            <Link
              href="/forms/leads"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-purple-500" /> Forms
            </Link>
            <Link
              href="/sage/pipelines"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <Kanban className="w-3.5 h-3.5 text-indigo-500" /> Pipelines
            </Link>
          </div>
        </div>

        {/* Right: date range + Sage Auto */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as DatePreset)}
              className="appearance-none bg-white dark:bg-[#232323] border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#61c2ad]/40 cursor-pointer"
            >
              {datePresets.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>

          {/* Sage Auto toggle */}
          <div className="flex items-center gap-2.5 bg-white dark:bg-[#232323] border dark:border-white/10 rounded-xl px-4 py-2">
            <Zap className={`w-3.5 h-3.5 ${sageAuto ? 'text-[#61c2ad]' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sage Auto</span>
            <Toggle checked={sageAuto} onChange={toggleSageAuto} />
            <span className={`text-xs font-bold ${sageAuto ? 'text-[#61c2ad]' : 'text-gray-400'}`}>
              {sageAuto ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Sage Auto info banner */}
      {sageAuto && (
        <div className="mb-5 flex items-center gap-2 text-xs text-[#4fa898] dark:text-[#61c2ad] bg-[#61c2ad]/8 border border-[#61c2ad]/20 rounded-xl px-4 py-2.5">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Sage Auto is ON</strong> — AI is collecting from all channels, summarising,
            and automatically creating contacts &amp; updating your pipeline.
          </span>
        </div>
      )}

      {/* ── 4 Donut cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Emails */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Emails</p>
              <p className="text-[10px] text-gray-400">high &amp; medium unread</p>
            </div>
            <Mail className="w-4 h-4 text-green-500" />
          </div>
          <DonutChart segments={emailSegments} total={emails.length} />
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-500 dark:text-gray-400">{emailSegments[0].value} high</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-gray-500 dark:text-gray-400">{emailSegments[1].value} med</span>
            </span>
          </div>
        </div>

        {/* Bot Chats */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Bot Chats</p>
              <p className="text-[10px] text-gray-400">high &amp; medium active</p>
            </div>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <DonutChart segments={botSegments} total={bots.length} />
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-500 dark:text-gray-400">{botSegments[0].value} high</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-gray-500 dark:text-gray-400">{botSegments[1].value} med</span>
            </span>
          </div>
        </div>

        {/* Forms */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Forms</p>
              <p className="text-[10px] text-gray-400">all submissions</p>
            </div>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <DonutChart segments={formSegments} total={forms.length} />
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            {formSegments.map(s => (
              <span key={s.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                <span className="text-gray-500 dark:text-gray-400">{s.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Tickets */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tickets</p>
              <p className="text-[10px] text-gray-400">all tickets</p>
            </div>
            <TicketIcon className="w-4 h-4 text-orange-500" />
          </div>
          <DonutChart segments={ticketSegments} total={tickets.length} />
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            {ticketSegments.map(s => (
              <span key={s.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                <span className="text-gray-500 dark:text-gray-400">{s.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2 : 1 layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left (2/3): unified activity timeline ──────────────────── */}
        <div className="xl:col-span-2 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity Feed</h2>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emails.length}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{bots.length}</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{forms.length}</span>
              <span className="flex items-center gap-1"><TicketIcon className="w-3 h-3" />{tickets.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <p className="text-sm text-gray-400">No activity for this period.</p>
              <p className="text-xs text-gray-400 mt-1">Try selecting a wider date range.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-white/8 overflow-y-auto max-h-[640px]">
              {timeline.map(item => {
                if (item.kind === 'email') {
                  const e = item.data
                  return (
                    <Link
                      key={`e-${e.id}`}
                      href="/sage/emails"
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                    >
                      <PriorityDot priority={e.ai_priority ?? 'low'} pulse={e.ai_priority === 'high'} />
                      <div className="w-5 h-5 rounded-md bg-green-100 dark:bg-green-500/15 flex items-center justify-center shrink-0">
                        <Mail className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {e.from_name ?? e.from_address}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{e.subject}</p>
                        {e.ai_summary && (
                          <p className="text-[10px] text-gray-400 italic truncate mt-0.5">{e.ai_summary}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(e.received_at)}</span>
                    </Link>
                  )
                }

                if (item.kind === 'bot') {
                  const b = item.data
                  return (
                    <Link
                      key={`b-${b.id}`}
                      href={`/conversations/${b.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                    >
                      <PriorityDot priority={b.ai_priority ?? 'low'} pulse={b.ai_priority === 'high'} />
                      <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {b.title ?? 'Untitled conversation'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {b.bot?.name && <span className="font-medium">{b.bot.name}</span>}
                          {b.bot?.name && ' · '}
                          {b.message_count} msgs
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(b.last_activity_at)}</span>
                    </Link>
                  )
                }

                if (item.kind === 'form') {
                  const f = item.data
                  return (
                    <Link
                      key={`f-${f.id}`}
                      href="/forms/leads"
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                    >
                      <PriorityDot priority={f.lead_score ?? 'low'} />
                      <div className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center shrink-0">
                        <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {f.company ?? f.email ?? f.source_platform}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(f.created_at)}</span>
                    </Link>
                  )
                }

                if (item.kind === 'ticket') {
                  const t = item.data
                  return (
                    <Link
                      key={`t-${t.id}`}
                      href="/sage/tickets"
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                    >
                      <PriorityDot
                        priority={t.priority}
                        pulse={t.priority === 'high' || t.priority === 'urgent'}
                      />
                      <div className="w-5 h-5 rounded-md bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                        <TicketIcon className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                        {t.contact && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">{t.contact.name}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(t.created_at)}</span>
                    </Link>
                  )
                }

                return null
              })}
            </div>
          )}
        </div>

        {/* ── Right (1/3): pending pipeline tasks ───────────────────── */}
        <div className="xl:col-span-1 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#61c2ad]" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pending Tasks</h2>
            </div>
            {tasks.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#61c2ad]/10 text-[#61c2ad]">
                {tasks.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <CheckSquare className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">All caught up!</p>
              <p className="text-xs text-gray-400 mt-0.5">No pending tasks in pipeline.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-white/8 overflow-y-auto max-h-[640px]">
              {tasks.map(task => (
                <Link
                  key={task.id}
                  href="/sage/pipelines"
                  className="block px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                >
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {task.title ?? 'Untitled task'}
                  </p>
                  {task.deal && (
                    <p className="text-[11px] text-[#61c2ad] truncate mt-0.5">{task.deal.title}</p>
                  )}
                  {task.body && (
                    <p className="text-[10px] text-gray-400 truncate italic mt-0.5">{task.body}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {task.due_at ? (
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${
                        overdue(task.due_at) ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {overdue(task.due_at) && ' · overdue'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">No due date</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
