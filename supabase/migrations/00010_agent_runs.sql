-- ============================================================
-- Migration 00010: Agent Runs
-- Root trace record for each multi-step agent execution.
-- Every tool call, RAG lookup, and model call within one
-- agent turn links back to a single agent_run row.
-- ============================================================

create table agent_runs (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  conversation_id uuid        references conversations(id) on delete set null,
  bot_id          uuid        references bots(id) on delete set null,

  status          text        not null default 'running'
                              check (status in (
                                'running',
                                'completed',
                                'failed',
                                'cancelled'
                              )),

  -- Raw input that triggered this run (user message JSON)
  input           jsonb,
  -- Final output from the agent
  output          jsonb,

  -- Number of agentic steps (model calls + tool calls combined)
  steps           integer     not null default 0,

  -- Aggregated token consumption for the entire run
  tokens_input    integer     not null default 0,
  tokens_output   integer     not null default 0,

  -- Wall-clock duration
  duration_ms     integer,

  error_message   text,

  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index agent_runs_workspace_id_idx     on agent_runs(workspace_id);
create index agent_runs_conversation_id_idx  on agent_runs(conversation_id);
create index agent_runs_status_idx           on agent_runs(status);
create index agent_runs_started_at_idx       on agent_runs(started_at desc);
