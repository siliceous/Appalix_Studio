-- Store the full discovered color palette (up to 10 colors) on a brand profile
ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS brand_palette_json jsonb;
