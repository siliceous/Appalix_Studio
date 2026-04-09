-- ─────────────────────────────────────────────────────────────────────────────
-- 00130_automation_templates.sql
--
-- Reusable automation workflow templates (step DAGs).
--
-- Design decisions:
--   - workspace_id is nullable: NULL = system/built-in template visible to all.
--     Workspace templates override system templates of the same automation_type.
--   - steps is a JSONB array of AutomationStepDefinition objects:
--       { id, type, label, config, next_step_id, on_fail_step_id }
--     The DAG is walked by the execution engine; no separate step rows in Phase 1.
--   - entry_step_id names the first step in the DAG (must exist in steps[].id).
--   - version is bumped on update so executions can record which version ran.
--   - RLS enabled; workspace templates are scoped via my_workspace_ids().
--     System templates (workspace_id IS NULL) are readable by all authenticated users.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_templates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        REFERENCES workspaces(id) ON DELETE CASCADE,
  -- NULL = system template

  -- ── Identity ─────────────────────────────────────────────────────────────────
  name                text        NOT NULL,
  description         text,

  -- ── Classification ───────────────────────────────────────────────────────────
  -- automation_type maps to lead_automations.goal (same vocabulary)
  automation_type     text        NOT NULL
                      CHECK (automation_type IN (
                        'warm_introduction', 'qualification',
                        'reengagement',      'meeting_conversion',
                        'nurture',           'custom'
                      )),
  -- trigger_type: what event starts an execution from this template
  trigger_type        text        NOT NULL DEFAULT 'manual'
                      CHECK (trigger_type IN (
                        'manual', 'prospect_converted', 'form_submit',
                        'inbound_email', 'inbound_sms', 'deal_stage_change'
                      )),
  -- primary channel this template is designed for
  primary_channel     text        NOT NULL DEFAULT 'email'
                      CHECK (primary_channel IN ('email', 'sms', 'call', 'multi')),

  -- ── DAG definition ───────────────────────────────────────────────────────────
  -- steps: array of step nodes
  -- Shape: [{ id, type, label, config, next_step_id, on_fail_step_id, delay_hours }]
  steps               jsonb       NOT NULL DEFAULT '[]',
  entry_step_id       text,
  -- Must match a step id in steps[]; nullable only for empty templates

  -- ── Lifecycle ────────────────────────────────────────────────────────────────
  is_active           boolean     NOT NULL DEFAULT true,
  is_system           boolean     NOT NULL DEFAULT false,
  -- is_system = true for built-in templates shipped by Appalix (workspace_id IS NULL)

  version             integer     NOT NULL DEFAULT 1,
  -- Bumped on every update so executions can record which version ran

  -- ── Audit ────────────────────────────────────────────────────────────────────
  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Workspace template list (most common query: list active templates for a workspace)
CREATE INDEX IF NOT EXISTS automation_templates_workspace_type_idx
  ON automation_templates (workspace_id, automation_type)
  WHERE is_active = true;

-- System templates lookup (workspace_id IS NULL)
CREATE INDEX IF NOT EXISTS automation_templates_system_idx
  ON automation_templates (automation_type)
  WHERE workspace_id IS NULL AND is_active = true;

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_automation_template_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version    = OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_templates_updated_at ON automation_templates;
CREATE TRIGGER automation_templates_updated_at
  BEFORE UPDATE ON automation_templates
  FOR EACH ROW EXECUTE FUNCTION touch_automation_template_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_templates_select" ON automation_templates;
DROP POLICY IF EXISTS "automation_templates_insert" ON automation_templates;
DROP POLICY IF EXISTS "automation_templates_update" ON automation_templates;
DROP POLICY IF EXISTS "automation_templates_delete" ON automation_templates;

-- Workspace members can read their workspace's templates + all system templates
CREATE POLICY "automation_templates_select"
  ON automation_templates FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id IN (SELECT public.my_workspace_ids())
  );

-- Only workspace admins/managers can write workspace templates
-- (system templates are managed via migration only)
CREATE POLICY "automation_templates_insert"
  ON automation_templates FOR INSERT
  WITH CHECK (
    workspace_id IS NOT NULL
    AND workspace_id IN (SELECT public.my_workspace_ids())
  );

CREATE POLICY "automation_templates_update"
  ON automation_templates FOR UPDATE
  USING (
    workspace_id IS NOT NULL
    AND workspace_id IN (SELECT public.my_workspace_ids())
  );

CREATE POLICY "automation_templates_delete"
  ON automation_templates FOR DELETE
  USING (
    workspace_id IS NOT NULL
    AND workspace_id IN (SELECT public.my_workspace_ids())
  );

NOTIFY pgrst, 'reload schema';
