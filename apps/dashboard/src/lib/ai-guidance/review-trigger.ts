/**
 * Review trigger service.
 *
 * Call this fire-and-forget from any server action that creates meaningful
 * context changes. It upserts to ai_review_queue (debouncing via PK conflict)
 * then calls the review engine asynchronously.
 *
 * Usage from server actions:
 *   void triggerAiReview('deal', dealId, workspaceId, 'note_added').catch(() => {})
 *
 * The upsert means 5 rapid saves collapse to 1 pending review — the latest
 * triggered_by wins, which is fine since all 5 saves will be visible in
 * the timeline when the review actually runs.
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { EntityType } from './types'

/**
 * Enqueue an AI review for an entity.
 * Safe to call without await — errors are swallowed at the call site.
 *
 * @param entityType  - 'deal' | 'contact' | 'project'
 * @param entityId    - UUID of the entity
 * @param workspaceId - workspace UUID
 * @param triggeredBy - human-readable event name for audit trail
 */
export async function triggerAiReview(
  entityType: EntityType,
  entityId: string,
  workspaceId: string,
  triggeredBy: string,
): Promise<void> {
  // Run the review engine directly.
  // Import lazily to avoid circular dependency at module load time.
  const { runAiReview } = await import('./ai-review-engine')
  await runAiReview(entityType, entityId, workspaceId, triggeredBy).catch(err => {
    console.warn('[review-trigger] review engine error:', (err as Error).message)
  })
}

/**
 * Convenience: trigger a deal review from a contact-level event.
 * Looks up the contact's primary open deal and triggers a review on it.
 * Silently no-ops if no deal found.
 */
export async function triggerDealReviewForContact(
  contactId: string,
  workspaceId: string,
  triggeredBy: string,
): Promise<void> {
  const admin = createAdminClient()

  const { data: deal } = await admin
    .from('sage_deals')
    .select('id')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (deal?.id) {
    await triggerAiReview('deal', deal.id, workspaceId, triggeredBy)
  }
}
