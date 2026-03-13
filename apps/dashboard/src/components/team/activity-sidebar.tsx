'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, X, Briefcase, Users,
  Ticket, Clock, CheckCircle2, Phone, Video,
} from 'lucide-react'
import type { ActivityEntry, ViewingAsInfo } from '@/app/actions/activity-feed'

const EVENT_LABELS: Record<string, string> = {
  contact_created:  'Created contact',
  contact_updated:  'Updated contact',
  contact_assigned: 'Assigned contact',
  deal_created:     'Created deal',
  stage_changed:    'Moved deal stage',
  status_changed:   'Updated status',
  deal_assigned:    'Assigned deal',
  ticket_created:   'Created ticket',
  note_added:       'Added a note',
  call_added:       'Logged a call',
  meeting_added:    'Logged a meeting',
  task_added:       'Added a task',
  email_sent:       'Sent an email',
  email_replied:    'Replied to email',
}

function formatEventLabel(eventType: string, entityName?: string | null): string {
  const base = EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ')
  return entityName ? `${base}: ${entityName}` : base
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

const ENTITY_ICON: Record<string, React.ElementType> = {
  contact: Users,
  deal:    Briefcase,
  ticket:  Ticket,
  task:    CheckCircle2,
}

const UPCOMING_ICON: Record<string, React.ElementType> = {
  task_scheduled:    CheckCircle2,
  meeting_scheduled: Video,
  call_scheduled:    Phone,
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const Icon = entry.is_upcoming
    ? (UPCOMING_ICON[entry.event_type] ?? CheckCircle2)
    : (ENTITY_ICON[entry.entity_type] ?? Briefcase)

  return (
    <div className="flex items-start gap-2.5 py-2 border-b dark:border-white/6 last:border-0">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        entry.is_upcoming
          ? 'bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
          : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
      }`}>
        <Icon className="w-2.5 h-2.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-snug">
          {formatEventLabel(entry.event_type, entry.entity_name)}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
          <Clock className="w-2 h-2 shrink-0" />
          {entry.is_upcoming ? `Due ${fmt12h(entry.created_at)}` : fmt12h(entry.created_at)}
        </p>
      </div>
      {entry.is_upcoming && (
        <span className="shrink-0 text-[9px] px-1 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-medium border border-brand-200 dark:border-brand-500/20 leading-tight">
          soon
        </span>
      )}
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
        className="w-8 flex-shrink-0 bg-gray-50 dark:bg-[#1c1c1c] flex flex-col items-center py-4 gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/4 transition-colors"
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
    <div className="w-64 flex-shrink-0 bg-gray-50 dark:bg-[#1c1c1c] flex flex-col overflow-hidden p-3">
      <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-[#242424] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)] border border-gray-200/70 dark:border-white/8">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b dark:border-white/8 shrink-0">
        {viewingAs ? (
          <>
            <div className="w-6 h-6 rounded-full bg-brand-500/20 dark:bg-brand-500/25 flex items-center justify-center text-[10px] font-bold text-brand-700 dark:text-brand-300 shrink-0">
              {viewingAs.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{viewingAs.name}</p>
              <p className="text-[10px] text-gray-400">{ROLE_LABELS[viewingAs.role] ?? viewingAs.role}</p>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-medium shrink-0">
              view only
            </span>
          </>
        ) : (
          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex-1">My Activity</span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {viewingAs && (
            <button
              onClick={stopViewing}
              title="Stop viewing"
              className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={toggleCollapsed}
            title="Collapse activity"
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/8 transition-colors"
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
