import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Users, Kanban, Ticket, Mail, Plus, MessageSquare,
  TrendingUp, Activity, ChevronRight,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'
import type {
  WorkspaceMember, SageDeal, SageActivityLog, SageEmail,
  SageTicket, Conversation, Lead,
} from '@/lib/types'

export const metadata: Metadata = { title: 'Sage Dashboard' }

// ── SVG Donut Ring ────────────────────────────────────────────────────────────
function DonutRing({
  segments,
  size = 72,
}: {
  segments: { value: number; color: string }[]
  size?: number
}) {
  const r = 30
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  if (total === 0) {
    return (
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="#e5e7eb" strokeWidth={11}
          className="dark:stroke-white/10" />
      </svg>
    )
  }

  let cumulativeOffset = 0
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {segments.map((seg, i) => {
        if (seg.value === 0) return null
        const dash = (seg.value / total) * circumference
        const dashOffset = circumference - cumulativeOffset
        cumulativeOffset += dash
        return (
          <circle
            key={i}
            cx={40} cy={40} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={11}
            strokeDasharray={`${dash} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
          />
        )
      })}
    </svg>
  )
}

// ── Animated pulse dot ────────────────────────────────────────────────────────
function PulseDot({ level }: { level: 'high' | 'medium' }) {
  const color = level === 'high' ? 'bg-red-500' : 'bg-amber-400'
  return (
    <span className="relative flex h-2 w-2 shrink-0 mt-[5px]">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-70`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  )
}

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: string | null }) {
  if (!score) return null
  const cls =
    score === 'high'
      ? 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'
      : score === 'medium'
      ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
      : 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${cls}`}>
      {score}
    </span>
  )
}

export default async function SageDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // Time-of-day greeting (UTC-based)
  const hour = new Date().getUTCHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // ── Parallel data fetches ─────────────────────────────────────────────────
  const [
    { count: totalContacts },
    { count: openDealsCount },
    { count: unreadEmailsCount },
    { count: openTicketsCount },
    { data: priorityEmailsRaw },
    { data: priorityTicketsRaw },
    { data: activeConversationsRaw },
    { data: recentLeadsRaw },
    { data: recentDealsRaw },
    { data: recentActivityRaw },
  ] = await Promise.all([
    supabase
      .from('sage_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('sage_deals')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'open'),
    supabase
      .from('sage_emails')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('direction', 'inbound')
      .eq('is_read', false)
      .eq('is_trashed', false),
    supabase
      .from('sage_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ['open', 'pending']),
    // Unread inbound emails with priority
    supabase
      .from('sage_emails')
      .select('id, subject, from_name, from_address, received_at, ai_priority, ai_summary')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'inbound')
      .eq('is_read', false)
      .eq('is_trashed', false)
      .order('received_at', { ascending: false })
      .limit(24),
    // Open/pending tickets with priority
    supabase
      .from('sage_tickets')
      .select('id, title, priority, status, created_at, contact:sage_contacts(name)')
      .eq('workspace_id', workspaceId)
      .in('status', ['open', 'pending'])
      .order('created_at', { ascending: false })
      .limit(24),
    // Active bot conversations
    supabase
      .from('conversations')
      .select('id, title, platform, message_count, last_activity_at, ai_priority, ai_summary')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false })
      .limit(20),
    // Recent form leads
    supabase
      .from('leads')
      .select('id, name, email, company, lead_score, source_platform, campaign_name, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
    // Recent open deals with stage
    supabase
      .from('sage_deals')
      .select('id, title, value, currency, status, created_at, stage:sage_pipeline_stages(name, color)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(6),
    // Recent activity
    supabase
      .from('sage_activity_log')
      .select('id, entity_type, event_type, payload, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // ── Type casts ────────────────────────────────────────────────────────────
  type PriorityEmail = Pick<SageEmail, 'id' | 'subject' | 'from_name' | 'from_address' | 'received_at' | 'ai_priority' | 'ai_summary'>
  type PriorityTicket = Pick<SageTicket, 'id' | 'title' | 'priority' | 'status' | 'created_at'> & { contact: { name: string } | null }
  type ActiveConv = Pick<Conversation, 'id' | 'title' | 'platform' | 'message_count' | 'last_activity_at' | 'ai_priority' | 'ai_summary'>
  type RecentLead = Pick<Lead, 'id' | 'name' | 'email' | 'company' | 'lead_score' | 'source_platform' | 'campaign_name' | 'created_at'>

  const priorityEmails      = (priorityEmailsRaw      ?? []) as PriorityEmail[]
  const priorityTickets     = (priorityTicketsRaw     ?? []) as PriorityTicket[]
  const activeConversations = (activeConversationsRaw ?? []) as ActiveConv[]
  const recentLeads         = (recentLeadsRaw         ?? []) as RecentLead[]
  const recentDeals         = (recentDealsRaw         ?? []) as (SageDeal & { stage: { name: string; color: string } | null })[]
  const recentActivity      = (recentActivityRaw      ?? []) as SageActivityLog[]

  // ── Priority bucketing ────────────────────────────────────────────────────
  const emailCounts = {
    high:   priorityEmails.filter(e => e.ai_priority === 'high').length,
    medium: priorityEmails.filter(e => e.ai_priority === 'medium').length,
    low:    priorityEmails.filter(e => e.ai_priority === 'low' || e.ai_priority === null).length,
  }
  const ticketCounts = {
    high:   priorityTickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    medium: priorityTickets.filter(t => t.priority === 'medium').length,
    low:    priorityTickets.filter(t => t.priority === 'low').length,
  }
  const convCounts = {
    high:   activeConversations.filter(c => c.ai_priority === 'high').length,
    medium: activeConversations.filter(c => c.ai_priority === 'medium').length,
    low:    activeConversations.filter(c => c.ai_priority === 'low' || c.ai_priority === null).length,
  }
  const leadCounts = {
    high:   recentLeads.filter(l => l.lead_score === 'high').length,
    medium: recentLeads.filter(l => l.lead_score === 'medium').length,
    low:    recentLeads.filter(l => l.lead_score === 'low' || l.lead_score === null).length,
  }

  function donutSegs(c: { high: number; medium: number; low: number }) {
    return [
      { value: c.high,   color: '#ef4444' },
      { value: c.medium, color: '#f59e0b' },
      { value: c.low,    color: '#22c55e' },
    ]
  }

  // ── Attention items ───────────────────────────────────────────────────────
  const highEmails  = priorityEmails.filter(e => e.ai_priority === 'high').slice(0, 4)
  const medEmails   = priorityEmails.filter(e => e.ai_priority === 'medium').slice(0, 4)
  const highTickets = priorityTickets.filter(t => t.priority === 'high' || t.priority === 'urgent').slice(0, 4)
  const medTickets  = priorityTickets.filter(t => t.priority === 'medium').slice(0, 4)

  const hasHighItems = highEmails.length > 0 || highTickets.length > 0
  const hasMedItems  = medEmails.length > 0  || medTickets.length > 0

  function formatCurrency(value: number | null, currency: string) {
    if (!value) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  }

  function eventLabel(eventType: string) {
    const map: Record<string, string> = {
      contact_created: 'New contact',
      contact_updated: 'Contact updated',
      deal_created:    'New deal',
      stage_changed:   'Stage changed',
      status_changed:  'Status updated',
      ticket_created:  'New ticket',
      note_added:      'Note added',
    }
    return map[eventType] ?? eventType.replace(/_/g, ' ')
  }

  const channelCards = [
    {
      label: 'Emails',
      href: '/sage/emails',
      total: unreadEmailsCount ?? 0,
      sublabel: 'unread',
      counts: emailCounts,
      segments: donutSegs(emailCounts),
    },
    {
      label: 'Tickets',
      href: '/sage/tickets',
      total: openTicketsCount ?? 0,
      sublabel: 'open',
      counts: ticketCounts,
      segments: donutSegs(ticketCounts),
    },
    {
      label: 'Bot Chats',
      href: '/conversations',
      total: activeConversations.length,
      sublabel: 'active',
      counts: convCounts,
      segments: donutSegs(convCounts),
    },
    {
      label: 'Form Leads',
      href: '/forms/leads',
      total: recentLeads.length,
      sublabel: 'recent',
      counts: leadCounts,
      segments: donutSegs(leadCounts),
    },
  ]

  return (
    <div className="p-8">

      {/* ── Header banner with dot-grid + quick actions ─────────────────── */}
      <div className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50/80 dark:from-[#232323] dark:to-[#1f1f1f] border dark:border-white/8 p-6">
        {/* Dot-grid decoration */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #61c2ad 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            opacity: 0.04,
          }}
        />
        {/* Subtle corner glow */}
        <div className="pointer-events-none absolute top-0 right-0 w-64 h-40 dark:bg-[#61c2ad]/5 blur-3xl rounded-full" />

        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{greeting} 👋</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Here&apos;s what needs your attention today
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-white/5 rounded-lg px-3 py-1.5 border dark:border-white/8">
              <Users className="w-3.5 h-3.5" />
              <span>{totalContacts ?? 0} contacts</span>
            </div>
          </div>

          {/* Quick-action buttons with live count badges */}
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/sage/contacts"
              className="flex items-center gap-2 px-4 py-2 bg-[#61c2ad] hover:bg-[#4fa898] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </Link>

            <Link
              href="/sage/pipelines"
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <Kanban className="w-3.5 h-3.5 text-purple-500" />
              Pipelines
              {(openDealsCount ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                  {openDealsCount}
                </span>
              )}
            </Link>

            <Link
              href="/sage/tickets"
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <Ticket className="w-3.5 h-3.5 text-orange-500" />
              Tickets
              {(openTicketsCount ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                  {openTicketsCount}
                </span>
              )}
            </Link>

            <Link
              href="/sage/emails"
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-green-500" />
              Inbox
              {(unreadEmailsCount ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold">
                  {unreadEmailsCount}
                </span>
              )}
            </Link>

            <Link
              href="/conversations"
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/8 hover:bg-gray-50 dark:hover:bg-white/12 border dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              Bot Chats
              {activeConversations.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                  {activeConversations.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Channel health donut cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {channelCards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 hover:shadow-md dark:hover:border-white/16 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                  {card.total}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{card.sublabel}</p>
              </div>
              <div className="shrink-0">
                <DonutRing segments={card.segments} size={68} />
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">{card.counts.high}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">{card.counts.medium}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">{card.counts.low}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Needs Attention swim lanes ───────────────────────────────────── */}
      {(hasHighItems || hasMedItems) && (
        <div className="mb-6 space-y-4">
          {/* High priority */}
          {hasHighItems && (
            <div className="bg-white dark:bg-[#232323] rounded-xl border border-red-200/70 dark:border-red-500/20 overflow-hidden">
              <div className="px-5 py-3 border-b border-red-100 dark:border-red-500/15 flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Needs Attention</h2>
                <span className="text-xs font-medium text-red-500 dark:text-red-400">· high priority</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x dark:divide-white/8">
                {/* High-priority emails */}
                <div>
                  {highEmails.length === 0 ? (
                    <p className="px-5 py-5 text-xs text-gray-400">No high-priority emails</p>
                  ) : (
                    <div className="divide-y dark:divide-white/8">
                      {highEmails.map(email => (
                        <Link
                          key={email.id}
                          href="/sage/emails"
                          className="flex items-start gap-3 px-5 py-3 hover:bg-red-50/40 dark:hover:bg-red-500/5 transition-colors"
                        >
                          <PulseDot level="high" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {email.from_name ?? email.from_address}
                              </p>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{email.subject}</p>
                            {email.ai_summary && (
                              <p className="text-[10px] text-gray-400 truncate mt-0.5 italic">{email.ai_summary}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(email.received_at)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {/* High-priority tickets */}
                <div>
                  {highTickets.length === 0 ? (
                    <p className="px-5 py-5 text-xs text-gray-400">No high-priority tickets</p>
                  ) : (
                    <div className="divide-y dark:divide-white/8">
                      {highTickets.map(ticket => (
                        <Link
                          key={ticket.id}
                          href="/sage/tickets"
                          className="flex items-start gap-3 px-5 py-3 hover:bg-red-50/40 dark:hover:bg-red-500/5 transition-colors"
                        >
                          <PulseDot level="high" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Ticket className="w-3 h-3 text-gray-400 shrink-0" />
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{ticket.title}</p>
                            </div>
                            {ticket.contact && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{ticket.contact.name}</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                            ticket.priority === 'urgent'
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                              : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'
                          }`}>
                            {ticket.priority}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Medium priority */}
          {hasMedItems && (
            <div className="bg-white dark:bg-[#232323] rounded-xl border border-amber-200/60 dark:border-amber-500/20 overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100/80 dark:border-amber-500/15 flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Follow Up</h2>
                <span className="text-xs font-medium text-amber-500 dark:text-amber-400">· medium priority</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x dark:divide-white/8">
                <div>
                  {medEmails.length === 0 ? (
                    <p className="px-5 py-5 text-xs text-gray-400">No medium-priority emails</p>
                  ) : (
                    <div className="divide-y dark:divide-white/8">
                      {medEmails.map(email => (
                        <Link
                          key={email.id}
                          href="/sage/emails"
                          className="flex items-start gap-3 px-5 py-3 hover:bg-amber-50/40 dark:hover:bg-amber-500/5 transition-colors"
                        >
                          <PulseDot level="medium" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                {email.from_name ?? email.from_address}
                              </p>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{email.subject}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(email.received_at)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  {medTickets.length === 0 ? (
                    <p className="px-5 py-5 text-xs text-gray-400">No medium-priority tickets</p>
                  ) : (
                    <div className="divide-y dark:divide-white/8">
                      {medTickets.map(ticket => (
                        <Link
                          key={ticket.id}
                          href="/sage/tickets"
                          className="flex items-start gap-3 px-5 py-3 hover:bg-amber-50/40 dark:hover:bg-amber-500/5 transition-colors"
                        >
                          <PulseDot level="medium" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Ticket className="w-3 h-3 text-gray-400 shrink-0" />
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{ticket.title}</p>
                            </div>
                            {ticket.contact && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{ticket.contact.name}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                            medium
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom 3-column grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        {/* Recent open deals */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Kanban className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Open Deals</h2>
              {(openDealsCount ?? 0) > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400">
                  {openDealsCount}
                </span>
              )}
            </div>
            <Link href="/sage/pipelines" className="text-xs text-[#61c2ad] hover:underline flex items-center gap-0.5">
              Pipelines <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y dark:divide-white/8">
            {recentDeals.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-gray-400">No open deals.</p>
                <Link href="/sage/pipelines" className="text-xs text-[#61c2ad] hover:underline mt-1 block">
                  Create your first deal →
                </Link>
              </div>
            ) : recentDeals.map(deal => (
              <div key={deal.id} className="flex items-center gap-3 px-5 py-3">
                {deal.stage ? (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: deal.stage.color }} />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/15 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{deal.title}</p>
                  <p className="text-[11px] text-gray-400">{deal.stage?.name ?? 'No stage'} · {timeAgo(deal.created_at)}</p>
                </div>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                  {formatCurrency(deal.value, deal.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Open bot conversations */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bot Chats</h2>
              {activeConversations.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  {activeConversations.length} open
                </span>
              )}
            </div>
            <Link href="/conversations" className="text-xs text-[#61c2ad] hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y dark:divide-white/8">
            {activeConversations.length === 0 ? (
              <p className="px-5 py-8 text-xs text-gray-400 text-center">No active conversations.</p>
            ) : activeConversations.slice(0, 7).map(conv => (
              <Link
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
              >
                {conv.ai_priority === 'high' ? (
                  <PulseDot level="high" />
                ) : conv.ai_priority === 'medium' ? (
                  <PulseDot level="medium" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-blue-300 dark:bg-blue-500/40 shrink-0 mt-[5px]" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {conv.title ?? 'Untitled conversation'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {conv.message_count} msgs · {timeAgo(conv.last_activity_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent form leads */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#61c2ad]" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Form Leads</h2>
            </div>
            <Link href="/forms/leads" className="text-xs text-[#61c2ad] hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y dark:divide-white/8">
            {recentLeads.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-gray-400">No leads yet.</p>
                <Link href="/sage/integrations" className="text-xs text-[#61c2ad] hover:underline mt-1 block">
                  Connect a source →
                </Link>
              </div>
            ) : recentLeads.slice(0, 7).map(lead => (
              <div key={lead.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  lead.lead_score === 'high'   ? 'bg-red-500' :
                  lead.lead_score === 'medium' ? 'bg-amber-400' : 'bg-green-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{lead.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {lead.company ?? lead.email ?? lead.source_platform} · {timeAgo(lead.created_at)}
                  </p>
                </div>
                <ScoreBadge score={lead.lead_score} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Activity timeline ─────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity Timeline</h2>
          </div>
          <div className="px-5 py-5 overflow-x-auto">
            <div className="flex items-start min-w-max gap-0">
              {recentActivity.map((a, idx) => (
                <div key={a.id} className="flex items-start">
                  <div className="flex flex-col items-center w-32">
                    <div className="w-3 h-3 rounded-full bg-[#61c2ad] border-[2.5px] border-white dark:border-[#232323] shrink-0 z-10" />
                    <div className="mt-2 text-center px-1">
                      <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-tight">
                        {eventLabel(a.event_type)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                  {idx < recentActivity.length - 1 && (
                    <div className="w-6 h-[2px] bg-gray-200 dark:bg-white/10 mt-[5px] shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
