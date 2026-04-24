-- ─────────────────────────────────────────────────────────────────────────────
-- 00150_phone_platform.sql
-- Phase 4 Voice: add 'phone' as a first-class conversation platform and link
-- call_sessions back to the conversations table so call transcripts surface in
-- the CRM inbox.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add 'phone' to conversations.platform CHECK constraint
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_platform_check;

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
    'sms',
    'phone'
  ));

-- 2. Link call_sessions → conversations (nullable; populated after call ends)
ALTER TABLE call_sessions
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation_id
  ON call_sessions(conversation_id)
  WHERE conversation_id IS NOT NULL;
