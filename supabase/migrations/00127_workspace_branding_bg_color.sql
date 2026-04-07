-- Add background_color to workspace_branding
-- Allows per-workspace dashboard background colour (e.g. light blue for Happy theme)
ALTER TABLE workspace_branding
  ADD COLUMN IF NOT EXISTS background_color text DEFAULT NULL;
