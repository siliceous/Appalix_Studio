-- ── Email Templates ───────────────────────────────────────────────────────────
-- Stores user-created email templates scoped to a brand profile.
-- Asset state is frozen (snapshot) at save time for reproducibility.
-- HTML preview is regenerated on-demand from content_json + asset_snapshot_json.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id      uuid        NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

  -- Template identity
  name                  text        NOT NULL DEFAULT 'Untitled Template',
  description           text,

  -- Style (maps to preset registry in code)
  template_style        text        NOT NULL DEFAULT 'minimalist'
                                    CHECK (template_style IN (
                                      'minimalist', 'promotional', 'offer',
                                      'newsletter', 'announcement', 'custom'
                                    )),

  -- Manually entered content (editable after creation)
  content_json          jsonb       NOT NULL DEFAULT '{}',
  -- Shape: { subject, headline, preheader, body_text, cta_text, cta_url, footer_text }

  -- Brand snapshot frozen at save time
  asset_snapshot_json   jsonb       NOT NULL DEFAULT '{}',
  -- Shape: { logo_url, colors: { primary, secondary, accent, background, text },
  --          fonts: { heading, body }, company_name, tagline, palette: string[] }

  -- Version of brand profile at save time (for staleness detection)
  brand_version         integer,

  -- Audit
  created_by            uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE INDEX IF NOT EXISTS email_templates_workspace_profile_idx
  ON email_templates (workspace_id, brand_profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS email_templates_workspace_idx
  ON email_templates (workspace_id)
  WHERE deleted_at IS NULL;
