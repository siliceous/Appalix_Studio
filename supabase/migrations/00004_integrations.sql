-- ============================================================
-- Migration 00004: Integrations (Platform Connectors)
-- Each integration connects a workspace bot to an external
-- messaging platform: Slack, Google Chat, FB Messenger, etc.
-- The bot_id FK is added after bots table is created (00005).
-- ============================================================

create table integrations (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  -- bot_id FK added in migration 00005 after bots table exists
  bot_id        uuid,

  platform      text        not null check (platform in (
                              'slack',
                              'google_chat',
                              'facebook_messenger',
                              'whatsapp',
                              'wordpress',
                              'web_widget',
                              'custom_api'
                            )),

  -- Human-readable label e.g. "Acme Support Slack"
  name          text        not null,

  status        text        not null default 'active'
                            check (status in ('active', 'inactive', 'error')),

  -- Platform-specific credentials and settings.
  -- Sensitive fields (tokens, secrets) must be encrypted at the
  -- application layer before writing; never store plaintext tokens.
  -- Schema per platform (enforced at app layer, not DB):
  --   slack:               { bot_token, signing_secret, app_id, team_id }
  --   google_chat:         { service_account_json, space_name }
  --   facebook_messenger:  { page_access_token, verify_token, app_secret }
  --   whatsapp:            { phone_number_id, access_token, verify_token }
  --   wordpress:           { site_url, api_key }
  --   web_widget:          { allowed_origins[], theme }
  --   custom_api:          { api_key, allowed_ips[] }
  config        jsonb       not null default '{}',

  -- HMAC secret for verifying incoming webhook payloads
  webhook_secret text,

  -- Last error message if status = 'error'
  last_error    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger integrations_updated_at
  before update on integrations
  for each row execute function update_updated_at_column();

create index integrations_workspace_id_idx on integrations(workspace_id);
create index integrations_platform_idx     on integrations(platform);
