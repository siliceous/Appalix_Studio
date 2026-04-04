'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { formatForUI, buildPlaceholderOutput } from '@/lib/ai-guidance/guidance-formatter'
import { buildTakenIntoAccountList, getTimelineForEntity } from '@/lib/ai-guidance/timeline-reader'
import { triggerAiReview } from '@/lib/ai-guidance/review-trigger'
import type { AiCommercialMemory, AiDraft, AiGuidanceUIOutput, EntityType } from '@/lib/ai-guidance/types'

async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  type MemberRow = { workspace_id: string }
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .returns<MemberRow[]>()
    .single()
  if (!data) redirect('/login')
  return (data as unknown as MemberRow).workspace_id
}

// ── Fetch guidance for an entity ──────────────────────────────────────────────

/**
 * Fetch the current AI guidance output for a deal.
 * Returns placeholder output and triggers a background review if no memory exists yet.
 */
export async function getDealGuidance(dealId: string): Promise<AiGuidanceUIOutput> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const [memoryResult, draftsResult] = await Promise.all([
    admin
      .from('ai_commercial_memory')
      .select('*')
      .eq('deal_id', dealId)
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    admin
      .from('ai_drafts')
      .select('*')
      .eq('entity_type', 'deal')
      .eq('entity_id', dealId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const memory = memoryResult.data as AiCommercialMemory | null
  const pendingDrafts = (draftsResult.data ?? []) as AiDraft[]

  if (!memory) {
    // No memory yet — schedule review to run after response is sent
    // `after()` keeps the serverless function alive past response completion
    after(async () => {
      await triggerAiReview('deal', dealId, workspaceId, 'first_view').catch(() => {})
    })
    return buildPlaceholderOutput()
  }

  // Build "taken into account" list from recent timeline events
  const recentEvents = await getTimelineForEntity('deal', dealId, workspaceId, 15)
  const takenIntoAccount = buildTakenIntoAccountList(recentEvents)

  return formatForUI(memory, pendingDrafts, takenIntoAccount)
}

// ── Draft management actions ──────────────────────────────────────────────────

/**
 * Approve a pending draft (user has reviewed and approved it).
 * Does NOT send anything — sending is handled by existing send actions.
 * Sets status='approved' so the UI knows to show send controls.
 */
export async function approveDraft(draftId: string): Promise<{ ok: boolean; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await admin
    .from('ai_drafts')
    .update({
      status:      'approved',
      approved_by: user?.id ?? null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')   // only pending drafts can be approved

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Dismiss a pending draft (user doesn't want to send it).
 */
export async function dismissDraft(draftId: string): Promise<{ ok: boolean; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('ai_drafts')
    .update({ status: 'dismissed', updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Update the body of a draft (user has edited it before sending).
 * Sets status='edited' so we track that a human modified the AI draft.
 */
export async function editDraft(
  draftId: string,
  newBody: string,
  newSubject?: string,
): Promise<{ ok: boolean; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const update: Record<string, string> = {
    body:       newBody,
    status:     'edited',
    updated_at: new Date().toISOString(),
  }
  if (newSubject !== undefined) update.subject = newSubject

  const { error } = await admin
    .from('ai_drafts')
    .update(update)
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Mark a draft as sent (called after the actual send action completes).
 */
export async function markDraftSent(draftId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  await admin
    .from('ai_drafts')
    .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
}

/**
 * Manually request a fresh AI review for a deal.
 * Called from the "Refresh AI review" button in the UI.
 */
export async function refreshAiReview(
  entityType: EntityType,
  entityId: string,
): Promise<{ ok: boolean }> {
  const workspaceId = await getWorkspaceId()

  // Clear last_reviewed_at so the debounce check doesn't block it
  if (entityType === 'deal') {
    const admin = createAdminClient()
    await admin
      .from('ai_commercial_memory')
      .update({ last_reviewed_at: null })
      .eq('deal_id', entityId)
      .eq('workspace_id', workspaceId)
  }

  after(async () => {
    await triggerAiReview(entityType, entityId, workspaceId, 'manual_refresh').catch(() => {})
  })
  revalidatePath(`/sage/pipelines`)
  return { ok: true }
}
