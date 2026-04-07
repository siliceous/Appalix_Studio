-- Add card_color to workspace_branding
ALTER TABLE workspace_branding
  ADD COLUMN IF NOT EXISTS card_color text DEFAULT NULL;
