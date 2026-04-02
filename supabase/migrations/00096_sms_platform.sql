-- ============================================================
-- SMS as a first-class channel
-- ============================================================

-- 1. Add 'sms' to integrations.platform CHECK constraint
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS integrations_platform_check;

ALTER TABLE integrations
  ADD CONSTRAINT integrations_platform_check CHECK (platform IN (
    'slack',
    'google_chat',
    'facebook_messenger',
    'whatsapp',
    'instagram',
    'wordpress',
    'web_widget',
    'custom_api',
    'telegram',
    'shopify',
    'sms'
  ));

-- 2. Add 'sms' to conversations.platform CHECK constraint
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_platform_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_platform_check CHECK (platform IN (
    'slack',
    'google_chat',
    'facebook_messenger',
    'whatsapp',
    'instagram',
    'wordpress',
    'web_widget',
    'custom_api',
    'telegram',
    'shopify',
    'sms'
  ));

-- 3. SMS opt-out flag on sage_contacts
ALTER TABLE sage_contacts
  ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false;

-- 4. SMS usage log for cost tracking and rate limiting
CREATE TABLE IF NOT EXISTS sms_usage_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id  uuid REFERENCES integrations(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  message_sid     text NOT NULL,
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number     text NOT NULL,
  to_number       text NOT NULL,
  segments        integer NOT NULL DEFAULT 1,
  status          text,
  cost_usd        numeric(10, 6),
  error_code      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Unique on message_sid for idempotent inserts
CREATE UNIQUE INDEX IF NOT EXISTS sms_usage_log_message_sid_key
  ON sms_usage_log (message_sid);

-- Fast workspace + direction lookups (rate limiting, dashboards)
CREATE INDEX IF NOT EXISTS sms_usage_log_workspace_direction_idx
  ON sms_usage_log (workspace_id, direction, created_at DESC);
