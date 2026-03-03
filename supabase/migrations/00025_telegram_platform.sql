-- ============================================================
-- Migration 00025: Add Telegram as a supported integration platform
-- ============================================================

-- Drop the old CHECK constraint and recreate with 'telegram' added
alter table integrations
  drop constraint if exists integrations_platform_check;

alter table integrations
  add constraint integrations_platform_check check (platform in (
    'slack',
    'google_chat',
    'facebook_messenger',
    'whatsapp',
    'wordpress',
    'web_widget',
    'custom_api',
    'telegram'
  ));

-- Document the Telegram config schema (enforced at app layer):
-- telegram: { bot_token, webhook_secret_token }
--   bot_token            — the token from @BotFather (e.g. 7412345678:AAF...)
--   webhook_secret_token — random secret set via setWebhook to verify requests
