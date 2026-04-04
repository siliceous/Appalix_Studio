-- ─────────────────────────────────────────────────────────────────────────────
-- 00107_icp_state_postcode.sql
-- Adds optional target_state + target_postcode to workspace_icp_profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workspace_icp_profiles
  ADD COLUMN IF NOT EXISTS target_state    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_postcode text NOT NULL DEFAULT '';
