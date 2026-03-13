'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

export interface ActivityEntry {
  id:          string
  event_type:  string
  entity_type: string
  entity_name: string | null
  created_at:  string
  is_upcoming: boolean
  due_at?:     string | null
}

export interface ViewingAsInfo {
  name:     string
  initials: string
  role:     WorkspaceMemberRole
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Fetch activity feed for a user.
 * - If targetUserId === caller's own id: fetches own data using regular client
 * - If targetUserId !== caller's id: caller must be manager+ and outrank target
 *   Returns null if permission check fails.
 */
export async function getActivityFeed(
  targetUserId: string,
  workspaceId:  string,
  dateStr?:     string,
): Promise<ActivityEntry[]> {
  const admin = createAdminClient()

  const selectedDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  selectedDate.setHours(0, 0, 0, 0)
  const nextDay = new Date(selectedDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const dayFrom = selectedDate.toISOString()
  const dayTo   = nextDay.toISOString()

  const [activityRes, upcomingRes] = await Promise.all([
    admin.from('sage_activity_log')
      .select('id, event_type, entity_type, payload, created_at')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .gte('created_at', dayFrom)
      .lt('created_at', dayTo)
      .order('created_at', { ascending: false })
      .limit(40),

    admin.from('sage_ticket_activities')
      .select('id, type, title, due_at')
      .eq('workspace_id', workspaceId)
      .eq('created_by', targetUserId)
      .gte('due_at', dayFrom)
      .lt('due_at', dayTo)
      .in('type', ['task', 'meeting', 'call'])
      .order('due_at', { ascending: true })
      .limit(20),
  ])

  type ActRow = { id: string; event_type: string; entity_type: string; payload: Record<string, unknown>; created_at: string }
  const past: ActivityEntry[] = ((activityRes.data ?? []) as ActRow[]).map(row => ({
    id:          row.id,
    event_type:  row.event_type,
    entity_type: row.entity_type,
    entity_name: (row.payload?.name ?? row.payload?.title ?? null) as string | null,
    created_at:  row.created_at,
    is_upcoming: false,
  }))

  type UpRow = { id: string; type: string; title: string | null; due_at: string }
  const upcoming: ActivityEntry[] = ((upcomingRes.data ?? []) as UpRow[]).map(row => ({
    id:          row.id,
    event_type:  `${row.type}_scheduled`,
    entity_type: 'task',
    entity_name: row.title,
    created_at:  row.due_at,
    is_upcoming: true,
    due_at:      row.due_at,
  }))

  return [...upcoming, ...past]
}

/**
 * Resolve who the caller is viewing (for manager+ viewing a junior).
 * Returns null if viewAs is not set or permission check fails.
 */
export async function resolveViewingAs(
  viewAs: string | undefined,
  workspaceId: string,
): Promise<ViewingAsInfo | null> {
  if (!viewAs) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single()
  const callerRole = (membershipRaw as { role: WorkspaceMemberRole } | null)?.role
  const callerRank = callerRole ? (ROLE_RANK[callerRole] ?? 0) : 0
  if (callerRank < ROLE_RANK.manager) return null

  const admin = createAdminClient()
  const { data: targetMemberRaw } = await admin
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', viewAs)
    .single()
  type TR = { user_id: string; role: WorkspaceMemberRole }
  const target = targetMemberRaw as TR | null
  if (!target || (ROLE_RANK[target.role] ?? 0) >= callerRank) return null

  const [profileRes, authRes] = await Promise.all([
    admin.from('user_profiles').select('first_name, last_name').eq('user_id', viewAs).maybeSingle(),
    admin.auth.admin.getUserById(viewAs),
  ])
  type PRow = { first_name: string; last_name: string | null }
  const p = profileRes.data as PRow | null
  const email = authRes.data.user?.email ?? ''
  const name = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || email : email

  return { name, initials: getInitials(name || email), role: target.role }
}
