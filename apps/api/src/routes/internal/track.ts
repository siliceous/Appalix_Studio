/**
 * POST /internal/track
 *
 * Ingestion endpoint for the Appalix tracker.js client script.
 *
 * Authentication:
 *   Not service-key authenticated — the tracker runs on public pages with no
 *   server-side session. Instead, the workspace_id + entity_id are validated
 *   against the DB to ensure the entity exists and belongs to the workspace.
 *   This prevents arbitrary data injection while keeping the endpoint accessible
 *   from embedded pages.
 *
 * Rate limiting:
 *   Not implemented for MVP. Add at the infra layer (reverse proxy / Upstash)
 *   before production traffic.
 */

import type { FastifyInstance } from 'fastify'
import { supabase }              from '../../lib/supabase.js'
import {
  processTrackingEvent,
  type TrackingPayload,
  type EventType,
  type EntityType,
} from '../../services/brand/trackingService.js'

const VALID_EVENT_TYPES  = new Set<string>(['page_view', 'click', 'scroll', 'form_start', 'form_submit'])
const VALID_ENTITY_TYPES = new Set<string>(['brand_page', 'brand_form'])
const ENTITY_TABLE: Record<string, string> = {
  brand_page: 'brand_pages',
  brand_form: 'brand_forms',
}

/** Verify the entity actually exists and belongs to the workspace. */
async function validateEntity(
  entityType: EntityType,
  entityId: string,
  workspaceId: string
): Promise<boolean> {
  const table = ENTITY_TABLE[entityType]
  if (!table) return false

  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('id', entityId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .maybeSingle()

  return data !== null
}

interface TrackBody {
  visitorId?:  string | null
  sessionId?:  string
  eventType?:  string
  entityType?: string
  entityId?:   string
  workspaceId?: string
  metadata?:   Record<string, unknown>
}

export async function internalTrackRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: TrackBody }>('/track', async (request, reply) => {
    const {
      visitorId,
      sessionId,
      eventType,
      entityType,
      entityId,
      workspaceId,
      metadata,
    } = request.body ?? {}

    // ── Basic field validation ──────────────────────────────────────────────

    if (!sessionId   || typeof sessionId   !== 'string') {
      return reply.status(400).send({ error: 'sessionId is required' })
    }
    if (!eventType   || !VALID_EVENT_TYPES.has(eventType)) {
      return reply.status(400).send({ error: `Invalid eventType: ${eventType}` })
    }
    if (!entityType  || !VALID_ENTITY_TYPES.has(entityType)) {
      return reply.status(400).send({ error: `Invalid entityType: ${entityType}` })
    }
    if (!entityId    || typeof entityId    !== 'string') {
      return reply.status(400).send({ error: 'entityId is required' })
    }
    if (!workspaceId || typeof workspaceId !== 'string') {
      return reply.status(400).send({ error: 'workspaceId is required' })
    }
    if (!metadata    || typeof metadata    !== 'object' || Array.isArray(metadata)) {
      return reply.status(400).send({ error: 'metadata must be an object' })
    }

    // ── Entity ownership validation ─────────────────────────────────────────
    // Ensures the entity exists and belongs to the workspace.
    // Prevents injecting events for entities the caller doesn't own.

    const entityValid = await validateEntity(
      entityType as EntityType,
      entityId,
      workspaceId
    )
    if (!entityValid) {
      // Return 200 to avoid leaking entity existence to potential scanners
      return reply.send({ ok: false })
    }

    // ── Process event ───────────────────────────────────────────────────────

    const result = await processTrackingEvent({
      visitorId,
      sessionId,
      eventType:   eventType  as EventType,
      entityType:  entityType as EntityType,
      entityId,
      workspaceId,
      metadata,
    } satisfies TrackingPayload)

    return reply.send(result)
  })
}
