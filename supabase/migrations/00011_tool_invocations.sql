-- ============================================================
-- Migration 00011: Tool Invocations
-- Records every individual tool call made within an agent run.
-- Supports debugging, replay, and cost attribution.
-- ============================================================

create table tool_invocations (
  id              uuid        primary key default gen_random_uuid(),
  agent_run_id    uuid        not null references agent_runs(id) on delete cascade,
  workspace_id    uuid        not null references workspaces(id) on delete cascade,

  -- Tool name matches the function name declared in the Claude tools array
  -- e.g. 'rag_search', 'http_request', 'send_email', 'create_ticket'
  tool_name       text        not null,

  -- Exact input passed to the tool (from Claude's tool_use block)
  input           jsonb       not null default '{}',
  -- Raw output returned to Claude (tool_result block)
  output          jsonb,

  status          text        not null default 'pending'
                              check (status in (
                                'pending',
                                'running',
                                'completed',
                                'failed'
                              )),

  -- Step index within the agent run (0-based)
  step_index      integer     not null default 0,

  duration_ms     integer,
  error_message   text,

  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index tool_invocations_agent_run_id_idx  on tool_invocations(agent_run_id);
create index tool_invocations_workspace_id_idx  on tool_invocations(workspace_id);
create index tool_invocations_tool_name_idx     on tool_invocations(tool_name);
