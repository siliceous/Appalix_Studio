-- Track CRM import/migration runs from HubSpot, Salesforce, Monday.com, Zoho

create table if not exists crm_imports (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  provider     text        not null check (provider in ('hubspot', 'salesforce', 'monday', 'zoho')),
  entity_type  text        not null check (entity_type in ('contacts', 'deals', 'companies')),
  status       text        not null default 'pending'
                           check (status in ('pending', 'running', 'done', 'error')),
  total        int         not null default 0,
  imported     int         not null default 0,
  skipped      int         not null default 0,
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);

alter table crm_imports enable row level security;

create policy "workspace members can read own imports"
  on crm_imports for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
