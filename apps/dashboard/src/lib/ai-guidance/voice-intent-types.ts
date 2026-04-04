/**
 * Voice intent contract file.
 *
 * Defines the full interface between Sage Voice (STT/TTS layer) and the
 * AI guidance system. These types are the agreed boundary — the voice-intent-
 * parser and voice-action-executor will implement against these interfaces.
 *
 * STATUS: Contract defined. Not yet wired to any runtime service.
 * When Sage Voice is ready, implement voice-intent-parser.ts and
 * voice-action-executor.ts using these types as the interface contract.
 *
 * CRITICAL CONSTRAINT: Voice can never set ai_drafts.status = 'approved'|'sent'.
 * Voice can only write drafts with status='pending'. User approves via UI.
 */

// ── Intent types ──────────────────────────────────────────────────────────────

export type VoiceIntentType =
  // ── Safe writes (no confirmation required) ──────────────────────────────
  | 'add_note'             // "Note that they mentioned a Q3 deadline"
  | 'log_call'             // "Log a 15 minute call — positive, moving forward"
  | 'log_meeting'          // "Log a meeting: they asked for a proposal"
  | 'create_task'          // "Create a task to send the proposal by Friday"
  | 'schedule_follow_up'   // "Schedule a follow-up for next Tuesday"

  // ── Confirmation recommended before executing ────────────────────────────
  | 'update_deal_stage'    // "Move this to proposal stage"
  | 'update_deal_value'    // "Set the deal value to fifteen thousand"
  | 'assign_contact'       // "Assign this to Sarah"

  // ── Always creates ai_drafts with status='pending' ───────────────────────
  // Voice NEVER sends. User approves via UI (DraftActionPanel).
  | 'request_email_draft'  // "Draft a follow-up about the pricing discussion"
  | 'request_sms_draft'    // "Draft an SMS to confirm tomorrow's meeting"
  | 'request_recap'        // "Draft a recap of today's call"

  // ── Read-only: AI speaks the answer back (no DB writes) ──────────────────
  | 'query_context'        // "What's the current status of this deal?"
  | 'query_next_action'    // "What should I do next with this prospect?"
  | 'query_recent_activity'// "What happened recently with this contact?"
  | 'get_ai_guidance'      // "What does Sage think about this prospect?"
  | 'query_deal_value'     // "What's the deal value?"

  // ── System ───────────────────────────────────────────────────────────────
  | 'unknown'              // STT worked, intent unclear — ask user to rephrase

// ── Per-intent payload shapes ─────────────────────────────────────────────────

export interface VoiceIntentPayloads {
  add_note:              { note: string }
  log_call:              { summary: string; duration_minutes?: number; outcome?: string }
  log_meeting:           { summary: string; outcome?: string }
  create_task:           { title: string; due_date?: string; assignee?: string }
  schedule_follow_up:    { scheduled_for: string; note?: string }
  update_deal_stage:     { stage_name: string }
  update_deal_value:     { value: number; currency?: string }
  assign_contact:        { assignee_name: string }
  request_email_draft:   { context?: string; purpose?: string }
  request_sms_draft:     { context?: string }
  request_recap:         { context?: string }
  query_context:         Record<string, never>
  query_next_action:     Record<string, never>
  query_recent_activity: Record<string, never>
  get_ai_guidance:       Record<string, never>
  query_deal_value:      Record<string, never>
  unknown:               { raw_transcript: string }
}

export type VoiceIntentPayload<T extends VoiceIntentType = VoiceIntentType> =
  T extends keyof VoiceIntentPayloads ? VoiceIntentPayloads[T] : Record<string, unknown>

// ── Parsed intent (output of voice-intent-parser) ────────────────────────────

export interface ParsedVoiceIntent<T extends VoiceIntentType = VoiceIntentType> {
  intentType:           T
  payload:              VoiceIntentPayload<T>
  confidence:           number  // 0.0 to 1.0 — parser confidence in the intent classification
  requiresConfirmation: boolean
}

// ── Intent execution result (output of voice-action-executor) ────────────────

export interface VoiceIntentResult {
  success:         boolean
  actionTaken:     string        // human-readable description of what was done
  entityUpdated?:  boolean       // true if a DB write occurred
  draftCreated?:   boolean       // true if an ai_draft was written (status='pending')
  aiResponseText:  string        // text for TTS to speak back to user
  error?:          string
}

// ── Human-in-the-loop constraints (enforced in voice-action-executor) ────────
//
// Voice CAN:
//   - Write notes to sage_deal_activities (source_channel='voice')
//   - Log calls and meetings (type='call'|'meeting')
//   - Create tasks (sage_project_tasks or sage_deal_activities type='task')
//   - Trigger ai_review_queue
//   - Write to ai_drafts with status='pending', origin_channel='voice'
//   - Read from ai_commercial_memory for TTS output
//   - Write voice_events rows
//
// Voice CANNOT:
//   - Call sendEmail() or any SMS send function
//   - Set ai_drafts.status = 'approved' | 'sent'
//   - Execute deal updates without requires_confirmation=true check
//   - Bypass the approval lifecycle on any outbound communication

export const VOICE_SAFE_WRITE_INTENTS: VoiceIntentType[] = [
  'add_note',
  'log_call',
  'log_meeting',
  'create_task',
  'schedule_follow_up',
]

export const VOICE_CONFIRMATION_REQUIRED_INTENTS: VoiceIntentType[] = [
  'update_deal_stage',
  'update_deal_value',
  'assign_contact',
]

export const VOICE_DRAFT_INTENTS: VoiceIntentType[] = [
  'request_email_draft',
  'request_sms_draft',
  'request_recap',
]

export const VOICE_READ_ONLY_INTENTS: VoiceIntentType[] = [
  'query_context',
  'query_next_action',
  'query_recent_activity',
  'get_ai_guidance',
  'query_deal_value',
]
