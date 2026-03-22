-- Push token storage
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  workspace_id uuid NOT NULL,
  token        text NOT NULL,
  platform     text NOT NULL DEFAULT 'expo',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own tokens" ON user_push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Track when the 15-min pre-notification was sent for activities
ALTER TABLE sage_deal_activities
  ADD COLUMN IF NOT EXISTS notif_sent_at timestamptz;

-- Track when the 15-min pre-notification was sent for reminders
ALTER TABLE sage_reminders
  ADD COLUMN IF NOT EXISTS notif_sent_at timestamptz;
