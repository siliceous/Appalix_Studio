-- ============================================================
-- Migration 00012: Usage Events
-- Append-only ledger of every billable action.
-- Drives monthly invoicing, plan enforcement, and analytics.
-- ============================================================

create table usage_events (
  id                uuid        primary key default gen_random_uuid(),
  workspace_id      uuid        not null references workspaces(id) on delete cascade,

  event_type        text        not null check (event_type in (
                                  'message',      -- one user/assistant turn
                                  'agent_run',    -- completed agentic workflow
                                  'tool_call',    -- individual tool invocation
                                  'rag_query',    -- vector similarity search
                                  'embedding'     -- document chunk embedded
                                )),

  -- Model used (null for non-model events like embeddings via OpenAI)
  model             text,

  tokens_input      integer     not null default 0,
  tokens_output     integer     not null default 0,

  -- Pre-calculated cost in USD with 6 decimal places
  -- (calculated at write time using current model pricing)
  cost_usd          numeric(12, 6) not null default 0,

  -- Back-references for attribution (nullable; depends on event type)
  conversation_id   uuid        references conversations(id)  on delete set null,
  message_id        uuid        references messages(id)        on delete set null,
  agent_run_id      uuid        references agent_runs(id)      on delete set null,

  -- Extra context: platform, tool name, source id, etc.
  metadata          jsonb       not null default '{}',

  created_at        timestamptz not null default now()
);

-- Billing aggregation: sum cost by workspace per month
create index usage_events_workspace_month_idx
  on usage_events(workspace_id, created_at desc);

-- Analytics by event type
create index usage_events_type_idx
  on usage_events(event_type);

-- ---------------------------------------------------------------
-- Materialised daily rollup view (optional but recommended)
-- Refresh nightly via pg_cron or Supabase Edge Function:
--   select cron.schedule('refresh_usage_daily', '0 2 * * *',
--     'refresh materialized view concurrently usage_daily');
-- ---------------------------------------------------------------
create materialized view usage_daily as
select
  workspace_id,
  event_type,
  date_trunc('day', created_at) as day,
  count(*)                      as event_count,
  sum(tokens_input)             as total_tokens_input,
  sum(tokens_output)            as total_tokens_output,
  sum(cost_usd)                 as total_cost_usd
from usage_events
group by workspace_id, event_type, date_trunc('day', created_at);

create unique index usage_daily_unique_idx
  on usage_daily(workspace_id, event_type, day);
