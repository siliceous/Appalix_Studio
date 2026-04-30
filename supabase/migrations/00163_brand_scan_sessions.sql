-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Scan Sessions + Asset Candidates
-- Tracks website scan history and holds unsaved scan results separately from
-- saved brand_assets.  Candidates only move into brand_assets when the user
-- explicitly saves them.
-- ─────────────────────────────────────────────────────────────────────────────

-- One record per website scan, tied to a brand profile
CREATE TABLE IF NOT EXISTS brand_scan_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id)     ON DELETE CASCADE,
  brand_profile_id uuid        NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  website_url      text        NOT NULL,
  status           text        NOT NULL DEFAULT 'completed'
                               CHECK (status IN ('pending','running','completed','failed')),
  is_ecommerce     boolean     NOT NULL DEFAULT false,
  new_asset_count  integer     NOT NULL DEFAULT 0,
  -- Stores fonts detected, full image list for "collect more", ecommerce signals
  scan_summary     jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS brand_scan_sessions_profile_idx
  ON brand_scan_sessions(brand_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS brand_scan_sessions_workspace_idx
  ON brand_scan_sessions(workspace_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Unsaved scan results — never pollute brand_assets with unconfirmed data
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_asset_candidates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id)          ON DELETE CASCADE,
  brand_profile_id uuid        NOT NULL REFERENCES brand_profiles(id)      ON DELETE CASCADE,
  scan_session_id  uuid        NOT NULL REFERENCES brand_scan_sessions(id) ON DELETE CASCADE,
  asset_type       text        NOT NULL
                               CHECK (asset_type IN ('logo','favicon','image','product_image','color')),
  asset_role       text,
  title            text,
  -- source URL for images/logos/favicons; hex string for colors
  value            text,
  source_url       text,
  source_page_url  text,
  metadata         jsonb       NOT NULL DEFAULT '{}',
  hash             text,
  status           text        NOT NULL DEFAULT 'candidate'
                               CHECK (status IN ('candidate','saved','ignored')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_asset_candidates_session_type_idx
  ON brand_asset_candidates(scan_session_id, asset_type, status);

CREATE INDEX IF NOT EXISTS brand_asset_candidates_profile_status_idx
  ON brand_asset_candidates(brand_profile_id, status, asset_type, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend brand_assets with deduplication fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS hash             text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS source_url       text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS source_page_url  text;

CREATE INDEX IF NOT EXISTS brand_assets_hash_profile_idx
  ON brand_assets(brand_profile_id, hash)
  WHERE hash IS NOT NULL AND deleted_at IS NULL;
