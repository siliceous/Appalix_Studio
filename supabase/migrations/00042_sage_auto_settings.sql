-- Sage Auto settings: per-workspace ON/OFF flags
create table if not exists sage_workspace_settings (
  workspace_id        uuid primary key references workspaces(id) on delete cascade,
  global_auto_enabled boolean not null default true,
  email_auto_enabled  boolean not null default true,
  bots_auto_enabled   boolean not null default true,
  forms_auto_enabled  boolean not null default true,
  tickets_auto_enabled boolean not null default true,
  updated_at          timestamptz not null default now()
);

alter table sage_workspace_settings enable row level security;

create policy "workspace members can read settings"
  on sage_workspace_settings for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_workspace_settings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Feed dismissals: track which items the user has dismissed from the activity feed
create table if not exists sage_feed_dismissals (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_type  text not null check (source_type in ('email', 'bot', 'form', 'ticket')),
  source_id    text not null,
  dismissed_at timestamptz not null default now(),
  unique (workspace_id, source_type, source_id)
);

alter table sage_feed_dismissals enable row level security;

create policy "workspace members can manage dismissals"
  on sage_feed_dismissals for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_feed_dismissals.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create index if not exists sage_feed_dismissals_workspace_idx
  on sage_feed_dismissals(workspace_id);
