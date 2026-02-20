-- ============================================================
-- Migration 00007: Messages
-- Individual turns within a conversation.
-- workspace_id is denormalised for efficient RLS checks.
-- ============================================================

create table messages (
  id                uuid        primary key default gen_random_uuid(),
  conversation_id   uuid        not null references conversations(id) on delete cascade,
  workspace_id      uuid        not null references workspaces(id) on delete cascade,

  -- 'user'      = human message from any platform
  -- 'assistant' = AI response
  -- 'tool'      = tool call result injected into context
  -- 'system'    = injected system context (not shown to user)
  role              text        not null check (role in ('user', 'assistant', 'tool', 'system')),

  content           text        not null,

  -- Token accounting
  tokens_input      integer,
  tokens_output     integer,

  -- Which model generated this response (null for user messages)
  model             text,

  -- API latency in milliseconds
  response_time_ms  integer,

  -- Error tracking
  is_error          boolean     not null default false,
  error_message     text,

  -- For tool messages: name of the tool that produced this content
  tool_name         text,

  -- Platform metadata (e.g. Slack message ts, FB message id)
  platform_message_id text,

  created_at        timestamptz not null default now()
);

-- Core access pattern: load all messages for a conversation in order
create index messages_conversation_created_idx
  on messages(conversation_id, created_at asc);

-- RLS + usage queries
create index messages_workspace_created_idx
  on messages(workspace_id, created_at desc);
