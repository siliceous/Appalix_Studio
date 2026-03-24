import { createAdminClient } from '@/lib/supabase/server'
import type { SageAccessScope, SageAlert } from './types'

/**
 * Generate and persist proactive workspace alerts.
 * Runs structured DB queries to find actionable items.
 */
export async function generateWorkspaceAlerts(scope: SageAccessScope): Promise<SageAlert[]> {
  const admin = createAdminClient()
  const { workspaceId, assignedToFilter } = scope
  const alerts: SageAlert[] = []
  const now = new Date()

  // 1. Stale deals — open deals not updated in >14 days
  {
    const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    let q = admin
      .from('sage_deals')
      .select('id, title, updated_at, owner_id, priority')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .lt('updated_at', cutoff)
      .order('updated_at', { ascending: true })
      .limit(5)
    if (assignedToFilter) q = q.in('owner_id', assignedToFilter)
    const { data } = await q
    for (const d of (data ?? []) as Array<{ id: string; title: string; updated_at: string; priority: string }>) {
      const days = Math.floor((now.getTime() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id:         `stale-${d.id}`,
        alertType:  'stale_deal',
        entityType: 'deal',
        entityId:   d.id,
        title:      `Stale deal: ${d.title}`,
        body:       `No activity in ${days} days.`,
        priority:   d.priority === 'high' ? 'high' : 'medium',
        createdAt:  now.toISOString(),
        metadata:   { days, dealId: d.id },
      })
    }
  }

  // 2. Overdue tasks — deal activities of type task with past due_at
  {
    let q = admin
      .from('sage_deal_activities')
      .select('id, title, due_at, deal_id, created_by')
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .is('completed_at', null)
      .lt('due_at', now.toISOString())
      .order('due_at', { ascending: true })
      .limit(5)
    if (assignedToFilter) q = q.in('created_by', assignedToFilter)
    const { data } = await q
    for (const t of (data ?? []) as Array<{ id: string; title: string; due_at: string; deal_id: string }>) {
      alerts.push({
        id:         `overdue-${t.id}`,
        alertType:  'overdue_task',
        entityType: 'deal_activity',
        entityId:   t.id,
        title:      `Overdue: ${t.title}`,
        body:       `Was due ${new Date(t.due_at).toLocaleDateString()}.`,
        priority:   'high',
        createdAt:  now.toISOString(),
        metadata:   { dealId: t.deal_id },
      })
    }
  }

  // 3. Unassigned deals — open deals with no owner
  {
    if (scope.canSeeAll || scope.canSeeTeam) {
      const { data } = await admin
        .from('sage_deals')
        .select('id, title, created_at')
        .eq('workspace_id', workspaceId)
        .eq('status', 'open')
        .is('owner_id', null)
        .order('created_at', { ascending: false })
        .limit(3)
      for (const d of (data ?? []) as Array<{ id: string; title: string }>) {
        alerts.push({
          id:         `unassigned-deal-${d.id}`,
          alertType:  'unassigned_deal',
          entityType: 'deal',
          entityId:   d.id,
          title:      `Unassigned deal: ${d.title}`,
          body:       'This deal has no owner. Assign it to keep it moving.',
          priority:   'medium',
          createdAt:  now.toISOString(),
          metadata:   {},
        })
      }
    }
  }

  // 4. Deals closing soon — close_date within 7 days
  {
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    let q = admin
      .from('sage_deals')
      .select('id, title, close_date, value, owner_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .not('close_date', 'is', null)
      .lte('close_date', soon)
      .gte('close_date', now.toISOString().slice(0, 10))
      .order('close_date', { ascending: true })
      .limit(5)
    if (assignedToFilter) q = q.in('owner_id', assignedToFilter)
    const { data } = await q
    for (const d of (data ?? []) as Array<{ id: string; title: string; close_date: string; value: number | null }>) {
      const days = Math.ceil((new Date(d.close_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id:         `closing-${d.id}`,
        alertType:  'deal_closing_soon',
        entityType: 'deal',
        entityId:   d.id,
        title:      `Closing in ${days}d: ${d.title}`,
        body:       `${d.value ? '$' + d.value.toLocaleString() + ' — ' : ''}due ${d.close_date}`,
        priority:   days <= 2 ? 'high' : 'medium',
        createdAt:  now.toISOString(),
        metadata:   { days, closeDate: d.close_date },
      })
    }
  }

  // 5. High-priority unread emails
  {
    let q = admin
      .from('sage_emails')
      .select('id, subject, from_address, received_at')
      .eq('workspace_id', workspaceId)
      .eq('ai_priority', 'high')
      .eq('is_read', false)
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false })
      .limit(3)
    if (assignedToFilter) q = q.in('assigned_to', assignedToFilter)
    const { data } = await q
    for (const e of (data ?? []) as Array<{ id: string; subject: string; from_address: string }>) {
      alerts.push({
        id:         `email-${e.id}`,
        alertType:  'high_priority_email',
        entityType: 'email',
        entityId:   e.id,
        title:      `High-priority email: ${e.subject ?? '(no subject)'}`,
        body:       `From ${e.from_address}`,
        priority:   'high',
        createdAt:  now.toISOString(),
        metadata:   { from: e.from_address },
      })
    }
  }

  // Sort: high first, then medium
  alerts.sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  return alerts
}

/** Fetch persisted alerts from DB (for the Alerts tab) */
export async function getPersistedAlerts(scope: SageAccessScope): Promise<SageAlert[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_alerts')
    .select('*')
    .eq('workspace_id', scope.workspaceId)
    .eq('is_dismissed', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []).map((a: Record<string, unknown>) => ({
    id:         a.id as string,
    alertType:  a.alert_type as SageAlert['alertType'],
    entityType: a.entity_type as string,
    entityId:   a.entity_id as string,
    title:      a.title as string,
    body:       a.body as string | undefined,
    priority:   a.priority as 'high' | 'medium' | 'low',
    createdAt:  a.created_at as string,
    metadata:   (a.metadata ?? {}) as Record<string, unknown>,
  }))
}
