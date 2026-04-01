'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, X } from 'lucide-react'
import type { ActivityEntry, ViewingAsInfo } from '@/app/actions/activity-feed'

// ── Source bubble ─────────────────────────────────────────────────────────────
const SOURCE_FROM_ENTITY: Record<string, string> = {
  email:        'email',
  conversation: 'bot',
  lead:         'forms',
  ticket:       'ticket',
  contact:      'manual',
  deal:         'manual',
  task:         'manual',
}

const SOURCE_COLORS: Record<string, string> = {
  email:  'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
  bot:    'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300',
  forms:  'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300',
  ticket: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  manual: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400',
}

function getSource(entry: ActivityEntry): string {
  if (entry.source) return entry.source
  return SOURCE_FROM_ENTITY[entry.entity_type] ?? 'manual'
}

// ── Human-readable message ─────────────────────────────────────────────────
function renderMessage(entry: ActivityEntry): string {
  const n = entry.entity_name ? `'${entry.entity_name}'` : null
  switch (entry.event_type) {
    case 'email_replied':
      return n ? `Replied to ${n}` : 'Replied to email'
    case 'email_sent':
      return n ? `Sent email to ${n}` : 'Sent an email'
    case 'deal_created':
      return n ? `Deal created for ${n}` : 'Created deal'
    case 'deal_assigned': {
      const to = entry.assignee_name ? ` to ${entry.assignee_name}` : ''
      return n ? `Assigned ${n}${to}` : `Assigned deal${to}`
    }
    case 'stage_changed': {
      const arrow = entry.stage_from && entry.stage_to ? ` · ${entry.stage_from} → ${entry.stage_to}` : ''
      return n ? `Moved ${n}${arrow}` : `Moved deal${arrow}`
    }
    case 'status_changed': {
      const arrow = entry.status_from && entry.status_to ? ` · ${entry.status_from} → ${entry.status_to}` : ''
      return n ? `Status for ${n}${arrow}` : `Status changed${arrow}`
    }
    case 'priority_changed': {
      const arrow = entry.priority_from && entry.priority_to
        ? ` · ${entry.priority_from} → ${entry.priority_to}`
        : entry.priority_to ? ` → ${entry.priority_to}` : ''
      return n ? `Priority for ${n}${arrow}` : `Priority changed${arrow}`
    }
    case 'contact_created':       return n ? `Contact created: ${n}` : 'Created contact'
    case 'contact_updated':       return n ? `Updated contact ${n}` : 'Updated contact'
    case 'contact_assigned':      return n ? `Assigned contact ${n}` : 'Assigned contact'
    case 'contact_deleted':       return n ? `Deleted contact ${n}` : 'Deleted contact'
    case 'ticket_created':        return n ? `Ticket created: ${n}` : 'Created ticket'
    case 'ticket_deleted':        return n ? `Deleted ticket ${n}` : 'Deleted ticket'
    case 'deal_deleted':          return n ? `Deleted deal ${n}` : 'Deleted deal'
    case 'email_deleted':         return n ? `Deleted email from ${n}` : 'Deleted email'
    case 'lead_deleted':          return n ? `Deleted form submission ${n}` : 'Deleted form submission'
    case 'conversation_deleted':  return n ? `Deleted bot conversation ${n}` : 'Deleted bot conversation'
    case 'note_added':            return n ? `Note added on ${n}` : 'Added a note'
    case 'call_added':            return n ? `Logged call with ${n}` : 'Logged a call'
    case 'meeting_added':         return n ? `Logged meeting with ${n}` : 'Logged a meeting'
    case 'task_added':            return n ? `Task added: ${n}` : 'Added a task'
    case 'conversation_renamed':  return n ? `Renamed conversation to ${n}` : 'Renamed conversation'
    case 'conversation_assigned': return n ? `Assigned conversation ${n}` : 'Assigned conversation'
    case 'lead_assigned': {
      const to = entry.assignee_name ? ` to ${entry.assignee_name}` : ''
      return n ? `Assigned form ${n}${to}` : `Assigned form${to}`
    }
    case 'lead_moved':            return n ? `Moved lead ${n} to pipeline` : 'Moved lead to pipeline'
    default: {
      const label = entry.event_type.replace(/_/g, ' ')
      return n ? `${label}: ${n}` : label
    }
  }
}

const STORAGE_KEY = 'activity_sidebar_collapsed'

function fmt12h(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const day = new Date(d); day.setHours(0,0,0,0)
  if (day.getTime() === today.getTime()) return 'Today'
  if (day.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', manager: 'Manager',
  employee: 'Employee', member: 'Member', viewer: 'Viewer',
}


function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const source = entry.is_upcoming ? null : getSource(entry)
  const sourceCls = source ? (SOURCE_COLORS[source] ?? SOURCE_COLORS.manual) : ''

  return (
    <div className="flex items-start gap-2 py-2 border-b dark:border-white/6 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {source && (
            <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${sourceCls}`}>
              {source}
            </span>
          )}
          {entry.is_upcoming && (
            <span className="shrink-0 text-[9px] px-1 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-medium border border-brand-200 dark:border-brand-500/20 leading-tight">
              soon
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-snug mt-0.5">
          {entry.is_upcoming
            ? (entry.entity_name ?? entry.event_type.replace(/_/g, ' '))
            : renderMessage(entry)}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
        {entry.is_upcoming ? `Due ${fmt12h(entry.created_at)}` : fmt12h(entry.created_at)}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  activity:    ActivityEntry[]
  date:        string          // YYYY-MM-DD
  currentPath: string
  viewingAs?:  ViewingAsInfo | null
}

export function ActivitySidebar({ activity, date, currentPath, viewingAs }: Props) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setCollapsed(true)
    } catch { /* ignore */ }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }

  const stopViewing = () => router.push(currentPath)

  const upcoming = activity.filter(a => a.is_upcoming)
  const past     = activity.filter(a => !a.is_upcoming)

  // ── Collapsed: thin strip ──────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div
        className="w-8 flex-shrink-0 bg-[#f5f4f1] dark:bg-[#1c1c1c] flex flex-col items-center py-4 gap-3 cursor-pointer hover:bg-[#ede9e2] dark:hover:bg-white/4 transition-colors"
        onClick={toggleCollapsed}
        title="Show activity"
      >
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span
          className="text-[10px] text-gray-400 font-medium select-none"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.05em' }}
        >
          Activity
        </span>
      </div>
    )
  }

  // ── Expanded ───────────────────────────────────────────────────────────────
  return (
    <div className="w-64 flex-shrink-0 bg-[#f5f4f1] dark:bg-[#1c1c1c] flex flex-col overflow-hidden p-3 pr-4">
      <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-[#242424] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)] border border-gray-200/70 dark:border-white/8">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0">
        {viewingAs ? (
          <>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {viewingAs.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white truncate leading-tight">{viewingAs.name}</p>
              <p className="text-[10px] text-white/50">{ROLE_LABELS[viewingAs.role] ?? viewingAs.role}</p>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/20 font-medium shrink-0">
              view only
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold text-white flex-1">My Activity</span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {viewingAs && (
            <button
              onClick={stopViewing}
              title="Stop viewing"
              className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={toggleCollapsed}
            title="Collapse activity"
            className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Date label row */}
      {upcoming.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b dark:border-white/8 shrink-0">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-1 truncate">{fmtDate(date + 'T12:00:00')}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 font-medium shrink-0">
            {upcoming.length} upcoming
          </span>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {activity.length === 0 ? (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-8">No activity for this day</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-2 pb-1">Upcoming</p>
                {upcoming.map(e => <ActivityItem key={e.id} entry={e} />)}
              </div>
            )}
            {past.length > 0 && (
              <div>
                {upcoming.length > 0 && (
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-3 pb-1">Past</p>
                )}
                {past.map(e => <ActivityItem key={e.id} entry={e} />)}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}
