-- Activity log: tracks key user actions across the workspace
create table if not exists activity_log (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  action         text not null,          -- e.g. 'created', 'updated', 'deleted', 'assigned', 'stage_changed'
  entity_type    text not null,          -- e.g. 'deal', 'contact', 'lead', 'conversation', 'ticket', 'bot'
  entity_id      uuid,                   -- nullable (some entities may not have uuid ids)
  entity_name    text,                   -- human-readable label (deal title, contact name, etc.)
  meta           jsonb default '{}',     -- extra context (old/new stage, assignee name, etc.)
  created_at     timestamptz not null default now()
);

create index activity_log_workspace_created on activity_log(workspace_id, created_at desc);
create index activity_log_user_id            on activity_log(user_id);

-- Only workspace members can read their workspace's log
alter table activity_log enable row level security;

create policy "workspace members can read activity_log"
  on activity_log for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = activity_log.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Service role writes (server actions use admin client)
create policy "service role can insert activity_log"
  on activity_log for insert
  with check (true);
