-- ─────────────────────────────────────────────────────────────────────────────
-- 00137_sage_meetings_google_event.sql
--
-- Links a sage_meetings row back to the Google Calendar event that was
-- auto-created when a meeting was confirmed via the Google Calendar integration.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sage_meetings
  ADD COLUMN IF NOT EXISTS google_event_id  text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_event_url text DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sage_meetings_google_event_id_key
  ON sage_meetings (google_event_id)
  WHERE google_event_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
