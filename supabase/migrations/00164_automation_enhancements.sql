-- ─────────────────────────────────────────────────────────────────────────────
-- Automation Enhancements
-- • Expand automation_type + trigger_type CHECK constraints
-- • automation_trigger_events — inbound trigger queue from all modules
-- • automation_logs — per-execution event log
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Expand automation_type CHECK constraint ────────────────────────────────

ALTER TABLE automation_templates
  DROP CONSTRAINT IF EXISTS automation_templates_automation_type_check;

ALTER TABLE automation_templates
  ADD CONSTRAINT automation_templates_automation_type_check
  CHECK (automation_type IN (
    -- existing
    'warm_introduction', 'qualification', 'reengagement',
    'meeting_conversion', 'nurture', 'custom',
    -- new
    'welcome', 'abandoned_cart', 'abandoned_checkout',
    'product_review', 'wheel_of_fortune', 'ticket_registered',
    'purchase_followup'
  ));

-- ── 2. Expand trigger_type CHECK constraint ───────────────────────────────────

ALTER TABLE automation_templates
  DROP CONSTRAINT IF EXISTS automation_templates_trigger_type_check;

ALTER TABLE automation_templates
  ADD CONSTRAINT automation_templates_trigger_type_check
  CHECK (trigger_type IN (
    -- existing
    'manual', 'prospect_converted', 'form_submit',
    'inbound_email', 'inbound_sms', 'deal_stage_change',
    -- new
    'newsletter_signup', 'contact_created', 'purchase_completed',
    'cart_abandoned', 'checkout_abandoned',
    'ticket_created', 'ticket_resolved',
    'conversation_started', 'conversation_interested',
    'wheel_submitted'
  ));

-- ── 3. automation_trigger_events ─────────────────────────────────────────────
-- Inbound trigger signals from any module (forms, tickets, Shopify, etc.)
-- The automation scheduler reads pending events and spawns executions.

CREATE TABLE IF NOT EXISTS automation_trigger_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,   -- matches trigger_type values above
  source_module   text        NOT NULL,   -- 'forms' | 'tickets' | 'shopify' | 'email' | ...
  contact_id      uuid        REFERENCES sage_contacts(id) ON DELETE SET NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'skipped')),
  error_message   text,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Scheduler polls pending events ordered by created_at
CREATE INDEX IF NOT EXISTS automation_trigger_events_pending_idx
  ON automation_trigger_events (workspace_id, event_type, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS automation_trigger_events_contact_idx
  ON automation_trigger_events (contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

-- ── 4. automation_logs ───────────────────────────────────────────────────────
-- Append-only event log for each execution — used by "View Logs" in UI

CREATE TABLE IF NOT EXISTS automation_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  automation_id   uuid        REFERENCES lead_automations(id) ON DELETE SET NULL,
  execution_id    uuid        REFERENCES automation_executions(id) ON DELETE SET NULL,
  step_id         text,       -- step uuid from template DAG
  event_type      text        NOT NULL,  -- 'step_started' | 'step_completed' | 'step_failed' | 'execution_started' | ...
  message         text        NOT NULL,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_logs_workspace_idx
  ON automation_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS automation_logs_execution_idx
  ON automation_logs (execution_id, created_at DESC)
  WHERE execution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS automation_logs_automation_idx
  ON automation_logs (automation_id, created_at DESC)
  WHERE automation_id IS NOT NULL;
