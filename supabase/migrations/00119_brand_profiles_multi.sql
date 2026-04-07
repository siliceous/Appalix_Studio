-- ── Multi-brand profiles ────────────────────────────────────────────────────────
-- Allow one workspace brand (tied to onboarding) + unlimited client brands.
-- Adds `name` and `brand_type` columns.
-- Replaces the one-profile-per-workspace unique index with a narrower constraint
-- that only enforces uniqueness for the workspace-level brand.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS name       text,
  ADD COLUMN IF NOT EXISTS brand_type text NOT NULL DEFAULT 'workspace'
    CHECK (brand_type IN ('workspace', 'client'));

-- Backfill all existing rows as workspace brands
UPDATE brand_profiles
  SET brand_type = 'workspace'
  WHERE brand_type IS NULL;

-- Drop the old constraint (one profile per workspace, regardless of type)
DROP INDEX IF EXISTS brand_profiles_workspace_active_idx;

-- New constraint: only one *workspace* brand per workspace may be active
-- Client brands are unlimited
CREATE UNIQUE INDEX brand_profiles_workspace_brand_unique
  ON brand_profiles (workspace_id)
  WHERE brand_type = 'workspace' AND deleted_at IS NULL;

-- Supporting index for sidebar listing (all active profiles for a workspace)
CREATE INDEX IF NOT EXISTS brand_profiles_workspace_list_idx
  ON brand_profiles (workspace_id, brand_type, created_at)
  WHERE deleted_at IS NULL;
