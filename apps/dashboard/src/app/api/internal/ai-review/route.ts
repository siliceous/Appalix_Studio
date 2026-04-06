/**
 * Internal AI review trigger endpoint.
 *
 * Called fire-and-forget by the API service after bounce detection or other
 * delivery events that cannot call triggerAiReview directly (different process).
 *
 * Protected by INTERNAL_AI_REVIEW_SECRET shared between the API and dashboard.
 *
 * For contact-level events (e.g. email_bounced), pass propagateToOpenDeals=true
 * to also trigger deal-scoped reviews for all non-closed deals linked to the contact.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { triggerAiReview } from '@/lib/ai-guidance/review-trigger'
import type { EntityType } from '@/lib/ai-guidance/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.INTERNAL_AI_REVIEW_SECRET
  if (!secret) {
    console.error('[internal/ai-review] INTERNAL_AI_REVIEW_SECRET not set')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const incoming = req.headers.get('x-internal-secret')
  if (incoming !== secret) {
    console.warn('[internal/ai-review] Unauthorized request')
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: {
    entityType:           EntityType
    entityId:             string
    workspaceId:          string
    triggeredBy:          string
    propagateToOpenDeals?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { entityType, entityId, workspaceId, triggeredBy, propagateToOpenDeals } = body

  if (!entityType || !entityId || !workspaceId || !triggeredBy) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
  }

  // ── Primary review (the entity itself) ─────────────────────────────────────
  await triggerAiReview(entityType, entityId, workspaceId, triggeredBy)

  // ── Deal propagation (contact-level events only) ────────────────────────────
  // After a contact-level event (e.g. email_bounced), also trigger reviews for
  // all non-closed deals linked to this contact so Sage can update commercial context.
  if (propagateToOpenDeals && entityType === 'contact') {
    const admin = createAdminClient()

    const { data: deals } = await admin
      .from('sage_deals')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', entityId)
      .not('status', 'in', '("won","lost","archived")')

    if (deals?.length) {
      // Run deal reviews sequentially — each calls Claude, no need to fan out in parallel
      for (const deal of deals) {
        await triggerAiReview('deal', deal.id, workspaceId, 'contact_email_bounced')
      }
    }
  }

  return NextResponse.json({ ok: true })
}
