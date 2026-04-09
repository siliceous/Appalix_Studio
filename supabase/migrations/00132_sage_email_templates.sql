-- ─────────────────────────────────────────────────────────────────────────────
-- 00132_sage_email_templates.sql
--
-- Sage outreach email templates for automation.
--
-- Design decisions:
--   - Separate from email_templates (the visual Email Builder product).
--     Sage templates are plain/lightweight text templates with {{variable}}
--     substitution, not brand-aware visual layouts.
--   - workspace_id nullable: NULL = system template (Appalix built-ins).
--   - category + automation_type together define the lookup precedence:
--       1. Exact match (category + automation_type + workspace_id)
--       2. Category-only match for the workspace
--       3. System template for the category
--       4. style_inferred fallback (Phase 2: uses style_metadata_json)
--   - style_metadata_json is a cached write-time profile used by
--     buildEmailFromInferredStyle() in Phase 2. inferEmailStyleFromTemplates()
--     runs only on template create/update — never live per-send.
--   - subject_template and body_template use {{double_brace}} variable syntax.
--     Known variables: {{first_name}}, {{last_name}}, {{full_name}},
--     {{company_name}}, {{sender_name}}, {{sender_title}}, {{workspace_name}},
--     {{custom_field_1}} ... {{custom_field_5}}
--   - channel: 'email' only in Phase 1; 'sms' body_template is plain text only.
--   - RLS: workspace templates scoped via my_workspace_ids().
--     System templates (workspace_id IS NULL) readable by all authenticated users.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sage_email_templates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        REFERENCES workspaces(id) ON DELETE CASCADE,
  -- NULL = system template

  -- ── Identity ─────────────────────────────────────────────────────────────────
  name                text        NOT NULL,
  description         text,

  -- ── Classification ───────────────────────────────────────────────────────────
  -- category: the engagement stage this template is designed for
  category            text        NOT NULL
                      CHECK (category IN (
                        'initial_outreach', 'follow_up',      'qualification',
                        'meeting_request',  'reengagement',   'handoff',
                        'nurture',          'general'
                      )),
  -- automation_type: optional — if set, template is only a candidate for
  -- executions of this automation type (tighter match = higher precedence)
  automation_type     text
                      CHECK (automation_type IN (
                        'warm_introduction', 'qualification',
                        'reengagement',      'meeting_conversion',
                        'nurture',           'custom'
                      )),

  -- ── Channel ──────────────────────────────────────────────────────────────────
  -- Phase 1: email only. SMS body_template will be plain text (no HTML).
  channel             text        NOT NULL DEFAULT 'email'
                      CHECK (channel IN ('email', 'sms')),

  -- ── Content ──────────────────────────────────────────────────────────────────
  -- subject_template: ignored for SMS
  subject_template    text,
  -- body_template: HTML for email, plain text for SMS
  body_template       text        NOT NULL DEFAULT '',

  -- variables: list of variable names present in subject/body, extracted at save time
  -- Shape: ["first_name", "company_name", ...]
  variables           jsonb       NOT NULL DEFAULT '[]',

  -- ── Style metadata (Phase 2 hook) ────────────────────────────────────────────
  -- Populated by inferEmailStyleFromTemplates() at create/update time.
  -- Used by buildEmailFromInferredStyle() in Phase 2 when no template matches.
  -- Shape: {
  --   tone: 'formal' | 'casual' | 'friendly',
  --   greeting_style: 'Hi' | 'Hello' | 'Dear' | string,
  --   signoff_style: 'Best' | 'Thanks' | 'Regards' | string,
  --   cta_style: 'direct' | 'soft' | 'question',
  --   paragraph_density: 'short' | 'medium' | 'long',
  --   formatting_style: 'plain' | 'light_html' | 'rich_html',
  --   brand_terms: string[]
  -- }
  style_metadata_json jsonb       NOT NULL DEFAULT '{}',

  -- ── Selection mode hint ──────────────────────────────────────────────────────
  -- Stored here so callers can see how the template was resolved.
  -- 'exact' | 'category' | 'style_inferred' | 'fallback'
  selection_mode      text
                      CHECK (selection_mode IN ('exact', 'category', 'style_inferred', 'fallback')),

  -- ── Lifecycle ────────────────────────────────────────────────────────────────
  is_active           boolean     NOT NULL DEFAULT true,
  is_system           boolean     NOT NULL DEFAULT false,

  -- ── Audit ────────────────────────────────────────────────────────────────────
  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary lookup: workspace × category × automation_type (exact match first)
CREATE INDEX IF NOT EXISTS sage_email_templates_lookup_exact_idx
  ON sage_email_templates (workspace_id, category, automation_type, channel)
  WHERE is_active = true AND automation_type IS NOT NULL;

-- Category-only match (no automation_type specified)
CREATE INDEX IF NOT EXISTS sage_email_templates_lookup_category_idx
  ON sage_email_templates (workspace_id, category, channel)
  WHERE is_active = true AND automation_type IS NULL;

-- System templates (workspace_id IS NULL)
CREATE INDEX IF NOT EXISTS sage_email_templates_system_idx
  ON sage_email_templates (category, channel)
  WHERE workspace_id IS NULL AND is_active = true;

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_sage_email_template_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sage_email_templates_updated_at ON sage_email_templates;
CREATE TRIGGER sage_email_templates_updated_at
  BEFORE UPDATE ON sage_email_templates
  FOR EACH ROW EXECUTE FUNCTION touch_sage_email_template_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE sage_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sage_email_templates_select" ON sage_email_templates;
DROP POLICY IF EXISTS "sage_email_templates_insert" ON sage_email_templates;
DROP POLICY IF EXISTS "sage_email_templates_update" ON sage_email_templates;
DROP POLICY IF EXISTS "sage_email_templates_delete" ON sage_email_templates;

CREATE POLICY "sage_email_templates_select"
  ON sage_email_templates FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id IN (SELECT public.my_workspace_ids())
  );

CREATE POLICY "sage_email_templates_insert"
  ON sage_email_templates FOR INSERT
  WITH CHECK (
    workspace_id IS NOT NULL
    AND workspace_id IN (SELECT public.my_workspace_ids())
  );

CREATE POLICY "sage_email_templates_update"
  ON sage_email_templates FOR UPDATE
  USING (
    workspace_id IS NOT NULL
    AND workspace_id IN (SELECT public.my_workspace_ids())
  );

CREATE POLICY "sage_email_templates_delete"
  ON sage_email_templates FOR DELETE
  USING (
    workspace_id IS NOT NULL
    AND workspace_id IN (SELECT public.my_workspace_ids())
  );

-- ── Optional: usage tracking ─────────────────────────────────────────────────
-- Records every time a sage_email_template is used to send a message.
-- Lightweight append-only log; used for analytics + improving precedence logic.

CREATE TABLE IF NOT EXISTS sage_email_template_usage (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id     uuid        REFERENCES sage_email_templates(id) ON DELETE SET NULL,
  execution_id    uuid,
  -- No FK to automation_executions — usage log is append-only; dangling refs are acceptable.
  contact_id      uuid        REFERENCES sage_contacts(id) ON DELETE SET NULL,

  -- How the template was resolved
  selection_mode  text        NOT NULL
                  CHECK (selection_mode IN ('exact', 'category', 'style_inferred', 'fallback')),

  -- Channel used
  channel         text        NOT NULL DEFAULT 'email'
                  CHECK (channel IN ('email', 'sms')),

  -- Outcome
  -- 'sent' | 'bounced' | 'replied' | 'opened' | 'clicked'
  outcome         text
                  CHECK (outcome IN ('sent', 'bounced', 'replied', 'opened', 'clicked')),
  outcome_at      timestamptz,

  used_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sage_email_template_usage_template_idx
  ON sage_email_template_usage (template_id, used_at DESC)
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sage_email_template_usage_workspace_idx
  ON sage_email_template_usage (workspace_id, used_at DESC);

ALTER TABLE sage_email_template_usage DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
