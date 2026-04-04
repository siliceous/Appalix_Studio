-- ─────────────────────────────────────────────────────────────────────────────
-- 00099_ai_guidance_foundation.sql
-- Phase 0: structural changes required before AI guidance feature work.
--
-- 1. Extend sage_deal_activities to be universal (contact + project scoped)
-- 2. Add source_channel column (text vs voice vs system)
-- 3. Create unified_timeline view (AI reads only from this view)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extend sage_deal_activities ──────────────────────────────────────────

-- Make deal_id nullable so activities can be contact-only or project-only
ALTER TABLE sage_deal_activities
  ALTER COLUMN deal_id DROP NOT NULL;

-- Add optional entity FKs
ALTER TABLE sage_deal_activities
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES sage_contacts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES sage_projects(id) ON DELETE CASCADE;

-- Add source channel tracking (voice-readiness)
ALTER TABLE sage_deal_activities
  ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'text'
    CHECK (source_channel IN ('text', 'voice', 'system')),
  ADD COLUMN IF NOT EXISTS voice_event_id uuid;  -- FK added later when voice_events table exists

-- Enforce: at least one entity anchor must be present
ALTER TABLE sage_deal_activities
  ADD CONSTRAINT sage_deal_activities_entity_anchor
    CHECK (
      deal_id IS NOT NULL OR
      contact_id IS NOT NULL OR
      project_id IS NOT NULL
    );

-- Indexes for contact-level and project-level queries
CREATE INDEX IF NOT EXISTS sage_activities_contact_idx
  ON sage_deal_activities(contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sage_activities_project_idx
  ON sage_deal_activities(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

-- ── 2. unified_timeline view ─────────────────────────────────────────────────
-- Single read interface for AI review engine.
-- AI must never query raw tables directly — always through this view.
-- Voice branch included but returns 0 rows until voice_events table is created.

CREATE OR REPLACE VIEW unified_timeline AS

-- System events: stage changes, assignments, entity creation, note_added flags
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

-- Structured activities: notes, calls, meetings, tasks
-- Covers deal-scoped, contact-scoped, and project-scoped activities
SELECT
  a.id::text,
  'sage_activities',
  CASE
    WHEN a.contact_id IS NOT NULL AND a.deal_id IS NULL THEN 'contact'
    WHEN a.project_id IS NOT NULL AND a.deal_id IS NULL THEN 'project'
    ELSE 'deal'
  END                                   AS entity_type,
  COALESCE(a.deal_id, a.contact_id, a.project_id)::text AS entity_id,
  a.workspace_id,
  a.type                                AS event_type,
  CASE a.source_channel
    WHEN 'voice'  THEN 'user'
    WHEN 'system' THEN 'system'
    ELSE 'user'
  END                                   AS actor_type,
  COALESCE(a.body, a.title, a.type)    AS content,
  jsonb_build_object(
    'title',        a.title,
    'due_at',       a.due_at,
    'completed_at', a.completed_at,
    'source_channel', a.source_channel
  )                                     AS metadata,
  a.created_by                          AS user_id,
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
  CASE e.direction
    WHEN 'inbound'  THEN 'inbound_email'
    ELSE                 'outbound_email'
  END,
  CASE e.direction
    WHEN 'inbound'  THEN 'customer'
    ELSE                 'user'
  END,
  COALESCE(
    NULLIF(e.subject, ''),
    LEFT(e.body_text, 120)
  ),
  jsonb_build_object(
    'subject',    e.subject,
    'direction',  e.direction,
    'ai_priority', e.ai_priority,
    'from_address', e.from_address
  ),
  NULL,
  COALESCE(e.sent_at, e.received_at, e.created_at)
FROM sage_emails e

UNION ALL

-- Bot / SMS conversation messages (role = user → inbound, assistant → outbound)
SELECT
  m.id::text,
  'messages',
  'conversation',
  m.conversation_id::text,
  m.workspace_id,
  CASE m.role
    WHEN 'user'      THEN 'inbound_bot'
    WHEN 'assistant' THEN 'outbound_bot'
    ELSE                  'system_bot'
  END,
  CASE m.role
    WHEN 'user'      THEN 'customer'
    WHEN 'assistant' THEN 'ai'
    ELSE                  'system'
  END,
  LEFT(m.content, 500),
  jsonb_build_object(
    'role',               m.role,
    'platform_message_id', m.platform_message_id,
    'model',              m.model
  ),
  NULL,
  m.created_at
FROM messages m
WHERE m.role IN ('user', 'assistant');

-- Note: voice_events branch will be added in migration 00100 once the table exists.
-- The view is structured so adding it requires only an additional UNION ALL block.

COMMENT ON VIEW unified_timeline IS
  'Single AI read model across all event sources. '
  'AI review engine reads exclusively from this view. '
  'Never modify raw tables from AI services — write to source tables and let this view reflect them.';
