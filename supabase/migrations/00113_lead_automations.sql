-- ─────────────────────────────────────────────────────────────────────────────
-- 00113_lead_automations.sql
--
-- Lead automation state machine.
--
-- Design decisions:
--   - No separate automation_steps table in Phase 1: timeline is derived from
--     unified_timeline (message_events, sage_activity_log, sage_emails).
--   - momentum is stored and updated by the service layer, not computed live,
--     to avoid expensive per-row joins on the list query.
--   - qualification and ai_strategy are JSONB snapshots taken at creation time
--     from the Approach layer (or manual creation). They are not live-updated.
--   - primary_channel / fallback_channel can be nulled by the service when a
--     channel is proven non-viable (bounce, no number, etc.).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_automations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- ── Entity linkage ──────────────────────────────────────────────────────────
  -- contact_id is the primary anchor. deal_id is optional — set when the
  -- automation converts into a deal-level engagement.
  contact_id          uuid        REFERENCES sage_contacts(id) ON DELETE SET NULL,
  deal_id             uuid        REFERENCES sage_deals(id)    ON DELETE SET NULL,

  -- ── Origin ──────────────────────────────────────────────────────────────────
  -- Where did this lead originate before entering automation?
  source_type         text        NOT NULL
                      CHECK (source_type IN (
                        'email', 'sms', 'bot', 'form', 'ticket', 'prospect', 'manual'
                      )),
  -- Nullable UUID pointing at the originating row (sage_emails.id, etc.)
  source_ref_id       uuid,

  -- ── Goal and channels ───────────────────────────────────────────────────────
  goal                text        NOT NULL
                      CHECK (goal IN (
                        'warm_introduction', 'qualification',
                        'reengagement',      'meeting_conversion'
                      )),
  primary_channel     text        NOT NULL
                      CHECK (primary_channel IN ('email', 'sms', 'call')),
  -- Nulled by service when primary channel is confirmed non-viable
  fallback_channel    text
                      CHECK (fallback_channel IN ('email', 'sms', 'call')),

  -- ── State machine ───────────────────────────────────────────────────────────
  -- status: operational state of the automation runner
  -- stage:  where this lead is in the engagement journey
  status              text        NOT NULL DEFAULT 'running'
                      CHECK (status IN (
                        'running', 'waiting', 'engaged',
                        'escalated', 'paused', 'completed', 'stopped'
                      )),
  stage               text        NOT NULL DEFAULT 'initial_outreach'
                      CHECK (stage IN (
                        'initial_outreach', 'follow_up',   'qualification',
                        'engagement_detected', 'handoff_ready', 'nurture', 'closed'
                      )),

  -- ── Priority and momentum ───────────────────────────────────────────────────
  -- priority: commercial importance, drives Needs Attention sorting
  -- momentum: engagement velocity, computed by service from message_events:
  --   reply in last 48h  → 'increasing'
  --   engagement in 5d   → 'flat'
  --   no engagement      → 'declining'
  priority            text        NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('high', 'medium', 'low')),
  momentum            text        NOT NULL DEFAULT 'flat'
                      CHECK (momentum IN ('increasing', 'flat', 'declining')),

  -- ── Next action ─────────────────────────────────────────────────────────────
  next_action_type    text
                      CHECK (next_action_type IN (
                        'send_email', 'send_sms', 'call', 'wait', 'handoff'
                      )),
  next_action_at      timestamptz,

  -- ── AI context (snapshot from Approach) ─────────────────────────────────────
  -- current_summary: human-readable Sage interpretation, updated on AI review
  -- current_reasoning: internal AI reasoning (not shown in UI)
  -- ai_strategy: full EngagementStrategy object (JSONB)
  -- qualification: full ApproachQualification object (JSONB, internal only)
  current_summary     text,
  current_reasoning   text,
  ai_strategy         jsonb       NOT NULL DEFAULT '{}',
  qualification       jsonb       NOT NULL DEFAULT '{}',

  -- ── Engagement tracking ──────────────────────────────────────────────────────
  -- last_activity_at:  any event (sent, replied, bounced, etc.)
  -- last_engagement_at: positive signal only (reply, click, meeting request)
  last_activity_at    timestamptz,
  last_engagement_at  timestamptz,
  step_count          integer     NOT NULL DEFAULT 0,

  -- ── Lifecycle timestamps ─────────────────────────────────────────────────────
  paused_at           timestamptz,
  paused_reason       text,
  completed_at        timestamptz,
  stopped_at          timestamptz,
  stopped_reason      text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary list query: workspace + active statuses, recency ordered
CREATE INDEX IF NOT EXISTS lead_automations_workspace_status_idx
  ON lead_automations (workspace_id, status, updated_at DESC);

-- Needs Attention query: escalated/engaged, priority sort
CREATE INDEX IF NOT EXISTS lead_automations_attention_idx
  ON lead_automations (workspace_id, priority, last_engagement_at DESC)
  WHERE status IN ('engaged', 'escalated');

-- Contact linkage (update on bounce signal, deal promotion)
CREATE INDEX IF NOT EXISTS lead_automations_contact_idx
  ON lead_automations (contact_id)
  WHERE contact_id IS NOT NULL;

-- Deal linkage
CREATE INDEX IF NOT EXISTS lead_automations_deal_idx
  ON lead_automations (deal_id)
  WHERE deal_id IS NOT NULL;

-- Next action scheduler (future cron/worker: find all due actions)
CREATE INDEX IF NOT EXISTS lead_automations_next_action_idx
  ON lead_automations (workspace_id, next_action_at)
  WHERE status = 'running' AND next_action_at IS NOT NULL;

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_lead_automation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lead_automations_updated_at
  BEFORE UPDATE ON lead_automations
  FOR EACH ROW EXECUTE FUNCTION touch_lead_automation_updated_at();

-- ── RLS (disabled for service-role queries, matching platform pattern) ─────────
ALTER TABLE lead_automations DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
