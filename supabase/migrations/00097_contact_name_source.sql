-- ============================================================
-- Migration 00097: Contact name_source flag
-- Tracks whether a contact name was auto-suggested from an
-- internal phone lookup (pending user confirmation) vs.
-- a verified/user-provided name.
-- ============================================================

ALTER TABLE sage_contacts
  ADD COLUMN IF NOT EXISTS name_source text
  CHECK (name_source IN ('sms_auto'));

-- Index: quickly find contacts pending name confirmation
CREATE INDEX IF NOT EXISTS idx_sage_contacts_name_source
  ON sage_contacts (workspace_id, name_source)
  WHERE name_source IS NOT NULL;
