-- ─────────────────────────────────────────────────────────────────────────────
-- 00104_icp_market_segment.sql
-- Adds market_segment to workspace_icp_profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workspace_icp_profiles
  ADD COLUMN IF NOT EXISTS market_segment text NOT NULL DEFAULT 'both'
    CHECK (market_segment IN ('b2b', 'b2c', 'both'));
