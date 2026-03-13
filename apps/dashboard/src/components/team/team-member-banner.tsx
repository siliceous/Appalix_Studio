'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronUp, X, Briefcase, MessageSquare,
  FileText, Ticket, Users, Calendar, Clock, CheckCircle2, Phone, Video,
} from 'lucide-react'
import type { TeamMemberProfileData, ActivityEntry } from '@/app/actions/team-member-profile'

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

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'team_banner_collapsed'

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
  owner: 'Owner', admin: 'Admin', manager: 'Manager', employee: 'Employee',
  member: 'Member', viewer: 'Viewer',
}

const ENTITY_ICON: Record<string, React.ElementType> = {
  contact:  Users,
  deal:     Briefcase,
  ticket:   Ticket,
  task:     CheckCircle2,
}

const UPCOMING_ICON: Record<string, React.ElementType> = {
  task_scheduled:     CheckCircle2,
  meeting_scheduled:  Video,
  call_scheduled:     Phone,
}

// ── Stats card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-white/[0.04] border dark:border-white/8 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Activity feed item ────────────────────────────────────────────────────────
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
          {formatEventLabel(entry.event_type, entry.entity_name)}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
          {entry.is_upcoming
            ? <><Clock className="w-2.5 h-2.5" /> Due {fmt12h(entry.created_at)}</>
            : <><Clock className="w-2.5 h-2.5" /> {fmt12h(entry.created_at)}</>
          }
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

// ── Main banner ───────────────────────────────────────────────────────────────
interface Props {
  profile:     TeamMemberProfileData
  currentPath: string            // e.g. /dashboard/bots
  selectedDate?: string          // YYYY-MM-DD
}

export function TeamMemberBanner({ profile, currentPath, selectedDate }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [collapsed, setCollapsed] = useState(false)
  const [date, setDate] = useState(selectedDate ?? new Date().toISOString().slice(0, 10))

  // Persist collapsed state
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

  const stopViewing = () => {
    // Navigate to current path without viewAs
    router.push(currentPath)
  }

  const changeDate = (newDate: string) => {
    setDate(newDate)
    const url = new URL(window.location.href)
    url.searchParams.set('activityDate', newDate)
    startTransition(() => router.push(url.toString()))
  }

  const upcoming = profile.activity.filter(a => a.is_upcoming)
  const past     = profile.activity.filter(a => !a.is_upcoming)

  return (
    <div className="border-b dark:border-white/8 bg-gray-50/80 dark:bg-[#181818] shrink-0">

      {/* ── Slim bar (always visible) ── */}
      <div className="flex items-center gap-3 px-5 py-2.5">

        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-brand-500/20 dark:bg-brand-500/25 flex items-center justify-center text-[11px] font-bold text-brand-700 dark:text-brand-300 shrink-0">
            {profile.initials}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{profile.name}</span>
            <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          </div>
        </div>

        {/* Read-only badge */}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-medium shrink-0">
          read only
        </span>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand profile' : 'Collapse profile'}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          >
            {collapsed ? <><ChevronDown className="w-3.5 h-3.5" /> Profile</> : <><ChevronUp className="w-3.5 h-3.5" /> Collapse</>}
          </button>

          {/* Stop viewing */}
          <button
            onClick={stopViewing}
            title="Stop viewing"
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Stop viewing
          </button>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-4">

          {/* Stats row */}
          <div className="flex gap-3 flex-wrap">
            <StatCard label="Open deals"    value={profile.stats.openDeals}           icon={Briefcase}     color="bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400" />
            <StatCard label="Leads"         value={profile.stats.assignedLeads}        icon={FileText}      color="bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400" />
            <StatCard label="Conversations" value={profile.stats.activeConversations}  icon={MessageSquare} color="bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400" />
            <StatCard label="Open tickets"  value={profile.stats.openTickets}          icon={Ticket}        color="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Activity section */}
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border dark:border-white/8 overflow-hidden">

            {/* Activity header + date picker */}
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/8">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Activity — {fmtDate(date + 'T12:00:00')}
                </span>
                {upcoming.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 font-medium">
                    {upcoming.length} upcoming
                  </span>
                )}
              </div>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => changeDate(e.target.value)}
                className="text-[11px] bg-transparent border dark:border-white/10 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
              />
            </div>

            {/* Feed */}
            <div className="px-4 max-h-48 overflow-y-auto">
              {profile.activity.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                  No activity for this day
                </p>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-3 pb-1">Upcoming</p>
                      {upcoming.map(e => <ActivityItem key={e.id} entry={e} />)}
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      {upcoming.length > 0 && <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide pt-3 pb-1">Past</p>}
                      {past.map(e => <ActivityItem key={e.id} entry={e} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
