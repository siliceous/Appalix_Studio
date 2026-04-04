/**
 * AI Review Engine.
 *
 * Reads the full entity context from unified_timeline, calls Claude to
 * generate a commercial memory update, and writes the result to
 * ai_commercial_memory and ai_drafts.
 *
 * Product rules enforced here:
 * - Internal reasoning (budget likelihood, MAN framework, etc.) stays in
 *   reasoning_snapshot — never surfaces in UI fields.
 * - User-facing fields use collaborative, partner-language translations only.
 * - AI never sends anything. Drafts are written with status='pending'.
 * - Reviews are debounced: if last_reviewed_at < 2 minutes ago, skip.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { getTimelineForEntity } from './timeline-reader'
import type {
  AiCommercialMemory,
  EntityType,
  NormalizedTimelineEvent,
  ReviewContext,
} from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Minimum gap between reviews for the same entity (debounce at engine level)
const MIN_REVIEW_GAP_MS = 2 * 60 * 1000  // 2 minutes

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a commercially intelligent AI partner inside a CRM called Appalix.

Your role is to help the user understand what is happening with a prospect and what may help next.

CRITICAL RULES — never break these:
1. You are a loyal partner to the user, not a commander. Never give direct orders.
2. Never expose internal qualification frameworks, scores, or jargon like "MAN", "authority score", "qualification confidence" in any user-facing field.
3. User-facing language must be calm, collaborative, and commercially intelligent.
4. Never say "ask the customer", "send pricing now", "follow up tomorrow", "push for a meeting".
5. Instead use: "it may be worth...", "there are signs that...", "a message like this could help...", "this could be a good moment to..."
6. Drafts are for the user to review and approve — never imply they will be sent automatically.
7. If you lack context, say so clearly rather than inventing signals.

TONE:
- Commercially intelligent
- Calm and observant
- Supportive, never bossy
- Premium and precise

OUTPUT FORMAT:
Return a JSON object with exactly these fields. No markdown, no extra text.`

// ── Main review function ──────────────────────────────────────────────────────

export async function runAiReview(
  entityType: EntityType,
  entityId: string,
  workspaceId: string,
  triggeredBy: string,
): Promise<void> {
  const admin = createAdminClient()

  // Only deals get full commercial memory — contacts and projects get lighter treatment
  if (entityType !== 'deal') {
    await runLightEntityReview(entityType, entityId, workspaceId, triggeredBy)
    return
  }

  // Check debounce — skip if reviewed too recently
  const { data: existing } = await admin
    .from('ai_commercial_memory')
    .select('id, last_reviewed_at, review_count')
    .eq('deal_id', entityId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (existing?.last_reviewed_at) {
    const elapsed = Date.now() - new Date(existing.last_reviewed_at).getTime()
    if (elapsed < MIN_REVIEW_GAP_MS) {
      return  // too soon — the queue debounce handles this gracefully
    }
  }

  // Load timeline events
  const events = await getTimelineForEntity(entityType, entityId, workspaceId)

  // Load deal + contact context
  const context = await buildDealReviewContext(entityId, workspaceId, events, existing as AiCommercialMemory | null)
  if (!context) return

  // Call Claude
  const reviewOutput = await callClaudeForDealReview(context)
  if (!reviewOutput) return

  // Write memory
  await upsertCommercialMemory(entityId, workspaceId, reviewOutput, triggeredBy, existing?.review_count ?? 0)

  // Generate draft if appropriate
  if (reviewOutput.shouldGenerateDraft && reviewOutput.draftBody) {
    await writeDraft(entityId, workspaceId, reviewOutput)
  }

  // Dequeue from ai_review_queue
  await admin
    .from('ai_review_queue')
    .delete()
    .eq('entity_type', 'deal')
    .eq('entity_id', entityId)

  // Log AI review activity to sage_activity_log
  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'deal',
    entity_id:    entityId,
    event_type:   'ai_review',
    payload: {
      summary:      `AI reviewed deal context after ${triggeredBy}`,
      triggered_by: triggeredBy,
      momentum:     reviewOutput.momentumState,
    },
    user_id: null,
  })
}

// ── Deal review context builder ───────────────────────────────────────────────

async function buildDealReviewContext(
  dealId: string,
  workspaceId: string,
  events: NormalizedTimelineEvent[],
  existingMemory: AiCommercialMemory | null,
): Promise<ReviewContext | null> {
  const admin = createAdminClient()

  const { data: deal } = await admin
    .from('sage_deals')
    .select('id, title, value, currency, status, stage_id, close_date, description, source, created_at, contact_id, owner_id, pipeline_id')
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!deal) return null

  let contactContext = ''
  if (deal.contact_id) {
    const { data: contact } = await admin
      .from('sage_contacts')
      .select('name, email, company_name, business_goal, notes, contact_type, ai_summary')
      .eq('id', deal.contact_id)
      .maybeSingle()
    if (contact) {
      contactContext = [
        `Contact: ${contact.name}`,
        contact.company_name ? `Company: ${contact.company_name}` : null,
        contact.business_goal ? `Goal: ${contact.business_goal}` : null,
        contact.ai_summary ? `Previous summary: ${contact.ai_summary}` : null,
      ].filter(Boolean).join('\n')
    }
  }

  // Load workspace business context (from onboarding)
  const { data: ws } = await admin
    .from('workspaces')
    .select('business_description, business_type')
    .eq('id', workspaceId)
    .maybeSingle()

  const businessContext = ws
    ? [ws.business_description, ws.business_type].filter(Boolean).join(' — ')
    : null

  return {
    entityType:      'deal',
    entityId:        dealId,
    workspaceId,
    triggeredBy:     'review',
    recentEvents:    events,
    existingMemory,
    businessContext,
  }
}

// ── Claude call ───────────────────────────────────────────────────────────────

interface ClaudeReviewOutput {
  // Internal fields (stored in reasoning_snapshot, never shown in UI)
  internalAssessment:        string
  momentumState:             'cold' | 'warming' | 'active' | 'advancing' | 'decision_stage' | 'stalled'
  budgetLikelihood:          'low' | 'medium' | 'high' | 'unknown'
  stakeholderConfidence:     'single' | 'multiple' | 'unclear'
  urgencyLevel:              'low' | 'medium' | 'high'

  // User-facing translated fields (partner language only)
  currentSummary:            string
  commercialInterpretation:  string
  stakeholderContext:        string
  suggestedDirection:        string
  nextActionType:            string
  painPoints:                string[]
  desiredOutcomes:           string[]
  engagementSignals:         string[]

  // Draft generation
  shouldGenerateDraft:       boolean
  draftPurpose?:             string
  draftChannel?:             'email' | 'sms'
  draftSubject?:             string
  draftBody?:                string
}

async function callClaudeForDealReview(context: ReviewContext): Promise<ClaudeReviewOutput | null> {
  const timelineText = context.recentEvents
    .slice(0, 25)
    .map(ev => `[${ev.created_at.slice(0, 10)} ${ev.event_type} by ${ev.actor_type}] ${ev.content}`)
    .join('\n')

  const existingContext = context.existingMemory
    ? `Previous AI understanding:\n${context.existingMemory.current_summary ?? 'None'}`
    : 'First review — no previous AI analysis.'

  const userPrompt = `
${context.businessContext ? `Business context: ${context.businessContext}\n` : ''}
${existingContext}

Recent timeline (${context.recentEvents.length} events):
${timelineText || 'No events yet.'}

Review triggered by: ${context.triggeredBy}

Return a JSON object with exactly these fields:
{
  "internalAssessment": "your internal commercial reasoning here — this is stored privately and never shown to users",
  "momentumState": "cold|warming|active|advancing|decision_stage|stalled",
  "budgetLikelihood": "low|medium|high|unknown",
  "stakeholderConfidence": "single|multiple|unclear",
  "urgencyLevel": "low|medium|high",
  "currentSummary": "2-3 sentences describing what appears to be happening, in partner language",
  "commercialInterpretation": "1-2 sentences on what this may mean commercially, collaborative tone",
  "stakeholderContext": "1 sentence on stakeholder dynamics if signals exist, otherwise empty string",
  "suggestedDirection": "1-2 sentences on what may help next, soft and collaborative",
  "nextActionType": "one of: follow_up|meeting_confirm|proposal|check_in|stakeholder_message|recap|none",
  "painPoints": ["array of observed pain points in plain language"],
  "desiredOutcomes": ["array of inferred desired outcomes"],
  "engagementSignals": ["array of positive engagement signals observed"],
  "shouldGenerateDraft": true or false,
  "draftPurpose": "purpose if shouldGenerateDraft is true, else null",
  "draftChannel": "email or sms if shouldGenerateDraft is true, else null",
  "draftSubject": "email subject if applicable, else null",
  "draftBody": "full draft body if shouldGenerateDraft is true, else null"
}
`.trim()

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',  // fast and cost-effective for memory updates
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : null
    if (!text) return null

    // Extract JSON from response (handle any surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as ClaudeReviewOutput
  } catch (err) {
    console.warn('[ai-review-engine] Claude call failed:', (err as Error).message)
    return null
  }
}

// ── DB writes ─────────────────────────────────────────────────────────────────

async function upsertCommercialMemory(
  dealId: string,
  workspaceId: string,
  output: ClaudeReviewOutput,
  triggeredBy: string,
  previousCount: number,
): Promise<void> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  await admin
    .from('ai_commercial_memory')
    .upsert(
      {
        deal_id:                    dealId,
        workspace_id:               workspaceId,
        current_summary:            output.currentSummary,
        commercial_interpretation:  output.commercialInterpretation,
        stakeholder_context:        output.stakeholderContext || null,
        pain_points:                output.painPoints,
        desired_outcomes:           output.desiredOutcomes,
        engagement_signals:         output.engagementSignals,
        objections:                 [],  // populated in future phases
        momentum_state:             output.momentumState,
        budget_likelihood:          output.budgetLikelihood,
        stakeholder_confidence:     output.stakeholderConfidence,
        urgency_level:              output.urgencyLevel,
        next_suggested_direction:   output.suggestedDirection,
        next_action_type:           output.nextActionType,
        reasoning_snapshot:         output.internalAssessment,  // internal only, never in UI
        last_reviewed_at:           now,
        review_triggered_by:        triggeredBy,
        review_count:               previousCount + 1,
        updated_at:                 now,
      },
      { onConflict: 'deal_id' },
    )

  // Also update the lightweight forward field on sage_deals
  await admin
    .from('sage_deals')
    .update({
      ai_momentum_state:   output.momentumState,
      ai_last_reviewed_at: now,
    })
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
}

async function writeDraft(
  dealId: string,
  workspaceId: string,
  output: ClaudeReviewOutput,
): Promise<void> {
  if (!output.draftBody || !output.draftChannel || !output.draftPurpose) return

  const admin = createAdminClient()

  // Check if there's already a pending draft for this deal + purpose to avoid duplicates
  const { data: existing } = await admin
    .from('ai_drafts')
    .select('id')
    .eq('entity_type', 'deal')
    .eq('entity_id', dealId)
    .eq('workspace_id', workspaceId)
    .eq('purpose', output.draftPurpose)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return  // draft already pending for this purpose

  await admin.from('ai_drafts').insert({
    workspace_id:    workspaceId,
    entity_type:     'deal',
    entity_id:       dealId,
    channel:         output.draftChannel,
    purpose:         output.draftPurpose,
    subject:         output.draftSubject ?? null,
    body:            output.draftBody,
    status:          'pending',
    origin_channel:  'text',
    created_by:      'ai',
  })
}

// ── Light review for contact / project ───────────────────────────────────────
// Simpler update — updates ai_summary and ai_last_reviewed_at on the entity.

async function runLightEntityReview(
  entityType: 'contact' | 'project',
  entityId: string,
  workspaceId: string,
  triggeredBy: string,
): Promise<void> {
  const admin = createAdminClient()
  const events = await getTimelineForEntity(entityType, entityId, workspaceId, 20)
  if (events.length === 0) return

  const timelineText = events
    .slice(0, 15)
    .map(ev => `[${ev.created_at.slice(0, 10)} ${ev.event_type}] ${ev.content}`)
    .join('\n')

  const prompt = entityType === 'contact'
    ? `Summarise this contact's current relationship context in 2-3 sentences. Partner language only. No internal jargon.\n\nTimeline:\n${timelineText}`
    : `Summarise the current delivery/success status of this project in 2-3 sentences. Partner language only.\n\nTimeline:\n${timelineText}`

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })

    const summary = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null
    if (!summary) return

    const table = entityType === 'contact' ? 'sage_contacts' : 'sage_projects'
    await admin
      .from(table)
      .update({ ai_summary: summary, ai_last_reviewed_at: new Date().toISOString() })
      .eq('id', entityId)
      .eq('workspace_id', workspaceId)

    await admin
      .from('ai_review_queue')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
  } catch (err) {
    console.warn('[ai-review-engine] light review failed:', (err as Error).message)
  }
}
