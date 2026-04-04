-- ─────────────────────────────────────────────────────────────────────────────
-- 00100_ai_commercial_memory.sql
-- Phase 1: AI data foundation.
--
-- 1. ai_commercial_memory  — deal-anchored commercial memory (primary)
-- 2. ai_drafts             — pending AI-generated email/SMS drafts
-- 3. ai_review_queue       — lightweight async trigger queue with debounce
-- 4. voice_events          — voice I/O events (populated by Sage Voice later)
-- 5. AI columns on sage_deals, sage_projects, sage_contacts
-- 6. Extend unified_timeline view with voice_events branch
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. ai_commercial_memory ──────────────────────────────────────────────────
-- One row per deal. The primary commercial memory anchor.
-- Contact and project get lightweight summary columns (added in section 5).

CREATE TABLE IF NOT EXISTS ai_commercial_memory (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id                uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deal_id                     uuid NOT NULL UNIQUE REFERENCES sage_deals(id) ON DELETE CASCADE,

  -- Current understanding (user-facing translated output stored here)
  current_summary             text,
  business_context            text,
  commercial_interpretation   text,
  stakeholder_context         text,

  -- Signal arrays
  pain_points                 jsonb NOT NULL DEFAULT '[]',
  desired_outcomes            jsonb NOT NULL DEFAULT '[]',
  objections                  jsonb NOT NULL DEFAULT '[]',
  engagement_signals          jsonb NOT NULL DEFAULT '[]',

  -- Internal assessed states (never surfaced raw to users)
  momentum_state              text NOT NULL DEFAULT 'cold'
    CHECK (momentum_state IN ('cold','warming','active','advancing','decision_stage','stalled')),
  budget_likelihood           text NOT NULL DEFAULT 'unknown'
    CHECK (budget_likelihood IN ('low','medium','high','unknown')),
  stakeholder_confidence      text NOT NULL DEFAULT 'unclear'
    CHECK (stakeholder_confidence IN ('single','multiple','unclear')),
  urgency_level               text NOT NULL DEFAULT 'low'
    CHECK (urgency_level IN ('low','medium','high')),

  -- Guidance output (user-facing translated language)
  next_suggested_direction    text,
  next_action_type            text,

  -- Internal reasoning snapshot — never shown in any UI component
  reasoning_snapshot          text,

  -- Review metadata
  last_reviewed_at            timestamptz,
  review_triggered_by         text,   -- 'note_added' | 'stage_changed' | 'email_received' | etc.
  review_count                integer NOT NULL DEFAULT 0,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_commercial_memory_workspace_idx
  ON ai_commercial_memory(workspace_id, last_reviewed_at DESC);

-- ── 2. ai_drafts ─────────────────────────────────────────────────────────────
-- Persistent storage for AI-generated drafts awaiting user approval.
-- status='pending' always — AI never sets status to 'sent' directly.

CREATE TABLE IF NOT EXISTS ai_drafts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Entity this draft is about
  entity_type         text NOT NULL CHECK (entity_type IN ('contact','deal','project','conversation')),
  entity_id           uuid NOT NULL,

  -- Draft content
  channel             text NOT NULL CHECK (channel IN ('email','sms')),
  purpose             text NOT NULL,   -- 'intro'|'follow_up'|'meeting_confirm'|'recap'|'check_in'|'stakeholder_aware'|'soft_urgency'
  subject             text,            -- email only
  body                text NOT NULL,

  -- Approval lifecycle
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','edited','dismissed','sent')),

  -- Origin tracking (voice-readiness)
  origin_channel      text NOT NULL DEFAULT 'text'
    CHECK (origin_channel IN ('text','voice')),
  voice_event_id      uuid,            -- FK to voice_events added in migration 00101 once table exists

  -- Who created it and review linkage
  created_by          text NOT NULL DEFAULT 'ai' CHECK (created_by IN ('ai','user')),
  based_on_review_id  uuid REFERENCES ai_commercial_memory(id) ON DELETE SET NULL,

  -- Approval tracking
  approved_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at             timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_drafts_entity_idx
  ON ai_drafts(entity_type, entity_id, status);

CREATE INDEX IF NOT EXISTS ai_drafts_workspace_pending_idx
  ON ai_drafts(workspace_id, created_at DESC)
  WHERE status = 'pending';

-- ── 3. ai_review_queue ───────────────────────────────────────────────────────
-- Lightweight debounce queue. Primary key = (entity_type, entity_id) so
-- multiple rapid saves collapse to a single pending review via UPSERT.

CREATE TABLE IF NOT EXISTS ai_review_queue (
  entity_type     text NOT NULL CHECK (entity_type IN ('contact','deal','project')),
  entity_id       uuid NOT NULL,
  workspace_id    uuid NOT NULL,
  triggered_by    text,   -- 'note_added'|'activity_logged'|'stage_changed'|'email_received'|'voice_note'|'voice_command'
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS ai_review_queue_workspace_idx
  ON ai_review_queue(workspace_id, triggered_at DESC);

-- ── 4. voice_events ──────────────────────────────────────────────────────────
-- Voice I/O event log. Populated by Sage Voice in a future phase.
-- Created now so unified_timeline can include the branch from day one.

CREATE TABLE IF NOT EXISTS voice_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Entity context (nullable — some queries may not have entity context yet)
  entity_type           text CHECK (entity_type IN ('contact','deal','project')),
  entity_id             uuid,
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Raw voice input
  transcript            text,
  audio_url             text,
  duration_ms           integer,
  stt_confidence        numeric(3,2),  -- 0.00 to 1.00

  -- Parsed intent (populated by voice-intent-parser service, future)
  intent_type           text NOT NULL DEFAULT 'unknown',
  intent_payload        jsonb NOT NULL DEFAULT '{}',

  -- Execution lifecycle
  status                text NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received',         -- transcript ready, intent being parsed
      'pending_confirm',  -- needs user confirmation before executing
      'confirmed',        -- user confirmed the intent
      'executed',         -- intent acted on
      'rejected',         -- user cancelled
      'failed'            -- execution error
    )),
  requires_confirmation boolean NOT NULL DEFAULT false,
  confirmed_at          timestamptz,
  executed_at           timestamptz,
  error_message         text,

  -- AI response spoken back to user (TTS input)
  ai_response_text      text,

  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_events_entity_idx
  ON voice_events(entity_type, entity_id, created_at DESC)
  WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS voice_events_workspace_idx
  ON voice_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_events_pending_idx
  ON voice_events(workspace_id, status)
  WHERE status IN ('received', 'pending_confirm');

-- Now that voice_events exists, add the FK from sage_deal_activities
ALTER TABLE sage_deal_activities
  ADD CONSTRAINT sage_deal_activities_voice_event_fk
    FOREIGN KEY (voice_event_id) REFERENCES voice_events(id) ON DELETE SET NULL;

-- And from ai_drafts
ALTER TABLE ai_drafts
  ADD CONSTRAINT ai_drafts_voice_event_fk
    FOREIGN KEY (voice_event_id) REFERENCES voice_events(id) ON DELETE SET NULL;

-- ── 5. AI columns on existing tables ─────────────────────────────────────────

-- sage_deals: lightweight forward fields + momentum (full memory in ai_commercial_memory)
ALTER TABLE sage_deals
  ADD COLUMN IF NOT EXISTS ai_context          text,
  ADD COLUMN IF NOT EXISTS ai_momentum_state   text,
  ADD COLUMN IF NOT EXISTS ai_last_reviewed_at timestamptz;

-- sage_projects: delivery/success-oriented AI summary
ALTER TABLE sage_projects
  ADD COLUMN IF NOT EXISTS ai_summary          text,
  ADD COLUMN IF NOT EXISTS ai_context          text,
  ADD COLUMN IF NOT EXISTS ai_last_reviewed_at timestamptz;

-- sage_contacts: relationship/person summary (ai_summary + ai_analyzed_at already exist)
ALTER TABLE sage_contacts
  ADD COLUMN IF NOT EXISTS ai_context          text,
  ADD COLUMN IF NOT EXISTS ai_last_reviewed_at timestamptz;

-- ── 6. Extend unified_timeline with voice_events branch ──────────────────────
-- Replaces the view created in 00099 to add the voice branch.
-- Only executed events appear in the timeline — partial/failed events excluded.

CREATE OR REPLACE VIEW unified_timeline AS

-- System events: stage changes, assignments, entity creation
SELECT
  id::text                              AS id,
  'sage_activity_log'                   AS source,
  entity_type,
  entity_id::text                       AS entity_id,
  workspace_id,
  event_type,
  'system'                              AS actor_type,
  COALESCE(
    payload->>'summary',
    payload->>'name',
    event_type
  )                                     AS content,
  payload                               AS metadata,
  user_id,
  created_at
FROM sage_activity_log

UNION ALL

-- Structured activities: notes, calls, meetings, tasks (deal / contact / project scoped)
SELECT
  a.id::text,
  'sage_activities',
  CASE
    WHEN a.contact_id IS NOT NULL AND a.deal_id IS NULL THEN 'contact'
    WHEN a.project_id IS NOT NULL AND a.deal_id IS NULL THEN 'project'
    ELSE 'deal'
  END,
  COALESCE(a.deal_id, a.contact_id, a.project_id)::text,
  a.workspace_id,
  a.type,
  CASE a.source_channel
    WHEN 'voice'  THEN 'user'
    WHEN 'system' THEN 'system'
    ELSE 'user'
  END,
  COALESCE(a.body, a.title, a.type),
  jsonb_build_object(
    'title',          a.title,
    'due_at',         a.due_at,
    'completed_at',   a.completed_at,
    'source_channel', a.source_channel
  ),
  a.created_by,
  a.created_at
FROM sage_deal_activities a

UNION ALL

-- Email events: inbound and outbound
SELECT
  e.id::text,
  'sage_emails',
  'contact',
  COALESCE(e.contact_id::text, e.from_address),
  e.workspace_id,
  CASE e.direction WHEN 'inbound' THEN 'inbound_email' ELSE 'outbound_email' END,
  CASE e.direction WHEN 'inbound' THEN 'customer'      ELSE 'user'          END,
  COALESCE(NULLIF(e.subject, ''), LEFT(e.body_text, 120)),
  jsonb_build_object(
    'subject',      e.subject,
    'direction',    e.direction,
    'ai_priority',  e.ai_priority,
    'from_address', e.from_address
  ),
  NULL,
  COALESCE(e.sent_at, e.received_at, e.created_at)
FROM sage_emails e

UNION ALL

-- Bot / SMS conversation messages
SELECT
  m.id::text,
  'messages',
  'conversation',
  m.conversation_id::text,
  m.workspace_id,
  CASE m.role WHEN 'user' THEN 'inbound_bot' WHEN 'assistant' THEN 'outbound_bot' ELSE 'system_bot' END,
  CASE m.role WHEN 'user' THEN 'customer'    WHEN 'assistant' THEN 'ai'           ELSE 'system'     END,
  LEFT(m.content, 500),
  jsonb_build_object(
    'role',                m.role,
    'platform_message_id', m.platform_message_id,
    'model',               m.model
  ),
  NULL,
  m.created_at
FROM messages m
WHERE m.role IN ('user', 'assistant')

UNION ALL

-- Voice events (returns rows once Sage Voice starts writing to this table)
-- Only executed events enter the AI timeline
SELECT
  v.id::text,
  'voice_events',
  v.entity_type,
  v.entity_id::text,
  v.workspace_id,
  v.intent_type,
  'user',
  COALESCE(v.transcript, '[voice event]'),
  jsonb_build_object(
    'intent_type',   v.intent_type,
    'status',        v.status,
    'confidence',    v.stt_confidence,
    'duration_ms',   v.duration_ms,
    'ai_response',   v.ai_response_text
  ),
  v.user_id,
  v.created_at
FROM voice_events v
WHERE v.status = 'executed'
  AND v.entity_id IS NOT NULL;

COMMENT ON VIEW unified_timeline IS
  'Single AI read model across all event sources including voice. '
  'AI review engine reads exclusively from this view. '
  'Voice branch active once Sage Voice writes to voice_events table.';
