'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Bell, CheckCircle2, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpcomingActivity {
  id:          string
  kind:        'activity'
  deal_id:     string
  deal_title:  string
  type:        string
  title:       string | null
  body:        string | null
  due_at:      string
  completed_at: string | null
}

interface UpcomingReminder {
  id:         string
  kind:       'reminder'
  deal_id:    string
  deal_title: string
  title:      string
  note:       string | null
  due_at:     string
}

type UpcomingItem = UpcomingActivity | UpcomingReminder

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDue(due: string): string {
  const d    = new Date(due)
  const now  = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((itemDay.getTime() - today.getTime()) / 86_400_000)

  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 0)  return `Overdue · ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`
  if (diffDays === 0) return `Today ${time}`
  if (diffDays === 1) return `Tomorrow ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`
}

type Group = 'overdue' | 'today' | 'upcoming'

function getGroup(due: string): Group {
  const now = new Date()
  const d   = new Date(due)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((itemDay.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0)  return 'overdue'
  if (diffDays === 0) return 'today'
  return 'upcoming'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpcomingPanel({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const [items,    setItems]    = useState<UpcomingItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<Record<Group, boolean>>({ overdue: true, today: true, upcoming: false })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const now      = new Date().toISOString()

      // Fetch scheduled activities owned by this user (due_at IS NOT NULL, not completed)
      const { data: acts } = await supabase
        .from('sage_deal_activities')
        .select('id, deal_id, type, title, body, due_at, completed_at, workspace_id, created_by, sage_deals(title)')
        .eq('workspace_id', workspaceId)
        .eq('created_by', userId)
        .not('due_at', 'is', null)
        .is('completed_at', null)
        .order('due_at', { ascending: true })
        .limit(100)

      // Fetch reminders (not sent yet)
      const { data: rems } = await supabase
        .from('sage_reminders')
        .select('id, deal_id, title, note, due_at, workspace_id, sage_deals(title)')
        .eq('workspace_id', workspaceId)
        .eq('created_by', userId)
        .eq('is_sent', false)
        .order('due_at', { ascending: true })
        .limit(100)

      const actItems: UpcomingActivity[] = (acts ?? [])
        .filter((a: { due_at: string }) => a.due_at)
        .map((a: {
          id: string; deal_id: string; type: string; title: string | null; body: string | null;
          due_at: string; completed_at: string | null;
          sage_deals: { title: string } | null
        }) => ({
          id: a.id, kind: 'activity' as const,
          deal_id: a.deal_id, deal_title: a.sage_deals?.title ?? 'Deal',
          type: a.type, title: a.title, body: a.body,
          due_at: a.due_at, completed_at: a.completed_at,
        }))

      const remItems: UpcomingReminder[] = (rems ?? [])
        .map((r: {
          id: string; deal_id: string; title: string; note: string | null;
          due_at: string; sage_deals: { title: string } | null
        }) => ({
          id: r.id, kind: 'reminder' as const,
          deal_id: r.deal_id, deal_title: r.sage_deals?.title ?? 'Deal',
          title: r.title, note: r.note, due_at: r.due_at,
        }))

      const all = [...actItems, ...remItems].sort((a, b) => {
        // Sort: overdue first (oldest first), then today, then future
        const ga = getGroup(a.due_at), gb = getGroup(b.due_at)
        const order: Record<Group, number> = { overdue: 0, today: 1, upcoming: 2 }
        if (order[ga] !== order[gb]) return order[ga] - order[gb]
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
      })

      setItems(all)
      setLoading(false)
    }
    load()
  }, [workspaceId, userId])

  const groups = useMemo(() => ({
    overdue:  items.filter(i => getGroup(i.due_at) === 'overdue'),
    today:    items.filter(i => getGroup(i.due_at) === 'today'),
    upcoming: items.filter(i => getGroup(i.due_at) === 'upcoming'),
  }), [items])

  const totalCount = items.length
  if (!loading && totalCount === 0) return null

  return (
    <div className="bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b dark:border-white/8">
        <Calendar className="w-4 h-4 text-[#15A4AE]" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Upcoming</h2>
        {totalCount > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
            {totalCount}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-[#15A4AE]/30 border-t-[#15A4AE] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="divide-y dark:divide-white/8">
          {(['overdue', 'today', 'upcoming'] as Group[]).map(group => {
            const groupItems = groups[group]
            if (groupItems.length === 0) return null
            const isOpen = expanded[group]
            const label  = group === 'overdue' ? 'Overdue' : group === 'today' ? 'Today' : 'Upcoming'
            const labelColor = group === 'overdue'
              ? 'text-red-500 dark:text-red-400'
              : group === 'today'
                ? 'text-[#15A4AE]'
                : 'text-gray-500 dark:text-gray-400'

            return (
              <div key={group}>
                {/* Group header */}
                <button
                  onClick={() => setExpanded(e => ({ ...e, [group]: !e[group] }))}
                  className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors"
                >
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${labelColor}`}>{label}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">{groupItems.length}</span>
                  <span className="ml-auto text-gray-400 dark:text-gray-500">
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {/* Items */}
                {isOpen && groupItems.map(item => {
                  const label = item.kind === 'activity'
                    ? (item.title ?? item.body ?? item.type)
                    : item.title
                  const meta = item.kind === 'activity'
                    ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
                    : 'Reminder'
                  const isOverdue = getGroup(item.due_at) === 'overdue'

                  return (
                    <Link
                      key={item.id}
                      href={`/sage/pipelines?deal=${item.deal_id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.kind === 'activity'
                          ? <CheckCircle2 className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-[#15A4AE]'}`} />
                          : <Bell className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-amber-500'}`} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{label}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                          {meta} · {item.deal_title}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatDue(item.due_at)}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
