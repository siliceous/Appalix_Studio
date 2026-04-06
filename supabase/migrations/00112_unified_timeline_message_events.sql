-- ─────────────────────────────────────────────────────────────────────────────
-- 00112_unified_timeline_message_events.sql
-- Add message_events as the 6th UNION ALL branch in unified_timeline.
--
-- Delivery events (email_sent, email_bounced, sms_delivered, etc.) surface in
-- the AI timeline so Sage can reason about communication reliability without
-- reading the raw delivery log tables directly.
--
-- actor_type rules:
--   'customer' → reply events (email_replied, sms_replied)
--   'system'   → everything else (sent, delivered, failed, bounced, …)
-- ─────────────────────────────────────────────────────────────────────────────

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
  COALESCE(e.received_at, e.created_at)
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
  AND v.entity_id IS NOT NULL

UNION ALL

-- Delivery events: email and SMS delivery status from message_events.
-- Surfaces bounces, failures, and confirmations so Sage can reason about
-- communication reliability. Excludes rows with no CRM entity linkage
-- (workspace-only events have no useful timeline anchor).
SELECT
  me.id::text,
  'message_events',
  CASE
    WHEN me.deal_id         IS NOT NULL THEN 'deal'
    WHEN me.contact_id      IS NOT NULL THEN 'contact'
    WHEN me.conversation_id IS NOT NULL THEN 'conversation'
    ELSE 'workspace'
  END,
  COALESCE(
    me.deal_id::text,
    me.contact_id::text,
    me.conversation_id::text
  ),
  me.workspace_id,
  me.event_type,
  CASE me.event_type
    WHEN 'email_replied' THEN 'customer'
    WHEN 'sms_replied'   THEN 'customer'
    ELSE 'system'
  END,
  CASE me.event_type
    WHEN 'email_sent'          THEN 'Email sent'
    WHEN 'email_delivered'     THEN 'Email delivered'
    WHEN 'email_opened'        THEN 'Email opened'
    WHEN 'email_clicked'       THEN 'Email link clicked'
    WHEN 'email_replied'       THEN 'Email replied'
    WHEN 'email_bounced'       THEN 'Email bounced'
    WHEN 'email_failed'        THEN 'Email delivery failed'
    WHEN 'email_complained'    THEN 'Email marked as spam'
    WHEN 'email_unsubscribed'  THEN 'Unsubscribed from emails'
    WHEN 'sms_queued'          THEN 'SMS queued'
    WHEN 'sms_sent'            THEN 'SMS sent'
    WHEN 'sms_delivered'       THEN 'SMS delivered'
    WHEN 'sms_failed'          THEN 'SMS delivery failed'
    WHEN 'sms_replied'         THEN 'SMS replied'
    ELSE me.event_type
  END,
  jsonb_build_object(
    'provider',             me.provider,
    'channel',              me.channel,
    'external_message_id',  me.external_message_id,
    'internal_message_id',  me.internal_message_id,
    'provider_payload',     me.provider_payload
  ),
  NULL,   -- delivery events are system-generated, no user actor
  me.event_at
FROM message_events me
WHERE COALESCE(me.deal_id, me.contact_id, me.conversation_id) IS NOT NULL;

COMMENT ON VIEW unified_timeline IS
  'Single AI read model across all event sources including voice and delivery tracking. '
  'AI review engine reads exclusively from this view. '
  'Voice branch active once Sage Voice writes to voice_events table. '
  'message_events branch surfaces email/SMS delivery status (bounces, failures, confirmations).';

NOTIFY pgrst, 'reload schema';
