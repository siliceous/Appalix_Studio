-- ─────────────────────────────────────────────────────────────────────────────
-- 00136_google_calendar_integration.sql
--
-- Supports storing Google Calendar OAuth tokens per user in sage_integrations
-- (provider = 'google_calendar').
--
-- Token shape stored in config jsonb:
--   {
--     "google_email":   "user@gmail.com",
--     "access_token":   "ya29...",
--     "refresh_token":  "1//...",
--     "expires_at":     "2026-04-08T13:00:00Z"
--   }
--
-- No new table needed — sage_integrations already has a unique constraint on
-- (workspace_id, user_id, provider).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sage_integrations_gcal_user
  ON sage_integrations (user_id, provider)
  WHERE provider = 'google_calendar';

NOTIFY pgrst, 'reload schema';
