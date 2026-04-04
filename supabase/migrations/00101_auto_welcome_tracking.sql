-- ─────────────────────────────────────────────────────────────────────────────
-- 00101_auto_welcome_tracking.sql
-- Track automated welcome / acknowledgement messages sent to leads and ticket submitters.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── sage_form_submissions ─────────────────────────────────────────────────────
ALTER TABLE sage_form_submissions
  ADD COLUMN IF NOT EXISTS auto_email_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS auto_email_to       text,
  ADD COLUMN IF NOT EXISTS auto_sms_sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS auto_sms_to         text;

-- ── sage_tickets ──────────────────────────────────────────────────────────────
ALTER TABLE sage_tickets
  ADD COLUMN IF NOT EXISTS auto_email_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS auto_email_to       text,
  ADD COLUMN IF NOT EXISTS auto_sms_sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS auto_sms_to         text;
