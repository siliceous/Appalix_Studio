-- ============================================================
-- Migration 00006: Conversations
-- Platform-agnostic conversation thread.
-- Tracks which platform & external thread it maps to so the
-- API can route replies back to the correct channel.
-- ============================================================

create table conversations (
  id                    uuid        primary key default gen_random_uuid(),
  workspace_id          uuid        not null references workspaces(id) on delete cascade,
  bot_id                uuid        references bots(id) on delete set null,
  integration_id        uuid        references integrations(id) on delete set null,

  -- Which platform this conversation came from
  platform              text        check (platform in (
                                      'slack',
                                      'google_chat',
                                      'facebook_messenger',
                                      'whatsapp',
                                      'wordpress',
                                      'web_widget',
                                      'custom_api'
                                    )),

  -- External identifiers used to route replies back
  -- e.g. Slack channel ID, FB PSID, WhatsApp phone number
  platform_thread_id    text,
  platform_user_id      text,

  -- Human-readable title (set after first exchange or by AI summarisation)
  title                 text,
  -- AI-generated conversation summary (updated periodically)
  summary               text,
  -- Sentiment classification applied by the API
  sentiment             text        check (sentiment in ('positive', 'neutral', 'negative')),

  status                text        not null default 'active'
                                    check (status in ('active', 'closed', 'archived')),

  message_count         integer     not null default 0,
  last_activity_at      timestamptz not null default now(),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at_column();

-- Key lookup: resume an existing thread from a platform event
create index conversations_platform_thread_idx
  on conversations(workspace_id, platform, platform_thread_id)
  where platform_thread_id is not null;

create index conversations_workspace_activity_idx
  on conversations(workspace_id, last_activity_at desc);

create index conversations_bot_id_idx
  on conversations(bot_id);

create index conversations_integration_id_idx
  on conversations(integration_id);
