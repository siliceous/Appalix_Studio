-- Add 'website_scan' as a valid source for brand assets
ALTER TABLE brand_assets
  DROP CONSTRAINT IF EXISTS brand_assets_source_check;

ALTER TABLE brand_assets
  ADD CONSTRAINT brand_assets_source_check
    CHECK (source IN ('upload', 'manual_url', 'generated', 'website_scan'));
