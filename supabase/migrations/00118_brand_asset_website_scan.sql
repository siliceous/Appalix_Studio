-- ── Add website_scan to brand_assets.source ──────────────────────────────────
-- The website scanner (Phase 1b) is now in scope.
-- Adds 'website_scan' as a valid source value for brand_assets.
--
-- PostgreSQL does not allow modifying a CHECK constraint in-place.
-- Drop the old constraint and add the new one with the expanded set.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE brand_assets
  DROP CONSTRAINT IF EXISTS brand_assets_source_check;

ALTER TABLE brand_assets
  ADD CONSTRAINT brand_assets_source_check
  CHECK (source IN ('upload', 'manual_url', 'generated', 'website_scan'));
