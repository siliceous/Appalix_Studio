-- Add created_by to sage_reminders so reminders can be filtered per-user
-- without relying on deal owner_id (which may differ from who set the reminder)

ALTER TABLE sage_reminders
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sage_reminders_created_by_idx
  ON sage_reminders(created_by)
  WHERE is_sent = false;
