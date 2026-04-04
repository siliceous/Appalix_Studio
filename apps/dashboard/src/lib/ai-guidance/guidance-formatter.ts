/**
 * AI Guidance Formatter.
 *
 * Translates raw ai_commercial_memory DB rows into user-facing display objects.
 * This is the ONLY place where internal field names are mapped to partner language.
 *
 * RULE: Internal values (momentum_state='active', budget_likelihood='high', etc.)
 * must never appear in any string returned by this module. Only translated language.
 */

import type {
  AiCommercialMemory,
  AiDraft,
  AiGuidanceUIOutput,
  AiGuidanceVoiceOutput,
  MomentumState,
} from './types'

// ── Momentum label translations ───────────────────────────────────────────────
// Maps internal state → user-facing label

const MOMENTUM_LABELS: Record<MomentumState, string> = {
  cold:           'Early enquiry',
  warming:        'Building interest',
  active:         'Active conversation',
  advancing:      'Moving forward',
  decision_stage: 'Approaching a decision',
  stalled:        'Conversation paused',
}

const MOMENTUM_LEVEL: Record<MomentumState, 'low' | 'medium' | 'high'> = {
  cold:           'low',
  warming:        'low',
  active:         'medium',
  advancing:      'high',
  decision_stage: 'high',
  stalled:        'low',
}

// ── Format for UI ─────────────────────────────────────────────────────────────

export function formatForUI(
  memory: AiCommercialMemory,
  pendingDrafts: AiDraft[],
  takenIntoAccount: string[],
): AiGuidanceUIOutput {
  const momentum = memory.momentum_state as MomentumState

  return {
    situationSummary:   memory.current_summary ?? 'Sage is building context for this prospect.',
    commercialContext:  memory.commercial_interpretation ?? '',
    suggestedDirection: memory.next_suggested_direction ?? 'It may be worth keeping an eye on how this conversation develops.',
    momentumLabel:      MOMENTUM_LABELS[momentum] ?? 'Building context',
    momentumLevel:      MOMENTUM_LEVEL[momentum] ?? 'low',
    takenIntoAccount,
    lastReviewedAt:     memory.last_reviewed_at,
    pendingDrafts,
    isUpdating:         false,
  }
}

// ── Format for voice (future) ─────────────────────────────────────────────────
// Returns null until Sage Voice is enabled. The interface is defined now so
// the voice layer can plug in without changing this module.

export function formatForVoice(
  memory: AiCommercialMemory,
  pendingDrafts: AiDraft[],
): AiGuidanceVoiceOutput | null {
  // Voice output is not active in early rollout.
  // Return null — callers must handle null gracefully.
  // When voice is enabled, uncomment the implementation below.

  void memory; void pendingDrafts  // suppress unused warnings
  return null

  /*
  const momentum = memory.momentum_state as MomentumState

  const speakableSummary = memory.current_summary
    ? stripMarkdown(memory.current_summary).slice(0, 300)
    : 'Sage is still building context for this prospect.'

  const speakableNextStep = memory.next_suggested_direction
    ? stripMarkdown(memory.next_suggested_direction).slice(0, 200)
    : 'It may be worth checking in when you have a moment.'

  const hasDraft = pendingDrafts.length > 0
  const speakableDraftAlert = hasDraft
    ? `I have also drafted a ${pendingDrafts[0].channel} for your review.`
    : undefined

  return { speakableSummary, speakableNextStep, speakableDraftAlert }
  */
}

/**
 * Build a loading/placeholder output for when ai_commercial_memory doesn't
 * exist yet for a deal (first-time view before any review has run).
 */
export function buildPlaceholderOutput(): AiGuidanceUIOutput {
  return {
    situationSummary:   '',
    commercialContext:  '',
    suggestedDirection: '',
    momentumLabel:      'Building context',
    momentumLevel:      'low',
    takenIntoAccount:   [],
    lastReviewedAt:     null,
    pendingDrafts:      [],
    isUpdating:         true,
  }
}
