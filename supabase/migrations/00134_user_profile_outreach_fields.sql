-- ─────────────────────────────────────────────────────────────────────────────
-- 00134_user_profile_outreach_fields.sql
--
-- Adds per-user outreach fields used as template variables in Sage automation.
--
--   job_title     → {{sender_title}} in email templates
--   calendar_link → {{calendar_link}} in meeting-request templates (personal link)
--                   e.g. Calendly, HubSpot meetings, Cal.com
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS job_title    text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS calendar_link text DEFAULT NULL;

COMMENT ON COLUMN user_profiles.job_title     IS 'Used as {{sender_title}} in Sage outreach email templates';
COMMENT ON COLUMN user_profiles.calendar_link IS 'Personal booking link (Calendly, Cal.com, etc.) — used as {{calendar_link}}';
