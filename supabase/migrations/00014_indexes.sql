-- ============================================================
-- Migration 00014: Additional Performance Indexes
--
-- Indexes on workspace_members are already in 00003.
-- Indexes co-located with table DDL are already in 00006–00012.
-- This migration adds composite / cross-table indexes useful
-- for common dashboard query patterns.
-- ============================================================

-- ---------------------------------------------------------------
-- Workspaces: plan enforcement queries (billing worker)
-- ---------------------------------------------------------------
create index workspaces_status_plan_idx
  on workspaces(subscription_status, plan);

-- ---------------------------------------------------------------
-- Integrations: look up by platform + status (health check endpoint)
-- ---------------------------------------------------------------
create index integrations_workspace_platform_status_idx
  on integrations(workspace_id, platform, status);

-- ---------------------------------------------------------------
-- Conversations: dashboard listing with filters
-- ---------------------------------------------------------------
create index conversations_workspace_platform_idx
  on conversations(workspace_id, platform);

create index conversations_workspace_status_idx
  on conversations(workspace_id, status);

-- ---------------------------------------------------------------
-- Messages: token / cost analytics aggregation
-- ---------------------------------------------------------------
create index messages_workspace_model_idx
  on messages(workspace_id, model)
  where model is not null;

-- ---------------------------------------------------------------
-- Agent runs: dashboard "recent runs" page
-- ---------------------------------------------------------------
create index agent_runs_workspace_status_started_idx
  on agent_runs(workspace_id, status, started_at desc);

-- ---------------------------------------------------------------
-- Usage events: monthly billing aggregation per workspace
-- Partial index on non-zero-cost rows keeps it lean.
-- ---------------------------------------------------------------
create index usage_events_workspace_cost_idx
  on usage_events(workspace_id, created_at desc)
  where cost_usd > 0;

-- ---------------------------------------------------------------
-- Sources: re-sync worker (find outdated or failed sources)
-- ---------------------------------------------------------------
create index sources_status_synced_idx
  on sources(status, last_synced_at)
  where status in ('outdated', 'failed');
