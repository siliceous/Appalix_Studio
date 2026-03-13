'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

export interface TeamMemberStats {
  openDeals:          number
  assignedLeads:      number
  activeConversations: number
  openTickets:        number
}

export interface ActivityEntry {
  id:          string
  event_type:  string
  entity_type: string
  entity_name: string | null
  created_at:  string
  is_upcoming: boolean
  due_at?:     string | null
}

export interface TeamMemberProfileData {
  user_id:    string
  name:       string
  role:       WorkspaceMemberRole
  email:      string
  initials:   string
  stats:      TeamMemberStats
  activity:   ActivityEntry[]
}

// Human-readable labels for event types
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

export function formatEventLabel(eventType: string, entityName?: string | null): string {
  const base = EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ')
  return entityName ? `${base}: ${entityName}` : base
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export async function getTeamMemberProfile(
  targetUserId: string,
  dateStr?: string,        // YYYY-MM-DD, defaults to today
): Promise<TeamMemberProfileData | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string; role: WorkspaceMemberRole } | null
  if (!membership) redirect('/login')

  const callerRank = ROLE_RANK[membership.role] ?? 0
  if (callerRank < ROLE_RANK.manager) return { error: 'Insufficient permissions' }

  const admin = createAdminClient()

  // Validate caller outranks target
  const { data: targetMemberRaw } = await admin
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', targetUserId)
    .single()
  const targetMember = targetMemberRaw as { user_id: string; role: WorkspaceMemberRole } | null
  if (!targetMember) return { error: 'Team member not found' }
  if ((ROLE_RANK[targetMember.role] ?? 0) >= callerRank) return { error: 'Insufficient permissions' }

  // Fetch target user profile + email
  const [profileRes, authUsersRes] = await Promise.all([
    admin.from('user_profiles').select('first_name, last_name').eq('user_id', targetUserId).maybeSingle(),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])
  type PRow = { first_name: string; last_name: string | null }
  const profile = profileRes.data as PRow | null
  const authUser = authUsersRes.data.users.find(u => u.id === targetUserId)
  const email    = authUser?.email ?? ''
  const name     = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || email
    : email

  // Date range for activity feed
  const selectedDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  selectedDate.setHours(0, 0, 0, 0)
  const nextDay = new Date(selectedDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const dayFrom = selectedDate.toISOString()
  const dayTo   = nextDay.toISOString()

  // Parallel fetch: stats + past activity + upcoming tasks
  const [dealsRes, leadsRes, convsRes, ticketsRes, activityRes, upcomingRes] = await Promise.all([
    admin.from('sage_deals')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', membership.workspace_id)
      .eq('owner_id', targetUserId)
      .eq('status', 'open'),

    admin.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', membership.workspace_id)
      .eq('assigned_to', targetUserId),

    admin.from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', membership.workspace_id)
      .eq('assigned_to', targetUserId)
      .eq('status', 'active'),

    admin.from('sage_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', membership.workspace_id)
      .eq('assigned_to', targetUserId)
      .neq('status', 'closed'),

    // Past activity for selected day
    admin.from('sage_activity_log')
      .select('id, event_type, entity_type, payload, created_at')
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', targetUserId)
      .gte('created_at', dayFrom)
      .lt('created_at', dayTo)
      .order('created_at', { ascending: false })
      .limit(40),

    // Upcoming tasks/meetings for selected day
    admin.from('sage_ticket_activities')
      .select('id, type, title, due_at')
      .eq('workspace_id', membership.workspace_id)
      .eq('created_by', targetUserId)
      .gte('due_at', dayFrom)
      .lt('due_at', dayTo)
      .in('type', ['task', 'meeting', 'call'])
      .order('due_at', { ascending: true })
      .limit(20),
  ])

  const stats: TeamMemberStats = {
    openDeals:           dealsRes.count  ?? 0,
    assignedLeads:       leadsRes.count  ?? 0,
    activeConversations: convsRes.count  ?? 0,
    openTickets:         ticketsRes.count ?? 0,
  }

  type ActRow = { id: string; event_type: string; entity_type: string; payload: Record<string, unknown>; created_at: string }
  const pastActivity: ActivityEntry[] = ((activityRes.data ?? []) as ActRow[]).map(row => ({
    id:          row.id,
    event_type:  row.event_type,
    entity_type: row.entity_type,
    entity_name: (row.payload?.name ?? row.payload?.title ?? null) as string | null,
    created_at:  row.created_at,
    is_upcoming: false,
  }))

  type UpRow = { id: string; type: string; title: string | null; due_at: string }
  const upcomingActivity: ActivityEntry[] = ((upcomingRes.data ?? []) as UpRow[]).map(row => ({
    id:          row.id,
    event_type:  `${row.type}_scheduled`,
    entity_type: 'task',
    entity_name: row.title,
    created_at:  row.due_at,
    is_upcoming: true,
    due_at:      row.due_at,
  }))

  const activity = [
    ...upcomingActivity,
    ...pastActivity,
  ]

  return {
    user_id:  targetUserId,
    name,
    role:     targetMember.role,
    email,
    initials: getInitials(name || email),
    stats,
    activity,
  }
}
