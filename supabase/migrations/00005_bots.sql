-- ============================================================
-- Migration 00005: Bots
-- A bot is an AI agent configuration scoped to a workspace.
-- Multiple integrations can share one bot.
-- ============================================================

create table bots (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,

  name            text        not null,
  description     text,

  -- Claude model config
  model           text        not null default 'claude-sonnet-4-6',
  system_prompt   text,
  max_tokens      integer     not null default 1024
                              check (max_tokens between 1 and 32000),
  temperature     numeric(3,2) not null default 0.70
                              check (temperature between 0.00 and 1.00),

  -- Feature flags
  enable_rag      boolean     not null default false,
  enable_tools    boolean     not null default false,
  -- Whether to maintain conversation history across turns
  enable_memory   boolean     not null default true,

  -- Fallback message when the bot cannot answer
  fallback_message text       default 'I''m sorry, I don''t have enough information to answer that. Please contact our support team.',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger bots_updated_at
  before update on bots
  for each row execute function update_updated_at_column();

create index bots_workspace_id_idx on bots(workspace_id);

-- Now wire the FK from integrations → bots that we deferred
alter table integrations
  add constraint integrations_bot_id_fkey
  foreign key (bot_id) references bots(id) on delete set null;
