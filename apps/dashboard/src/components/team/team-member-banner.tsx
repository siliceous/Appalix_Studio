'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronUp, ChevronDown, X, Briefcase, Users,
  Ticket, Calendar, Clock, CheckCircle2, Phone, Video,
} from 'lucide-react'
import type { ActivityEntry, ViewingAsInfo } from '@/app/actions/activity-feed'

const EVENT_LABELS: Record<string, string> = {
  contact_created:       'Created contact',
  contact_updated:       'Updated contact',
  contact_assigned:      'Assigned contact',
  deal_created:          'Created deal',
  stage_changed:         'Moved deal stage',
  status_changed:        'Updated status',
  deal_assigned:         'Assigned deal',
  ticket_created:        'Created ticket',
  note_added:            'Added a note',
  call_added:            'Logged a call',
  meeting_added:         'Logged a meeting',
  task_added:            'Added a task',
  email_sent:            'Sent an email',
  email_replied:         'Replied to email',
  priority_changed:      'Changed priority',
  conversation_renamed:  'Renamed conversation',
  conversation_assigned: 'Assigned conversation',
  lead_moved:            'Moved lead to pipeline',
}

const ENTITY_TYPE_LABEL: Record<string, string> = {
  email:        'email',
  ticket:       'ticket',
  conversation: 'bot',
  lead:         'form',
}

function formatEventLabel(eventType: string, entityName?: string | null, entityType?: string | null): string {
  if (eventType === 'priority_changed' && entityType) {
    const typeLabel = ENTITY_TYPE_LABEL[entityType] ?? entityType
    const base = `Changed priority ${typeLabel}`
    return entityName ? `${base}: ${entityName}` : base
  }
  const base = EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ')
  return entityName ? `${base}: ${entityName}` : base
}

const STORAGE_KEY = 'activity_top_collapsed'

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', manager: 'Manager',
  employee: 'Employee', member: 'Member', viewer: 'Viewer',
}

const ENTITY_ICON: Record<string, React.ElementType> = {
  contact:      Users,
  deal:         Briefcase,
  ticket:       Ticket,
  task:         CheckCircle2,
  email:        Briefcase,
  conversation: Briefcase,
  lead:         Briefcase,
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
    <div className="flex items-start gap-3 py-2.5 border-b dark:border-white/6 last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        entry.is_upcoming
          ? 'bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
          : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
      }`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug">
          {formatEventLabel(entry.event_type, entry.entity_name, entry.entity_type)}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {entry.is_upcoming ? `Due ${fmt12h(entry.created_at)}` : fmt12h(entry.created_at)}
        </p>
      </div>
      {entry.is_upcoming && (
        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-medium border border-brand-200 dark:border-brand-500/20">
          upcoming
        </span>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  activity:     ActivityEntry[]
  date:         string           // YYYY-MM-DD
  currentPath:  string
  viewingAs?:   ViewingAsInfo | null
  selectedDate?: string
}

export function TeamMemberBanner({ activity, date: initialDate, currentPath, viewingAs, selectedDate }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [collapsed, setCollapsed] = useState(false)
  const [date, setDate] = useState(selectedDate ?? initialDate)

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

  const changeDate = (newDate: string) => {
    setDate(newDate)
    const url = new URL(window.location.href)
    url.searchParams.set('activityDate', newDate)
    startTransition(() => router.push(url.toString()))
  }

  const upcoming = activity.filter(a => a.is_upcoming)
  const past     = activity.filter(a => !a.is_upcoming)

  return (
    <div className="border-b dark:border-white/8 bg-gray-50/80 dark:bg-[#181818] shrink-0">

      {/* ── Bar: context info + prominent collapse ── */}
      <div className="flex items-center gap-3 px-5 py-2">

        {/* Left: who you're viewing (or "My Activity") */}
        {viewingAs ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 dark:bg-brand-500/25 flex items-center justify-center text-[11px] font-bold text-brand-700 dark:text-brand-300 shrink-0">
              {viewingAs.initials}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{viewingAs.name}</span>
              <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                {ROLE_LABELS[viewingAs.role] ?? viewingAs.role}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-medium shrink-0">
              read only
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Activity — {fmtDate(date + 'T12:00:00')}
            </span>
            {upcoming.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 font-medium">
                {upcoming.length} upcoming
              </span>
            )}
          </div>
        )}

        {/* Right: date picker (when viewing junior) + collapse + stop */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {viewingAs && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{fmtDate(date + 'T12:00:00')}</span>
              {upcoming.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 font-medium">
                  {upcoming.length} upcoming
                </span>
              )}
            </div>
          )}

          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => changeDate(e.target.value)}
            className="text-[11px] bg-white dark:bg-white/5 border dark:border-white/10 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
          />

          {/* Prominent collapse button */}
          <button
            onClick={toggleCollapsed}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              collapsed
                ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-400'
                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20',
            ].join(' ')}
          >
            {collapsed
              ? <><ChevronDown className="w-3.5 h-3.5" /> Show activity</>
              : <><ChevronUp className="w-3.5 h-3.5" /> Hide activity</>
            }
          </button>

          {viewingAs && (
            <button
              onClick={stopViewing}
              title="Stop viewing"
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
            >
              <X className="w-3.5 h-3.5" /> Stop viewing
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded activity feed ── */}
      {!collapsed && (
        <div className="px-5 pb-4">
          <div className="max-h-44 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                No activity for this day
              </p>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-1 pb-1">Upcoming</p>
                    {upcoming.map(e => <ActivityItem key={e.id} entry={e} />)}
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    {upcoming.length > 0 && <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-2 pb-1">Past</p>}
                    {past.map(e => <ActivityItem key={e.id} entry={e} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
