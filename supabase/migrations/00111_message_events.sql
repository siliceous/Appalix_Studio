-- ─────────────────────────────────────────────────────────────────────────────
-- 00111_message_events.sql
-- Communication reliability + delivery tracking layer.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. message_events — per-message delivery event log
CREATE TABLE IF NOT EXISTS message_events (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel              text        NOT NULL CHECK (channel IN ('email', 'sms')),
  -- internal record references (one or the other depending on channel)
  internal_message_id  uuid,       -- sage_emails.id  (email) | sms_usage_log.id (sms)
  external_message_id  text,       -- Resend email ID | Twilio MessageSid
  -- entity linkage (all nullable — events can exist before full CRM linkage)
  conversation_id      uuid        REFERENCES conversations(id)   ON DELETE SET NULL,
  contact_id           uuid        REFERENCES sage_contacts(id)   ON DELETE SET NULL,
  deal_id              uuid        REFERENCES sage_deals(id)      ON DELETE SET NULL,
  -- event
  event_type           text        NOT NULL CHECK (event_type IN (
                          'email_sent', 'email_delivered', 'email_opened',
                          'email_clicked', 'email_replied', 'email_bounced',
                          'email_failed', 'email_complained', 'email_unsubscribed',
                          'sms_queued', 'sms_sent', 'sms_delivered',
                          'sms_failed', 'sms_replied'
                        )),
  provider             text        NOT NULL,  -- 'smtp_gmail' | 'smtp_microsoft' | 'resend' | 'twilio' | 'imap'
  provider_payload     jsonb,                 -- raw provider data for diagnostics
  event_at             timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate events for the same provider message + event type
CREATE UNIQUE INDEX IF NOT EXISTS message_events_external_type_uidx
  ON message_events (external_message_id, event_type)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS message_events_internal_idx
  ON message_events (internal_message_id)
  WHERE internal_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS message_events_workspace_idx
  ON message_events (workspace_id, event_at DESC);

CREATE INDEX IF NOT EXISTS message_events_contact_idx
  ON message_events (contact_id)
  WHERE contact_id IS NOT NULL;

-- 2. Add delivery tracking columns to sage_emails
ALTER TABLE sage_emails
  ADD COLUMN IF NOT EXISTS delivery_status     text        DEFAULT 'sent'
    CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed', 'complained')),
  ADD COLUMN IF NOT EXISTS provider_message_id text,       -- provider-specific ID for webhook correlation
  ADD COLUMN IF NOT EXISTS bounced_at          timestamptz,
  ADD COLUMN IF NOT EXISTS failed_reason       text,
  ADD COLUMN IF NOT EXISTS opened_at           timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at       timestamptz;

CREATE INDEX IF NOT EXISTS sage_emails_provider_message_id_idx
  ON sage_emails (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- 3. Add deliverability tracking to sage_contacts
ALTER TABLE sage_contacts
  ADD COLUMN IF NOT EXISTS email_deliverability  text DEFAULT 'ok'
    CHECK (email_deliverability IN ('ok', 'bounced', 'complained', 'invalid')),
  ADD COLUMN IF NOT EXISTS email_bounced_at      timestamptz,
  ADD COLUMN IF NOT EXISTS email_bounce_reason   text;

-- Grants
GRANT ALL ON message_events TO service_role;

NOTIFY pgrst, 'reload schema';
