-- ============================================================
-- Migration 00013: Row Level Security Policies
--
-- SECURITY MODEL:
--   anon role  → zero access to all tables (public webhooks use service_role)
--   authenticated role → can only see rows in their own workspaces
--   service_role → bypasses RLS (used by the API backend only)
--
-- Helper functions live in the PUBLIC schema (auth schema is
-- restricted in Supabase managed projects).
-- ============================================================

-- ---------------------------------------------------------------
-- Helper: returns workspace IDs for the currently authenticated user
-- ---------------------------------------------------------------
create or replace function public.my_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id
  from   workspace_members
  where  user_id = auth.uid()
$$;

-- Helper: true if current user is owner or admin of a workspace
create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where  workspace_id = ws_id
    and    user_id      = auth.uid()
    and    role in ('owner', 'admin')
  )
$$;


-- ============================================================
-- WORKSPACES
-- ============================================================
alter table workspaces enable row level security;

create policy "workspaces: members can select"
  on workspaces for select
  using (id in (select public.my_workspace_ids()));

create policy "workspaces: admins can update"
  on workspaces for update
  using (public.is_workspace_admin(id));


-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
alter table workspace_members enable row level security;

create policy "workspace_members: members can select"
  on workspace_members for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "workspace_members: admins can insert"
  on workspace_members for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members: admins can update"
  on workspace_members for update
  using (public.is_workspace_admin(workspace_id));

create policy "workspace_members: admins can delete"
  on workspace_members for delete
  using (public.is_workspace_admin(workspace_id));


-- ============================================================
-- INTEGRATIONS
-- ============================================================
alter table integrations enable row level security;

create policy "integrations: members can select"
  on integrations for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "integrations: admins can insert"
  on integrations for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "integrations: admins can update"
  on integrations for update
  using (public.is_workspace_admin(workspace_id));

create policy "integrations: admins can delete"
  on integrations for delete
  using (public.is_workspace_admin(workspace_id));


-- ============================================================
-- BOTS
-- ============================================================
alter table bots enable row level security;

create policy "bots: members can select"
  on bots for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "bots: admins can insert"
  on bots for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "bots: admins can update"
  on bots for update
  using (public.is_workspace_admin(workspace_id));

create policy "bots: admins can delete"
  on bots for delete
  using (public.is_workspace_admin(workspace_id));


-- ============================================================
-- CONVERSATIONS
-- ============================================================
alter table conversations enable row level security;

create policy "conversations: members can select"
  on conversations for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "conversations: members can update"
  on conversations for update
  using (workspace_id in (select public.my_workspace_ids()));

create policy "conversations: admins can delete"
  on conversations for delete
  using (public.is_workspace_admin(workspace_id));


-- ============================================================
-- MESSAGES
-- ============================================================
alter table messages enable row level security;

create policy "messages: members can select"
  on messages for select
  using (workspace_id in (select public.my_workspace_ids()));


-- ============================================================
-- SOURCES
-- ============================================================
alter table sources enable row level security;

create policy "sources: members can select"
  on sources for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "sources: admins can insert"
  on sources for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "sources: admins can update"
  on sources for update
  using (public.is_workspace_admin(workspace_id));

create policy "sources: admins can delete"
  on sources for delete
  using (public.is_workspace_admin(workspace_id));


-- ============================================================
-- CHUNKS
-- ============================================================
alter table chunks enable row level security;

create policy "chunks: members can select"
  on chunks for select
  using (workspace_id in (select public.my_workspace_ids()));


-- ============================================================
-- AGENT RUNS
-- ============================================================
alter table agent_runs enable row level security;

create policy "agent_runs: members can select"
  on agent_runs for select
  using (workspace_id in (select public.my_workspace_ids()));


-- ============================================================
-- TOOL INVOCATIONS
-- ============================================================
alter table tool_invocations enable row level security;

create policy "tool_invocations: members can select"
  on tool_invocations for select
  using (workspace_id in (select public.my_workspace_ids()));


-- ============================================================
-- USAGE EVENTS
-- ============================================================
alter table usage_events enable row level security;

create policy "usage_events: members can select"
  on usage_events for select
  using (workspace_id in (select public.my_workspace_ids()));
