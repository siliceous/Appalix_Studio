'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCircle2, Calendar, Timer } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpcomingActivity {
  id:          string
  kind:        'activity'
  deal_id:     string | null
  ticket_id:   string | null
  parent_title: string
  type:        string
  title:       string | null
  body:        string | null
  due_at:      string
}

interface UpcomingReminder {
  id:         string
  kind:       'reminder'
  deal_id:    string
  parent_title: string
  title:      string
  note:       string | null
  due_at:     string
}

type UpcomingItem = UpcomingActivity | UpcomingReminder
type FilterTab = 'all' | 'pending' | 'upcoming' | 'reminders'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  call:     'Call',
  email:    'Email',
  meeting:  'Meeting',
  task:     'Task',
  demo:     'Demo',
  follow_up: 'Follow-up',
}

function formatDue(due: string): string {
  const d       = new Date(due)
  const now     = new Date()
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((itemDay.getTime() - today.getTime()) / 86_400_000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffDays < 0)  return `Overdue · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
  if (diffDays === 0) return `Today ${time}`
  if (diffDays === 1) return `Tomorrow ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
}

function isOverdue(due: string): boolean {
  const d       = new Date(due)
  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function isTodayOrFuture(due: string): boolean {
  return !isOverdue(due)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TABS: { key: FilterTab; label: string; Icon?: React.ElementType; iconColor?: string; color: string }[] = [
  { key: 'all',       label: 'All',  color: 'bg-blue-500' },
  { key: 'pending',   label: 'Pending',   Icon: Timer,    iconColor: '#9a3bdd', color: 'bg-[#9a3bdd]' },
  { key: 'upcoming',  label: 'Upcoming',  Icon: Calendar, iconColor: '#16b425', color: 'bg-[#16b425]' },
  { key: 'reminders', label: 'Reminders', Icon: Bell,     iconColor: '#f1c816', color: 'bg-[#f1c816]' },
]

export function UpcomingPanel({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const [items,   setItems]   = useState<UpcomingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<FilterTab>('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [dealActRes, ticketActRes, remRes] = await Promise.all([
        // Deal activities — all workspace, no user filter (matches mobile)
        supabase
          .from('sage_deal_activities')
          .select('id, deal_id, type, title, body, due_at, sage_deals(title)')
          .eq('workspace_id', workspaceId)
          .not('due_at', 'is', null)
          .is('completed_at', null)
          .order('due_at', { ascending: true })
          .limit(50),

        // Ticket activities — all workspace
        supabase
          .from('sage_ticket_activities')
          .select('id, ticket_id, type, title, body, due_at, sage_tickets(title)')
          .eq('workspace_id', workspaceId)
          .not('due_at', 'is', null)
          .is('completed_at', null)
          .order('due_at', { ascending: true })
          .limit(50),

        // Reminders — workspace-scoped, filter by user or NULL created_by
        supabase
          .from('sage_reminders')
          .select('id, deal_id, title, note, due_at, created_by, sage_deals(title)')
          .eq('workspace_id', workspaceId)
          .or(`created_by.eq.${userId},created_by.is.null`)
          .eq('is_sent', false)
          .order('due_at', { ascending: true })
          .limit(50),
      ])

      const dealActs: UpcomingActivity[] = ((dealActRes.data ?? []) as {
        id: string; deal_id: string; type: string; title: string | null;
        body: string | null; due_at: string; sage_deals: { title: string } | null
      }[]).map(a => ({
        id: a.id, kind: 'activity' as const,
        deal_id: a.deal_id, ticket_id: null,
        parent_title: a.sage_deals?.title ?? 'Deal',
        type: a.type, title: a.title, body: a.body, due_at: a.due_at,
      }))

      const ticketActs: UpcomingActivity[] = ((ticketActRes.data ?? []) as {
        id: string; ticket_id: string; type: string; title: string | null;
        body: string | null; due_at: string; sage_tickets: { title: string } | null
      }[]).map(a => ({
        id: a.id, kind: 'activity' as const,
        deal_id: null, ticket_id: a.ticket_id,
        parent_title: a.sage_tickets?.title ?? 'Ticket',
        type: a.type, title: a.title, body: a.body, due_at: a.due_at,
      }))

      const rems: UpcomingReminder[] = ((remRes.data ?? []) as {
        id: string; deal_id: string; title: string; note: string | null;
        due_at: string; sage_deals: { title: string } | null
      }[]).map(r => ({
        id: r.id, kind: 'reminder' as const,
        deal_id: r.deal_id, parent_title: r.sage_deals?.title ?? 'Deal',
        title: r.title, note: r.note, due_at: r.due_at,
      }))

      const all = [...dealActs, ...ticketActs, ...rems].sort(
        (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
      )

      setItems(all)
      setLoading(false)
    }
    load()
  }, [workspaceId, userId])

  const filtered = useMemo(() => {
    if (tab === 'all')       return items
    if (tab === 'pending')   return items.filter(i => i.kind === 'activity' && isOverdue(i.due_at))
    if (tab === 'upcoming')  return items.filter(i => i.kind === 'activity' && isTodayOrFuture(i.due_at))
    if (tab === 'reminders') return items.filter(i => i.kind === 'reminder')
    return items
  }, [items, tab])

  const totalCount = items.length

  return (
    <div className="bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 bg-[#141c2b] border-b border-white/10 rounded-t-2xl">
        <Calendar className="w-4 h-4 text-white shrink-0" />
        <h2 className="text-sm font-semibold text-white shrink-0">Tasks & Reminders</h2>
        {totalCount > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white shrink-0">
            {totalCount}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {TABS.map(t => {
            const isActive = tab === t.key
            if (t.Icon) {
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  title={t.label}
                  className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}
                >
                  <t.Icon
                    className="w-4 h-4"
                    style={{ color: isActive ? t.iconColor : 'rgba(255,255,255,0.4)' }}
                  />
                </button>
              )
            }
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-transparent text-white bg-blue-500'
                    : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-[#15A4AE]/30 border-t-[#15A4AE] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-5">
          <CheckCircle2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No {tab === 'all' ? 'tasks or reminders' : tab}</p>
        </div>
      ) : (
        <div className="divide-y dark:divide-white/6 overflow-y-auto flex-1">
          {filtered.map(item => {
            const label = item.kind === 'activity'
              ? (item.title ?? item.body ?? TYPE_LABELS[item.type] ?? item.type)
              : item.title
            const meta = item.kind === 'activity'
              ? (TYPE_LABELS[item.type] ?? item.type.charAt(0).toUpperCase() + item.type.slice(1))
              : 'Reminder'
            const overdue = isOverdue(item.due_at)
            const href = item.kind === 'activity' && item.ticket_id
              ? `/sage/tickets/${item.ticket_id}`
              : `/sage/pipelines?deal=${item.kind === 'activity' ? item.deal_id : item.deal_id}`

            return (
              <Link
                key={item.id}
                href={href}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {item.kind === 'reminder'
                    ? <Bell className={`w-4 h-4 ${overdue ? 'text-red-400' : 'text-purple-400'}`} />
                    : <CheckCircle2 className={`w-4 h-4 ${overdue ? 'text-red-400' : 'text-[#15A4AE]'}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {meta} · {item.parent_title}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                    {formatDue(item.due_at)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
