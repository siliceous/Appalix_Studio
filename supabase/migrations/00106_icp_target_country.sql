-- ─────────────────────────────────────────────────────────────────────────────
-- 00106_icp_target_country.sql
-- Adds target_country to workspace_icp_profiles so searches are country-specific
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workspace_icp_profiles
  ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT '';
