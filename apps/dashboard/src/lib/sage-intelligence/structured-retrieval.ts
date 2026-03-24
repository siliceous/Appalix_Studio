import { createAdminClient } from '@/lib/supabase/server'
import type { SageAccessScope, SageQueryClassification, RetrievedContext } from './types'

export async function runStructuredRetrieval(
  classification: SageQueryClassification,
  scope: SageAccessScope,
): Promise<RetrievedContext> {
  const admin  = createAdminClient()
  const ctx: RetrievedContext = {}
  const { filters } = classification
  const { workspaceId, assignedToFilter } = scope

  const limit = filters.limit ?? 10

  switch (classification.category) {

    case 'contacts': {
      let q = admin
        .from('sage_contacts')
        .select('id, name, email, phone, company_name, ai_summary, ai_priority, assigned_to, created_at, tags, contact_type')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (assignedToFilter) q = q.in('assigned_to', assignedToFilter)
      if (filters.entity?.name) q = q.ilike('name', `%${filters.entity.name}%`)
      const { data } = await q
      ctx.contacts = (data ?? []).map((c: Record<string, unknown>) => ({
        id:      c.id as string,
        type:    'contact',
        label:   `${c.name} <${c.email ?? ''}>`,
        summary: c.ai_summary as string | undefined,
        metadata: c,
      }))
      break
    }

    case 'deals': {
      let q = admin
        .from('sage_deals')
        .select('id, title, status, priority, value, currency, stage_id, pipeline_id, contact_id, owner_id, close_date, created_at, tags')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (assignedToFilter) q = q.in('owner_id', assignedToFilter)
      if (filters.status)       q = q.eq('status', filters.status)
      if (filters.priority)     q = q.eq('priority', filters.priority)
      if (filters.entity?.name) q = q.ilike('title', `%${filters.entity.name}%`)
      const { data } = await q
      ctx.deals = (data ?? []).map((d: Record<string, unknown>) => ({
        id:       d.id as string,
        type:     'deal',
        label:    d.title as string,
        metadata: d,
      }))
      break
    }

    case 'pipeline': {
      // Fetch pipeline stages + deal counts
      const { data: pipelines } = await admin
        .from('sage_pipelines')
        .select('id, name')
        .eq('workspace_id', workspaceId)

      const pipelineIds = (pipelines ?? []).map((p: { id: string }) => p.id)
      const dealCounts: Record<string, number> = {}

      if (pipelineIds.length > 0) {
        let dealQ = admin
          .from('sage_deals')
          .select('pipeline_id, stage_id, status, value')
          .eq('workspace_id', workspaceId)
          .in('pipeline_id', pipelineIds)
        if (assignedToFilter) dealQ = dealQ.in('owner_id', assignedToFilter)
        const { data: deals } = await dealQ
        for (const d of (deals ?? []) as Array<{ pipeline_id: string; status: string; value: number | null }>) {
          dealCounts[d.pipeline_id] = (dealCounts[d.pipeline_id] ?? 0) + 1
        }
      }

      ctx.deals = (pipelines ?? []).map((p: { id: string; name: string }) => ({
        id:       p.id,
        type:     'pipeline',
        label:    p.name,
        metadata: { dealCount: dealCounts[p.id] ?? 0 },
      }))
      break
    }

    case 'tickets': {
      let q = admin
        .from('sage_tickets')
        .select('id, title, status, priority, description, ai_summary, assigned_to, contact_id, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (assignedToFilter) q = q.in('assigned_to', assignedToFilter)
      if (filters.status)   q = q.eq('status', filters.status)
      if (filters.priority) q = q.eq('priority', filters.priority)
      const { data } = await q
      ctx.tickets = (data ?? []).map((t: Record<string, unknown>) => ({
        id:      t.id as string,
        type:    'ticket',
        label:   t.title as string,
        summary: t.ai_summary as string | undefined,
        metadata: t,
      }))
      break
    }

    case 'emails': {
      let q = admin
        .from('sage_emails')
        .select('id, from_address, from_name, subject, received_at, ai_priority, ai_summary, ai_action, direction, is_read')
        .eq('workspace_id', workspaceId)
        .eq('direction', 'inbound')
        .eq('is_read', false)
        .eq('is_trashed', false)
        .order('received_at', { ascending: false })
        .limit(limit)
      if (assignedToFilter) q = q.in('assigned_to', assignedToFilter)
      if (filters.priority) q = q.eq('ai_priority', filters.priority)
      const { data } = await q
      ctx.emails = (data ?? []).map((e: Record<string, unknown>) => ({
        id:      e.id as string,
        type:    'email',
        label:   `${e.subject ?? '(no subject)'} — from ${e.from_address}`,
        summary: e.ai_summary as string | undefined,
        metadata: e,
      }))
      break
    }

    case 'conversations': {
      let q = admin
        .from('conversations')
        .select('id, title, ai_summary, ai_priority, ai_action, last_activity_at, message_count, platform, ai_entities')
        .eq('workspace_id', workspaceId)
        .order('last_activity_at', { ascending: false })
        .limit(limit)
      if (filters.priority) q = q.eq('ai_priority', filters.priority)
      const { data } = await q
      ctx.conversations = (data ?? []).map((c: Record<string, unknown>) => ({
        id:      c.id as string,
        type:    'conversation',
        label:   (c.title as string) ?? 'Untitled',
        summary: c.ai_summary as string | undefined,
        metadata: c,
      }))
      break
    }

    case 'activities':
    case 'reminders': {
      // Fetch upcoming reminders + deal activities
      const now = new Date().toISOString()
      const { data: reminders } = await admin
        .from('sage_reminders')
        .select('id, title, note, due_at, created_by, deal_id, contact_id')
        .eq('workspace_id', workspaceId)
        .eq('is_sent', false)
        .gte('due_at', now)
        .order('due_at', { ascending: true })
        .limit(limit)
      ctx.reminders = (reminders ?? []).map((r: Record<string, unknown>) => ({
        id:       r.id as string,
        type:     'reminder',
        label:    r.title as string,
        metadata: r,
      }))
      break
    }

    case 'analytics': {
      // Aggregate stats for the workspace (within scope)
      const [dealsRes, contactsRes, ticketsRes, emailsRes] = await Promise.all([
        admin
          .from('sage_deals')
          .select('id, status, value', { count: 'exact' })
          .eq('workspace_id', workspaceId),
        admin
          .from('sage_contacts')
          .select('id', { count: 'exact' })
          .eq('workspace_id', workspaceId),
        admin
          .from('sage_tickets')
          .select('id, status', { count: 'exact' })
          .eq('workspace_id', workspaceId),
        admin
          .from('sage_emails')
          .select('id', { count: 'exact' })
          .eq('workspace_id', workspaceId)
          .eq('is_read', false),
      ])
      const deals = (dealsRes.data ?? []) as Array<{ status: string; value: number | null }>
      ctx.stats = {
        totalContacts:      contactsRes.count ?? 0,
        totalDeals:         dealsRes.count ?? 0,
        openDeals:          deals.filter(d => d.status === 'open').length,
        wonDeals:           deals.filter(d => d.status === 'won').length,
        openTickets:        (ticketsRes.data ?? []).filter((t: Record<string, unknown>) => t.status === 'open').length,
        unreadEmails:       emailsRes.count ?? 0,
        totalPipelineValue: deals
          .filter(d => d.status === 'open')
          .reduce((s, d) => s + (d.value ?? 0), 0),
      }
      break
    }

    case 'team': {
      const admin2 = createAdminClient()
      const { data: members } = await admin2
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId)
        .not('accepted_at', 'is', null)
      ctx.stats = { teamSize: (members ?? []).length }
      break
    }

    default:
      break
  }

  return ctx
}
