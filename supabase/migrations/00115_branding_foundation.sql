-- ── Branding Foundation ───────────────────────────────────────────────────────
-- brand_profiles  — versioned brand identity (single source of truth)
-- brand_assets    — uploaded/generated brand files (logos, images, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. brand_profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_profiles (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Identity
  company_name           text,
  tagline                text,
  website_url            text,
  footer_text            text,
  social_links_json      jsonb       NOT NULL DEFAULT '{}',
  contact_details_json   jsonb       NOT NULL DEFAULT '{}',

  -- Colors
  color_primary          text,
  color_secondary        text,
  color_accent           text,
  color_background       text,
  color_text             text,

  -- Typography
  font_heading           text,
  font_body              text,

  -- Brand voice (structured enums + free-text escape hatches)
  -- Tone: how the brand sounds
  brand_tone             text        CHECK (brand_tone IN (
                                       'professional', 'friendly', 'premium',
                                       'direct', 'playful', 'authoritative', 'conversational'
                                     )),
  -- Style: how content is structured
  brand_style            text        CHECK (brand_style IN (
                                       'minimal', 'corporate', 'bold', 'modern',
                                       'storytelling', 'data-driven'
                                     )),
  -- CTA approach
  cta_style              text        CHECK (cta_style IN ('soft', 'consultative', 'assertive')),
  -- Free-text: audience description, sample copy, words to avoid
  brand_voice_notes      text,

  -- Versioning
  -- Incremented on every meaningful profile save.
  -- All downstream snapshots store this value so staleness is computable
  -- without diffing jsonb blobs.
  brand_version          integer     NOT NULL DEFAULT 1,

  -- Completeness score (deterministic integer 0–6):
  --   +1  company_name is not null/empty
  --   +1  color_primary is not null/empty
  --   +1  brand_tone is not null
  --   +1  footer_text or contact_details_json is non-empty
  --   +1  font_heading or font_body is set
  --   +1  at least one approved logo asset exists (updated by brandAssetService)
  -- Maintained by brandProfileService.recalculateConfidenceScore()
  brand_confidence_score integer     NOT NULL DEFAULT 0,

  -- Audit
  updated_by             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz
);

-- One active profile per workspace (enforced at app level; index supports fast lookup)
CREATE UNIQUE INDEX IF NOT EXISTS brand_profiles_workspace_active_idx
  ON brand_profiles (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS brand_profiles_workspace_idx
  ON brand_profiles (workspace_id)
  WHERE deleted_at IS NULL;

-- ── 2. brand_assets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_assets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_profile_id    uuid        NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

  -- Classification
  asset_type          text        NOT NULL CHECK (asset_type IN (
                                    'logo', 'favicon', 'image', 'icon', 'other'
                                  )),
  asset_role          text        NOT NULL CHECK (asset_role IN (
                                    'primary_logo', 'secondary_logo', 'logo_mark',
                                    'favicon', 'hero_image', 'background_image',
                                    'pattern', 'general'
                                  )),

  -- Source: 'website_scan' intentionally omitted — not in Phase 1 scope.
  -- Add it in a later migration to avoid biasing implementation toward
  -- an unbuilt feature.
  source              text        NOT NULL DEFAULT 'upload'
                                  CHECK (source IN ('upload', 'manual_url', 'generated')),

  -- File storage
  file_url            text        NOT NULL,
  thumbnail_url       text,
  storage_path        text,       -- internal Supabase Storage path (for deletion/replace)
  file_name           text,
  file_size           integer,    -- bytes
  mime_type           text,
  width               integer,
  height              integer,

  -- Metadata
  dominant_color      text,
  alt_text            text,
  label               text,       -- human-readable name: "Primary Logo Dark"

  -- Status
  is_approved         boolean     NOT NULL DEFAULT false,
  is_primary          boolean     NOT NULL DEFAULT false,  -- one primary per role (enforced in app)
  is_archived         boolean     NOT NULL DEFAULT false,
  is_system_generated boolean     NOT NULL DEFAULT false,

  -- Audit
  updated_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

-- Fast lookups by workspace + role (primary path in brandSnapshotService)
CREATE INDEX IF NOT EXISTS brand_assets_workspace_role_idx
  ON brand_assets (workspace_id, asset_role)
  WHERE deleted_at IS NULL AND is_archived = false;

-- Fast lookup: approved primary assets per profile (used to compute confidence score)
CREATE INDEX IF NOT EXISTS brand_assets_profile_approved_primary_idx
  ON brand_assets (brand_profile_id, asset_role, is_approved, is_primary)
  WHERE deleted_at IS NULL AND is_archived = false AND is_approved = true AND is_primary = true;
