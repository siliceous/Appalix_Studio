-- ── Brand Output Tables ───────────────────────────────────────────────────────
-- brand_email_templates  — generated/edited email templates
-- brand_forms            — generated/edited forms
-- brand_pages            — generated/edited website pages
--
-- All three tables:
--   • store a frozen brand_snapshot jsonb at creation/generation time
--   • store brand_version (integer) alongside the snapshot
--   • use soft deletes (deleted_at)
--   • carry usage_context text[] for filtering and reuse
--   • carry is_system_generated to distinguish AI vs user-created
--   • carry updated_by for audit trail
--
-- brand_snapshot jsonb shape (snapshotSchemaVersion = 1):
-- {
--   snapshotSchemaVersion: 1,
--   brandVersion: <int>,
--   companyName, tagline, websiteUrl,
--   colors: { primary, secondary, accent, background, text },
--   typography: { fontHeading, fontBody },
--   voice: { tone, style, ctaStyle, notes },
--   assets: { primaryLogoUrl, secondaryLogoUrl, faviconUrl },
--   identity: { footerText, socialLinks, contactDetails }
-- }
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. brand_email_templates ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_email_templates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id    uuid        REFERENCES brand_profiles(id) ON DELETE SET NULL,

  name                text        NOT NULL,
  description         text,
  template_type       text,       -- welcome | newsletter | promotional | transactional | follow_up

  -- Brand snapshot: frozen at generation time. Email templates are static
  -- after generation — brand changes must NOT silently alter stored templates.
  -- User must explicitly re-generate to pick up new brand.
  brand_snapshot      jsonb       NOT NULL,
  brand_version       integer     NOT NULL,

  -- Content
  -- html_content: the deliverable (what gets sent)
  -- plain_text_content: required for deliverability and accessibility
  -- block_structure: editable source blocks; re-render from these + new snapshot
  html_content        text        NOT NULL,
  plain_text_content  text        NOT NULL,
  block_structure     jsonb       NOT NULL DEFAULT '[]',

  -- Classification
  usage_context       text[]      NOT NULL DEFAULT '{}',
  is_system_generated boolean     NOT NULL DEFAULT true,
  status              text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'approved', 'archived')),

  -- Audit
  updated_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS brand_email_templates_workspace_idx
  ON brand_email_templates (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS brand_email_templates_profile_idx
  ON brand_email_templates (brand_profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS brand_email_templates_usage_context_idx
  ON brand_email_templates USING GIN (usage_context)
  WHERE deleted_at IS NULL;

-- ── 2. brand_forms ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_forms (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id                uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id            uuid        REFERENCES brand_profiles(id) ON DELETE SET NULL,

  name                        text        NOT NULL,
  form_type                   text,       -- lead_capture | booking | enquiry | download

  -- Brand snapshot: frozen at generation time (hybrid model).
  -- brand_version_at_last_sync lets the UI show "brand updated N versions ago".
  -- last_synced_from_brand_at records when user last triggered a brand sync.
  brand_snapshot              jsonb       NOT NULL,
  brand_version               integer     NOT NULL,
  last_synced_from_brand_at   timestamptz,
  brand_version_at_last_sync  integer,

  -- Embed configuration
  embed_type                  text        NOT NULL DEFAULT 'inline'
                                          CHECK (embed_type IN ('inline', 'popup', 'exit_intent', 'embedded')),

  -- Form definition
  -- config_json.fields: [ { id, name, label, type, required, options[] } ]
  -- config_json.cta: string
  -- config_json.style: FormStyle (see below)
  -- config_json.settings: trigger rules, close behaviour, etc.
  --
  -- FormStyle shape (locked for MVP):
  -- {
  --   backgroundColor, textColor, buttonColor, buttonTextColor,
  --   borderColor, borderRadius, fontFamily,
  --   spacing: 'compact' | 'comfortable' | 'spacious',
  --   shadowStyle: 'none' | 'soft' | 'medium'
  -- }
  config_json                 jsonb       NOT NULL DEFAULT '{}',

  -- Classification
  usage_context               text[]      NOT NULL DEFAULT '{}',
  is_system_generated         boolean     NOT NULL DEFAULT true,
  status                      text        NOT NULL DEFAULT 'draft'
                                          CHECK (status IN ('draft', 'published', 'archived')),

  -- Phase 3 integration point:
  -- source_form_id will be added to the leads intake table to link
  -- form submissions → lead creation → Approach popup flow.
  -- Not implemented in this migration batch.

  -- Audit
  updated_by                  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz
);

CREATE INDEX IF NOT EXISTS brand_forms_workspace_idx
  ON brand_forms (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS brand_forms_profile_idx
  ON brand_forms (brand_profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS brand_forms_usage_context_idx
  ON brand_forms USING GIN (usage_context)
  WHERE deleted_at IS NULL;

-- ── 3. brand_pages ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_pages (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id                uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id            uuid        REFERENCES brand_profiles(id) ON DELETE SET NULL,

  name                        text        NOT NULL,
  slug                        text,
  page_type                   text,       -- lead_generation | booking | local_seo | campaign | offer

  -- Brand snapshot: frozen at generation time (hybrid model).
  brand_snapshot              jsonb       NOT NULL,
  brand_version               integer     NOT NULL,
  last_synced_from_brand_at   timestamptz,
  brand_version_at_last_sync  integer,

  -- Page content
  -- blocks: ordered array of block objects
  -- MVP block types: hero | features | testimonial | cta_band | footer
  -- Each block: { type, content: Record<string, any> }
  blocks                      jsonb       NOT NULL DEFAULT '[]',

  -- SEO
  -- seo_json shape:
  -- { title, metaDescription, h1, keywords: string[], schema: object }
  seo_json                    jsonb       NOT NULL DEFAULT '{}',

  -- Classification
  usage_context               text[]      NOT NULL DEFAULT '{}',
  is_system_generated         boolean     NOT NULL DEFAULT true,
  status                      text        NOT NULL DEFAULT 'draft'
                                          CHECK (status IN ('draft', 'published', 'archived')),

  -- Audit
  updated_by                  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz
);

CREATE INDEX IF NOT EXISTS brand_pages_workspace_idx
  ON brand_pages (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS brand_pages_profile_idx
  ON brand_pages (brand_profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS brand_pages_usage_context_idx
  ON brand_pages USING GIN (usage_context)
  WHERE deleted_at IS NULL;
