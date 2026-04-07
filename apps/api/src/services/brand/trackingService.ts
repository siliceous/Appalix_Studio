/**
 * trackingService
 *
 * Validates and persists behavioral tracking events from the tracker.js
 * client script. All writes go through this service — no direct DB access
 * from the route handler.
 *
 * Responsibilities:
 *   1. Validate payload (event type, entity type, metadata shape)
 *   2. Create visitor record on first meaningful form interaction
 *   3. Write tracking_events row
 *   4. Update visitor.last_seen_at on every event
 *   5. On form_submit: update visitor identity (email/phone) + dedup lead
 *   6. Compute and return high-intent signal
 *
 * High-intent rule (locked):
 *   HIGH intent = (page_view_count >= 2 OR form_start_exists) AND form_submit_exists
 *
 * GDPR posture:
 *   visitor_id is NOT created on passive page_view events.
 *   It is created only on form_start or form_submit.
 *   visitorId stored in sessionStorage client-side (not localStorage).
 */

import { randomUUID } from 'crypto'
import { supabase } from '../../lib/supabase.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventType = 'page_view' | 'click' | 'scroll' | 'form_start' | 'form_submit'
export type EntityType = 'brand_page' | 'brand_form'

// Locked metadata shapes per event type
export interface PageViewMeta    { url: string; referrer?: string; utm_source?: string; utm_medium?: string }
export interface ClickMeta       { element: string; label?: string; href?: string }
export interface ScrollMeta      { depth_pct: number }
export interface FormStartMeta   { form_id: string }
export interface FormSubmitMeta  { form_id: string; field_count: number; email?: string; phone?: string }


export interface TrackingPayload {
  visitorId?:  string | null
  sessionId:   string
  eventType:   EventType
  entityType:  EntityType
  entityId:    string
  workspaceId: string
  metadata:    Record<string, unknown>
}

export interface TrackingResponse {
  ok:        boolean
  visitorId?: string
  sessionId?: string
}

// ── Metadata validators ───────────────────────────────────────────────────────

function validateMetadata(eventType: EventType, meta: Record<string, unknown>): string | null {
  switch (eventType) {
    case 'page_view':
      if (typeof meta.url !== 'string' || !meta.url) return 'page_view requires metadata.url'
      return null
    case 'click':
      if (typeof meta.element !== 'string' || !meta.element) return 'click requires metadata.element'
      return null
    case 'scroll':
      if (typeof meta.depth_pct !== 'number') return 'scroll requires metadata.depth_pct (number)'
      return null
    case 'form_start':
      if (typeof meta.form_id !== 'string' || !meta.form_id) return 'form_start requires metadata.form_id'
      return null
    case 'form_submit':
      if (typeof meta.form_id !== 'string' || !meta.form_id) return 'form_submit requires metadata.form_id'
      if (typeof meta.field_count !== 'number') return 'form_submit requires metadata.field_count (number)'
      return null
    default:
      return `unknown event_type: ${eventType}`
  }
}

// ── Visitor management ────────────────────────────────────────────────────────

async function getOrCreateVisitor(
  visitorId: string | null | undefined,
  workspaceId: string,
  entityType: EntityType,
  entityId: string
): Promise<string> {
  // If client sent a visitorId, verify it belongs to this workspace
  if (visitorId) {
    const { data } = await supabase
      .from('visitors')
      .select('id')
      .eq('id', visitorId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (data) return visitorId
    // Visitor not found for this workspace — mint a new one
  }

  // Create new visitor
  const newId = randomUUID()
  await supabase.from('visitors').insert({
    id:                     newId,
    workspace_id:           workspaceId,
    first_touch_entity_type: entityType,
    first_touch_entity_id:  entityId,
    first_seen_at:          new Date().toISOString(),
    last_seen_at:           new Date().toISOString(),
  })

  return newId
}

async function updateVisitorIdentity(
  visitorId: string,
  workspaceId: string,
  meta: FormSubmitMeta
): Promise<void> {
  const updates: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
  }
  if (meta.email) updates.email = meta.email.trim().toLowerCase()
  if (meta.phone) updates.phone = meta.phone.trim()

  await supabase
    .from('visitors')
    .update(updates)
    .eq('id', visitorId)
    .eq('workspace_id', workspaceId)
}

async function touchVisitor(visitorId: string, workspaceId: string): Promise<void> {
  await supabase
    .from('visitors')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', visitorId)
    .eq('workspace_id', workspaceId)
}

// ── High-intent signal ────────────────────────────────────────────────────────
//
// Rule (locked):
//   HIGH intent = (page_view_count >= 2 OR form_start_exists) AND form_submit_exists

async function computeHighIntent(
  visitorId: string,
  workspaceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('tracking_events')
    .select('event_type')
    .eq('visitor_id', visitorId)
    .eq('workspace_id', workspaceId)

  if (!data || data.length === 0) return false

  const events = data as { event_type: string }[]
  const pageViewCount  = events.filter(e => e.event_type === 'page_view').length
  const hasFormStart   = events.some(e => e.event_type === 'form_start')
  const hasFormSubmit  = events.some(e => e.event_type === 'form_submit')

  return (pageViewCount >= 2 || hasFormStart) && hasFormSubmit
}

// ── Main service function ─────────────────────────────────────────────────────

export async function processTrackingEvent(
  payload: TrackingPayload
): Promise<TrackingResponse> {
  const { visitorId, sessionId, eventType, entityType, entityId, workspaceId, metadata } = payload

  // 1. Validate entity type
  if (entityType !== 'brand_page' && entityType !== 'brand_form') {
    throw Object.assign(new Error(`Invalid entity_type: ${entityType}`), { statusCode: 400 })
  }

  // 2. Validate metadata shape
  const metaError = validateMetadata(eventType, metadata)
  if (metaError) {
    throw Object.assign(new Error(metaError), { statusCode: 400 })
  }

  // 3. Resolve visitorId
  //    Only create a visitor on meaningful form interactions, not passive page views.
  const isFormInteraction = eventType === 'form_start' || eventType === 'form_submit'
  let resolvedVisitorId: string | null = null

  if (isFormInteraction) {
    resolvedVisitorId = await getOrCreateVisitor(visitorId, workspaceId, entityType, entityId)
  } else if (visitorId) {
    // Passive event with an existing visitorId — accept it, update last_seen
    const { data } = await supabase
      .from('visitors')
      .select('id')
      .eq('id', visitorId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (data) {
      resolvedVisitorId = visitorId
      await touchVisitor(visitorId, workspaceId)
    }
  }

  // 4. On form_submit: update visitor identity
  if (eventType === 'form_submit' && resolvedVisitorId) {
    const submitMeta = metadata as unknown as FormSubmitMeta
    await updateVisitorIdentity(resolvedVisitorId, workspaceId, submitMeta)
  }

  // 5. Write event
  await supabase.from('tracking_events').insert({
    workspace_id: workspaceId,
    visitor_id:   resolvedVisitorId,
    session_id:   sessionId,
    event_type:   eventType,
    entity_type:  entityType,
    entity_id:    entityId,
    metadata,
  })

  // 6. High-intent signal (only meaningful after form_submit)
  let isHighIntent = false
  if (eventType === 'form_submit' && resolvedVisitorId) {
    isHighIntent = await computeHighIntent(resolvedVisitorId, workspaceId)
    if (isHighIntent) {
      console.log(`[trackingService] HIGH INTENT visitor ${resolvedVisitorId} workspace ${workspaceId}`)
      // Phase 3: escalate in Approach popup card, increase lead priority
    }
  }

  return {
    ok:        true,
    visitorId: resolvedVisitorId ?? undefined,
    sessionId,
  }
}
