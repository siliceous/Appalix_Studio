/**
 * Shared types for the AI guidance system.
 * These mirror the ai_commercial_memory DB schema and define the
 * translated output shapes shown in the UI and (future) voice layers.
 */

// ── DB row shape (matches ai_commercial_memory table) ────────────────────────

export type MomentumState =
  | 'cold' | 'warming' | 'active' | 'advancing' | 'decision_stage' | 'stalled'

export type BudgetLikelihood  = 'low' | 'medium' | 'high' | 'unknown'
export type StakeholderConf   = 'single' | 'multiple' | 'unclear'
export type UrgencyLevel      = 'low' | 'medium' | 'high'
export type DraftStatus       = 'pending' | 'approved' | 'edited' | 'dismissed' | 'sent'
export type DraftChannel      = 'email' | 'sms'
export type OriginChannel     = 'text' | 'voice'
export type EntityType        = 'contact' | 'deal' | 'project'

export interface AiCommercialMemory {
  id:                        string
  workspace_id:              string
  deal_id:                   string
  current_summary:           string | null
  business_context:          string | null
  commercial_interpretation: string | null
  stakeholder_context:       string | null
  pain_points:               string[]
  desired_outcomes:          string[]
  objections:                string[]
  engagement_signals:        string[]
  momentum_state:            MomentumState
  budget_likelihood:         BudgetLikelihood
  stakeholder_confidence:    StakeholderConf
  urgency_level:             UrgencyLevel
  next_suggested_direction:  string | null
  next_action_type:          string | null
  reasoning_snapshot:        string | null  // never surfaced in UI
  last_reviewed_at:          string | null
  review_triggered_by:       string | null
  review_count:              number
  created_at:                string
  updated_at:                string
}

export interface AiDraft {
  id:                 string
  workspace_id:       string
  entity_type:        EntityType
  entity_id:          string
  channel:            DraftChannel
  purpose:            string
  subject:            string | null
  body:               string
  status:             DraftStatus
  origin_channel:     OriginChannel
  created_by:         'ai' | 'user'
  based_on_review_id: string | null
  approved_by:        string | null
  sent_at:            string | null
  created_at:         string
  updated_at:         string
}

// ── Normalized timeline event (from unified_timeline view) ───────────────────

export type TimelineSource =
  | 'sage_activity_log'
  | 'sage_activities'
  | 'sage_emails'
  | 'messages'
  | 'voice_events'

export type TimelineActorType = 'user' | 'customer' | 'ai' | 'system'

export interface NormalizedTimelineEvent {
  id:          string
  source:      TimelineSource
  entity_type: string
  entity_id:   string
  workspace_id:string
  event_type:  string
  actor_type:  TimelineActorType
  content:     string
  metadata:    Record<string, unknown>
  user_id:     string | null
  created_at:  string
}

// ── User-facing guidance output (from ai-guidance-service.formatForUI) ────────
// Only translated, partner-language content. No raw internal fields.

export interface AiGuidanceUIOutput {
  // What's happening
  situationSummary:     string   // "This looks like an engaged prospect with..."
  commercialContext:    string   // "The conversation appears to be moving toward..."
  suggestedDirection:   string   // "A warm confirmation message could help keep things moving."

  // Momentum label (user-facing string, not the raw DB value)
  momentumLabel:        string   // "Active conversation" not "active"
  momentumLevel:        'low' | 'medium' | 'high'  // for colour coding only

  // Transparency block
  takenIntoAccount:     string[] // ["the meeting note added yesterday", "the deal stage update"]
  lastReviewedAt:       string | null

  // Pending drafts for this entity
  pendingDrafts:        AiDraft[]

  // AI update state
  isUpdating:           boolean
}

// ── Voice output (from ai-guidance-service.formatForVoice) ───────────────────
// Plain text only. No markdown. ≤2 sentences each. Returns null until voice enabled.

export interface AiGuidanceVoiceOutput {
  speakableSummary:     string   // ≤2 plain sentences
  speakableNextStep:    string   // 1 sentence, collaborative tone
  speakableDraftAlert?: string   // "I've drafted a follow-up email for your review"
}

// ── Context passed to the AI review engine ───────────────────────────────────

export interface ReviewContext {
  entityType:         EntityType
  entityId:           string
  workspaceId:        string
  triggeredBy:        string
  recentEvents:       NormalizedTimelineEvent[]
  existingMemory:     AiCommercialMemory | null
  businessContext:    string | null   // from workspace onboarding scrape
}
