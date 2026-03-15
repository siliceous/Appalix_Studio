import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }    from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'
import { MyActivityClient } from './my-activity-client'

export const metadata: Metadata = { title: 'My Activity' }

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
  email: 'email', ticket: 'ticket', conversation: 'bot', lead: 'form',
}

function formatLabel(eventType: string, entityType: string, entityName: string | null, priorityFrom?: string | null, priorityTo?: string | null): string {
  if (eventType === 'priority_changed' && entityType) {
    const t     = ENTITY_TYPE_LABEL[entityType] ?? entityType
    const name  = entityName ? ` (${entityName})` : ''
    const arrow = priorityFrom && priorityTo ? ` ${priorityFrom} → ${priorityTo}` : (priorityTo ? ` → ${priorityTo}` : '')
    return `Changed priority for ${t}${name}${arrow}`
  }
  const base = EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ')
  return entityName ? `${base}: ${entityName}` : base
}

export interface ActivityRow {
  id:          string
  event_type:  string
  entity_type: string
  entity_name: string | null
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
    const entityName    = (r.payload?.name ?? r.payload?.title ?? null) as string | null
    const priorityFrom  = (r.payload?.from as string | null) ?? null
    const priorityTo    = (r.payload?.to   as string | null) ?? null
    return {
      id:          r.id,
      event_type:  r.event_type,
      entity_type: r.entity_type,
      entity_name: entityName,
      label:       formatLabel(r.event_type, r.entity_type, entityName, priorityFrom, priorityTo),
      created_at:  r.created_at,
    }
  })

  return <MyActivityClient rows={rows} viewAsName={viewAsName} canExport={callerRank >= ROLE_RANK.manager} />
}
