-- ─────────────────────────────────────────────────────────────────────────────
-- 00139_automation_template_config_json.sql
--
-- Adds config_json column to automation_templates to store the full visual
-- builder graph (nodes + edges). This is the builder's source of truth;
-- the existing `steps` column remains the scheduler's runtime format.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE automation_templates
  ADD COLUMN IF NOT EXISTS config_json jsonb DEFAULT NULL;

COMMENT ON COLUMN automation_templates.config_json IS
  'Visual builder graph: { nodes: BuilderNode[], edges: BuilderEdge[], entryNodeId: string | null }. '
  'NULL for legacy/system templates created before the builder existed.';

NOTIFY pgrst, 'reload schema';
