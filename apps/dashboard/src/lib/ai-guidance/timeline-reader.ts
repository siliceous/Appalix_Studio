/**
 * Timeline reader — single interface for AI to read the unified timeline.
 *
 * AI review engine must ONLY read event history through this module.
 * Never query raw tables (sage_deal_activities, sage_emails, messages, etc.)
 * from the AI review engine directly.
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { NormalizedTimelineEvent, EntityType } from './types'

// How many events to load per review (enough for context, not too many for tokens)
const DEFAULT_LIMIT = 40

/**
 * Load the most recent timeline events for a given entity.
 * For deals: loads deal + linked contact events.
 * For contacts: loads contact-scoped events only.
 * For projects: loads project + linked deal events.
 */
export async function getTimelineForEntity(
  entityType: EntityType,
  entityId: string,
  workspaceId: string,
  limit = DEFAULT_LIMIT,
): Promise<NormalizedTimelineEvent[]> {
  const admin = createAdminClient()

  // The unified_timeline view is a SQL VIEW — query it directly.
  // Supabase JS doesn't support UNION-based views via .from() without RPC,
  // so we use a raw RPC call that wraps the view query.
  const { data, error } = await admin.rpc('query_unified_timeline', {
    p_entity_type:  entityType,
    p_entity_id:    entityId,
    p_workspace_id: workspaceId,
    p_limit:        limit,
  })

  if (error) {
    // Fallback: if RPC not yet created, query the view via from() as a workaround
    // This will work once Supabase supports views with UNION in from().
    console.warn('[timeline-reader] RPC not available, falling back to direct view query:', error.message)
    return getTimelineDirectFallback(entityType, entityId, workspaceId, limit)
  }

  return (data ?? []) as NormalizedTimelineEvent[]
}

/**
 * Fallback: query the view by building individual table queries and merging.
 * Used until the query_unified_timeline RPC function is created in Supabase.
 */
async function getTimelineDirectFallback(
  entityType: EntityType,
  entityId: string,
  workspaceId: string,
  limit: number,
): Promise<NormalizedTimelineEvent[]> {
  const admin = createAdminClient()
  const events: NormalizedTimelineEvent[] = []

  // System activity log
  const { data: actLog } = await admin
    .from('sage_activity_log')
    .select('id, entity_type, entity_id, workspace_id, event_type, payload, user_id, created_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(20)

  for (const row of actLog ?? []) {
    events.push({
      id:           row.id,
      source:       'sage_activity_log',
      entity_type:  row.entity_type,
      entity_id:    row.entity_id,
      workspace_id: row.workspace_id,
      event_type:   row.event_type,
      actor_type:   'system',
      content:      (row.payload as Record<string, string>)?.summary ?? row.event_type,
      metadata:     (row.payload as Record<string, unknown>) ?? {},
      user_id:      row.user_id,
      created_at:   row.created_at,
    })
  }

  // Structured activities (notes, calls, meetings, tasks)
  const activityFilter = entityType === 'deal'
    ? admin.from('sage_deal_activities').select('*').eq('deal_id', entityId)
    : entityType === 'contact'
    ? admin.from('sage_deal_activities').select('*').eq('contact_id', entityId)
    : admin.from('sage_deal_activities').select('*').eq('project_id', entityId)

  const { data: activities } = await activityFilter
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(20)

  for (const row of activities ?? []) {
    events.push({
      id:           row.id,
      source:       'sage_activities',
      entity_type:  entityType,
      entity_id:    entityId,
      workspace_id: row.workspace_id,
      event_type:   row.type,
      actor_type:   row.source_channel === 'system' ? 'system' : 'user',
      content:      row.body ?? row.title ?? row.type,
      metadata:     { title: row.title, due_at: row.due_at, source_channel: row.source_channel },
      user_id:      row.created_by,
      created_at:   row.created_at,
    })
  }

  // Emails (contact-level only — deals link via contact)
  if (entityType === 'contact' || entityType === 'deal') {
    // For deal context, we'd need to join via contact_id — simplified here
    const { data: emails } = await admin
      .from('sage_emails')
      .select('id, from_address, subject, direction, body_text, ai_priority, contact_id, received_at, sent_at, created_at, workspace_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10)

    for (const row of emails ?? []) {
      events.push({
        id:           row.id,
        source:       'sage_emails',
        entity_type:  'contact',
        entity_id:    row.contact_id ?? row.from_address,
        workspace_id: row.workspace_id,
        event_type:   row.direction === 'inbound' ? 'inbound_email' : 'outbound_email',
        actor_type:   row.direction === 'inbound' ? 'customer' : 'user',
        content:      row.subject ?? row.body_text?.slice(0, 120) ?? '',
        metadata:     { subject: row.subject, direction: row.direction, ai_priority: row.ai_priority },
        user_id:      null,
        created_at:   row.sent_at ?? row.received_at ?? row.created_at,
      })
    }
  }

  // Sort all events by created_at desc, take limit
  return events
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

/**
 * Extract the "taken into account" display items from recent events.
 * Returns human-readable strings for the TakenIntoAccountBlock UI component.
 */
export function buildTakenIntoAccountList(events: NormalizedTimelineEvent[]): string[] {
  const items: string[] = []

  for (const ev of events.slice(0, 10)) {
    const ago = timeAgoShort(ev.created_at)
    switch (ev.event_type) {
      case 'note':
        items.push(`a note added ${ago}`)
        break
      case 'call':
        items.push(`a call logged ${ago}`)
        break
      case 'meeting':
        items.push(`a meeting logged ${ago}`)
        break
      case 'inbound_email':
        items.push(`an inbound email received ${ago}`)
        break
      case 'outbound_email':
        items.push(`an email sent ${ago}`)
        break
      case 'stage_changed':
        items.push(`a deal stage change ${ago}`)
        break
      case 'contact_updated':
        items.push(`a contact update ${ago}`)
        break
      case 'inbound_bot':
        items.push(`a chat message received ${ago}`)
        break
      default:
        if (ev.actor_type === 'user' && ev.content) {
          items.push(`a recent update ${ago}`)
        }
    }
  }

  // Deduplicate and cap at 5
  return [...new Set(items)].slice(0, 5)
}

function timeAgoShort(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60)  return mins  <= 1  ? 'just now'    : `${mins} min ago`
  if (hours < 24)  return hours === 1 ? '1 hour ago'  : `${hours} hours ago`
  if (days  < 7)   return days  === 1 ? 'yesterday'   : `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}
