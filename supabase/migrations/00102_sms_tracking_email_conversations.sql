-- ─────────────────────────────────────────────────────────────────────────────
-- 00102_sms_tracking_email_conversations.sql
-- Track manual SMS follow-ups sent to email senders and bot conversation contacts.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── sage_emails ───────────────────────────────────────────────────────────────
ALTER TABLE sage_emails
  ADD COLUMN IF NOT EXISTS auto_sms_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS auto_sms_to       text;

-- ── conversations ─────────────────────────────────────────────────────────────
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS auto_sms_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS auto_sms_to       text;
