import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }    from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { MyActivityClient } from './my-activity-client'

export const metadata: Metadata = { title: 'My Activity' }

const SOURCE_FROM_ENTITY: Record<string, string> = {
  email: 'email', conversation: 'bot', lead: 'forms', ticket: 'ticket',
  contact: 'manual', deal: 'manual', task: 'manual',
}

function formatLabel(
  eventType:     string,
  entityName:    string | null,
  priorityFrom?: string | null,
  priorityTo?:   string | null,
  statusFrom?:   string | null,
  statusTo?:     string | null,
  stageFrom?:    string | null,
  stageTo?:      string | null,
  assigneeName?: string | null,
): string {
  const n = entityName ? `'${entityName}'` : null
  switch (eventType) {
    case 'email_replied':        return n ? `Replied to ${n}` : 'Replied to email'
    case 'email_sent':           return n ? `Sent email to ${n}` : 'Sent an email'
    case 'deal_created':         return n ? `Deal created for ${n}` : 'Created deal'
    case 'deal_assigned': {
      const to = assigneeName ? ` to ${assigneeName}` : ''
      return n ? `Assigned ${n}${to}` : `Assigned deal${to}`
    }
    case 'stage_changed': {
      const arrow = stageFrom && stageTo ? ` · ${stageFrom} → ${stageTo}` : ''
      return n ? `Moved ${n}${arrow}` : `Moved deal${arrow}`
    }
    case 'status_changed': {
      const arrow = statusFrom && statusTo ? ` · ${statusFrom} → ${statusTo}` : ''
      return n ? `Status for ${n}${arrow}` : `Status changed${arrow}`
    }
    case 'priority_changed': {
      const arrow = priorityFrom && priorityTo ? ` · ${priorityFrom} → ${priorityTo}` : priorityTo ? ` → ${priorityTo}` : ''
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
      const to = assigneeName ? ` to ${assigneeName}` : ''
      return n ? `Assigned form ${n}${to}` : `Assigned form${to}`
    }
    case 'lead_moved':            return n ? `Moved lead ${n} to pipeline` : 'Moved lead to pipeline'
    default: {
      const base = eventType.replace(/_/g, ' ')
      return n ? `${base}: ${n}` : base
    }
  }
}

export interface ActivityRow {
  id:          string
  event_type:  string
  entity_type: string
  entity_name: string | null
  source:      string
  label:       string
  created_at:  string
}

export default async function MyActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ viewAs?: string }>
}) {
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
  type MRow = Pick<WorkspaceMember, 'workspace_id' | 'role'>
  const membership = membershipRaw as MRow | null
  if (!membership) redirect('/login')

  const { viewAs } = await searchParams
  const callerRank = ROLE_RANK[membership.role as WorkspaceMemberRole] ?? 0

  // Resolve viewAs — validate caller outranks the target
  let targetUserId = user.id
  let viewAsName: string | null = null
  if (viewAs && callerRank >= ROLE_RANK.manager) {
    const admin = createAdminClient()
    const { data: targetRaw } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', viewAs)
      .single()
    type TRow = { user_id: string; role: WorkspaceMemberRole }
    const target = targetRaw as TRow | null
    if (target && ROLE_RANK[target.role] < callerRank) {
      targetUserId = target.user_id
      const { data: profileRaw } = await admin
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', target.user_id)
        .single()
      type PRow = { first_name: string; last_name: string | null }
      const p = profileRaw as PRow | null
      viewAsName = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || viewAs : viewAs
    }
  }

  const admin = createAdminClient()

  // Team members for "My view" picker (managers+ only)
  const teamMembers = await (async () => {
    if (callerRank < ROLE_RANK.manager) return []
    const [membersRes, profilesRes] = await Promise.all([
      admin.from('workspace_members').select('user_id, role').eq('workspace_id', membership.workspace_id).not('accepted_at', 'is', null),
      admin.from('user_profiles').select('user_id, first_name, last_name'),
    ])
    type PRow = { user_id: string; first_name: string; last_name: string | null }
    type MRow = { user_id: string; role: WorkspaceMemberRole }
    const pMap = new Map((profilesRes.data ?? [] as PRow[]).map((p: PRow) => [p.user_id, p]))
    return ((membersRes.data ?? []) as MRow[])
      .filter(m => (ROLE_RANK[m.role] ?? 0) < callerRank && m.user_id !== user.id)
      .map(m => { const p = pMap.get(m.user_id); return { user_id: m.user_id, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : '' } })
  })()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (admin as any)
    .from('sage_activity_log')
    .select('id, event_type, entity_type, payload, created_at')
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(500)

  type RawRow = { id: string; event_type: string; entity_type: string; payload: Record<string, unknown>; created_at: string }
  const rows: ActivityRow[] = ((raw ?? []) as RawRow[]).map(r => {
    const p            = r.payload ?? {}
    const entityName   = (p.name ?? p.title ?? p.contact_name ?? null) as string | null
    const priorityFrom = (p.from as string | null) ?? null
    const priorityTo   = (p.to   as string | null) ?? null
    const statusFrom   = (p.status_from ?? p.from_status ?? null) as string | null
    const statusTo     = (p.status_to   ?? p.to_status   ?? null) as string | null
    const stageFrom    = (p.stage_from  ?? p.from_stage  ?? p.from_stage_id ?? null) as string | null
    const stageTo      = (p.stage_to    ?? p.to_stage    ?? null) as string | null
    const assigneeName = (p.assignee_name ?? p.assigned_to_name ?? null) as string | null
    return {
      id:          r.id,
      event_type:  r.event_type,
      entity_type: r.entity_type,
      entity_name: entityName,
      source:      (p.source as string | null) ?? SOURCE_FROM_ENTITY[r.entity_type] ?? 'manual',
      label:       formatLabel(r.event_type, entityName, priorityFrom, priorityTo, statusFrom, statusTo, stageFrom, stageTo, assigneeName),
      created_at:  r.created_at,
    }
  })

  const viewAsUserId = targetUserId !== user.id ? targetUserId : null
  return <MyActivityClient rows={rows} viewAsName={viewAsName} viewAsUserId={viewAsUserId} canExport={callerRank >= ROLE_RANK.manager} teamMembers={teamMembers} />
}
