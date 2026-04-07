-- Add font_family and font_size to workspace_branding
ALTER TABLE workspace_branding
  ADD COLUMN IF NOT EXISTS font_family text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS font_size   integer DEFAULT NULL;
