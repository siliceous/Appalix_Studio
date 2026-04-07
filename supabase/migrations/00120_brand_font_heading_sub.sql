-- Add sub-heading font field (H2/H3) to brand profiles
ALTER TABLE brand_profiles
  ADD COLUMN IF NOT EXISTS font_heading_sub text;
