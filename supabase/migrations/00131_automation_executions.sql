-- ─────────────────────────────────────────────────────────────────────────────
-- 00131_automation_executions.sql
--
-- Template-bound execution runtime: automation_executions + automation_step_executions.
--
-- Design decisions:
--   - automation_executions is the execution instance when a template is run.
--     It is a sibling to lead_automations (which is the simpler per-contact state
--     machine). The two are linkable via lead_automation_id but decoupled so each
--     can evolve independently.
--   - automation_step_executions records outcome per step, enabling replay,
--     audit trail, and partial resume after failure.
--   - next_step_at is the scheduler hook: a cron/worker queries
--       WHERE status = 'running' AND next_step_at <= now()
--   - output_data and error_data are free-form JSONB — the engine writes whatever
--     is relevant per step type (email send receipt, SMS SID, call log, etc.).
--   - RLS disabled: all queries go through service role (admin client).
--     Manual workspace_id filter is applied in the service layer.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── automation_executions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_executions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- ── Template linkage ─────────────────────────────────────────────────────────
  template_id           uuid        REFERENCES automation_templates(id) ON DELETE SET NULL,
  template_version      integer,
  -- Snapshot of template version at execution start — for audit / drift detection

  -- ── Entity linkage ───────────────────────────────────────────────────────────
  contact_id            uuid        REFERENCES sage_contacts(id) ON DELETE SET NULL,
  deal_id               uuid        REFERENCES sage_deals(id)    ON DELETE SET NULL,
  -- Optional back-reference to the simpler state-machine row
  lead_automation_id    uuid        REFERENCES lead_automations(id) ON DELETE SET NULL,

  -- ── Trigger context ──────────────────────────────────────────────────────────
  -- How this execution was started (mirrors automation_templates.trigger_type)
  trigger_type          text        NOT NULL DEFAULT 'manual'
                        CHECK (trigger_type IN (
                          'manual', 'prospect_converted', 'form_submit',
                          'inbound_email', 'inbound_sms', 'deal_stage_change'
                        )),
  -- Free-form trigger payload (form submission data, inbound email id, etc.)
  trigger_data          jsonb       NOT NULL DEFAULT '{}',

  -- ── State machine ────────────────────────────────────────────────────────────
  status                text        NOT NULL DEFAULT 'running'
                        CHECK (status IN (
                          'running', 'waiting', 'paused', 'completed', 'stopped', 'failed'
                        )),

  -- ── Step cursor ──────────────────────────────────────────────────────────────
  -- current_step_id: the step currently being executed or next to execute
  -- next_step_at:    when the scheduler should advance to current_step_id
  --   (null = advance immediately / awaiting external event)
  current_step_id       text,
  next_step_at          timestamptz,
  step_count            integer     NOT NULL DEFAULT 0,

  -- ── Pause / stop ─────────────────────────────────────────────────────────────
  paused_at             timestamptz,
  paused_reason         text,
  stopped_at            timestamptz,
  stopped_reason        text,
  failed_at             timestamptz,
  failure_reason        text,

  -- ── Outcome ──────────────────────────────────────────────────────────────────
  completed_at          timestamptz,
  -- Final context snapshot written by the last step / engine resolver
  output_summary        jsonb       NOT NULL DEFAULT '{}',

  -- ── Audit ────────────────────────────────────────────────────────────────────
  created_by            uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Scheduler: due executions
CREATE INDEX IF NOT EXISTS automation_executions_scheduler_idx
  ON automation_executions (workspace_id, next_step_at)
  WHERE status = 'running' AND next_step_at IS NOT NULL;

-- List query: active executions per workspace
CREATE INDEX IF NOT EXISTS automation_executions_workspace_status_idx
  ON automation_executions (workspace_id, status, updated_at DESC);

-- Contact linkage
CREATE INDEX IF NOT EXISTS automation_executions_contact_idx
  ON automation_executions (contact_id)
  WHERE contact_id IS NOT NULL;

-- Template linkage (e.g. "which executions use this template?")
CREATE INDEX IF NOT EXISTS automation_executions_template_idx
  ON automation_executions (template_id)
  WHERE template_id IS NOT NULL;

-- lead_automations back-reference
CREATE INDEX IF NOT EXISTS automation_executions_lead_automation_idx
  ON automation_executions (lead_automation_id)
  WHERE lead_automation_id IS NOT NULL;

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_automation_execution_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_executions_updated_at ON automation_executions;
CREATE TRIGGER automation_executions_updated_at
  BEFORE UPDATE ON automation_executions
  FOR EACH ROW EXECUTE FUNCTION touch_automation_execution_updated_at();

-- ── RLS (disabled — service role only) ───────────────────────────────────────
ALTER TABLE automation_executions DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- automation_step_executions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_step_executions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  execution_id     uuid        NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,

  -- ── Step identity ────────────────────────────────────────────────────────────
  -- step_id is the id from the template steps[] JSONB array
  step_id          text        NOT NULL,
  step_type        text        NOT NULL
                   CHECK (step_type IN (
                     'send_email', 'send_sms', 'call',
                     'wait',       'condition', 'handoff',
                     'update_contact', 'create_deal', 'webhook'
                   )),
  step_label       text,

  -- ── Execution state ──────────────────────────────────────────────────────────
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN (
                     'pending', 'running', 'completed', 'failed', 'skipped'
                   )),

  -- ── Timing ───────────────────────────────────────────────────────────────────
  started_at       timestamptz,
  completed_at     timestamptz,
  -- For wait steps: when the wait expires and execution should resume
  resume_at        timestamptz,

  -- ── I/O ──────────────────────────────────────────────────────────────────────
  -- input_data: resolved variables passed into this step (e.g. rendered subject/body)
  input_data       jsonb       NOT NULL DEFAULT '{}',
  -- output_data: step result (message SID, email message-id, API response, etc.)
  output_data      jsonb       NOT NULL DEFAULT '{}',
  -- error_data: structured error if status = 'failed'
  error_data       jsonb,

  -- ── Attempt tracking ─────────────────────────────────────────────────────────
  attempt          integer     NOT NULL DEFAULT 1,
  max_attempts     integer     NOT NULL DEFAULT 3,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Per-execution step list (most common query)
CREATE INDEX IF NOT EXISTS automation_step_executions_exec_idx
  ON automation_step_executions (execution_id, created_at ASC);

-- Resume scheduler: waiting steps due to resume
CREATE INDEX IF NOT EXISTS automation_step_executions_resume_idx
  ON automation_step_executions (workspace_id, resume_at)
  WHERE status = 'running' AND resume_at IS NOT NULL;

-- Failed steps needing retry
CREATE INDEX IF NOT EXISTS automation_step_executions_retry_idx
  ON automation_step_executions (workspace_id, updated_at DESC)
  WHERE status = 'failed';

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_automation_step_execution_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_step_executions_updated_at ON automation_step_executions;
CREATE TRIGGER automation_step_executions_updated_at
  BEFORE UPDATE ON automation_step_executions
  FOR EACH ROW EXECUTE FUNCTION touch_automation_step_execution_updated_at();

-- ── RLS (disabled — service role only) ───────────────────────────────────────
ALTER TABLE automation_step_executions DISABLE ROW LEVEL SECURITY;

-- ── Helper RPC: atomic step_count increment ───────────────────────────────────
-- Called by advanceAutomationExecution() to avoid read-modify-write races.
CREATE OR REPLACE FUNCTION increment_execution_step_count(p_execution_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE automation_executions
     SET step_count = step_count + 1
   WHERE id = p_execution_id;
$$;

NOTIFY pgrst, 'reload schema';
