-- ── Contact opt-out columns ──────────────────────────────────────────────────
-- Tracks email and SMS opt-out state at the contact level.
-- SMS opt-out (sms_opt_out) already exists from migration 00096.
-- This adds email opt-out and a timestamp for both channels.

ALTER TABLE sage_contacts
  ADD COLUMN IF NOT EXISTS email_opt_out      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_opted_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_opted_out_at   timestamptz;

-- Index: quickly find opted-out contacts before sending
CREATE INDEX IF NOT EXISTS idx_sage_contacts_email_opt_out
  ON sage_contacts (workspace_id, email_opt_out)
  WHERE email_opt_out = true;

CREATE INDEX IF NOT EXISTS idx_sage_contacts_sms_opt_out
  ON sage_contacts (workspace_id, sms_opt_out)
  WHERE sms_opt_out = true;
