-- Lead Ad Sources: one row per ad platform connection per workspace
create table if not exists lead_ad_sources (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  platform      text        not null check (platform in ('meta', 'google_ads')),
  name          text        not null default '',
  status        text        not null default 'active' check (status in ('active', 'inactive')),
  config        jsonb       not null default '{}',
  leads_count   int         not null default 0,
  last_lead_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Leads: normalized lead records from ad platforms
create table if not exists leads (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  source_id       uuid        references lead_ad_sources(id) on delete set null,
  name            text        not null default '',
  email           text,
  phone           text,
  company         text,
  job_title       text,
  website         text,
  source_platform text        not null check (source_platform in ('meta', 'google_ads')),
  campaign_name   text,
  ad_name         text,
  form_name       text,
  lead_score      text        check (lead_score in ('high', 'medium', 'low')),
  pipeline_stage  text        not null default 'new_lead',
  raw_payload     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Lead Events: activity log per lead
create table if not exists lead_events (
  id          uuid        primary key default gen_random_uuid(),
  lead_id     uuid        not null references leads(id) on delete cascade,
  event_type  text        not null,
  event_data  jsonb,
  created_at  timestamptz not null default now()
);

-- Row Level Security
alter table lead_ad_sources enable row level security;
alter table leads            enable row level security;
alter table lead_events      enable row level security;

-- lead_ad_sources: workspace members can manage their own
create policy "workspace members manage lead sources"
  on lead_ad_sources for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = lead_ad_sources.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- leads: workspace members can manage their own
create policy "workspace members manage leads"
  on leads for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = leads.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- lead_events: accessible via lead's workspace membership
create policy "workspace members read lead events"
  on lead_events for select
  using (
    exists (
      select 1 from leads
      join workspace_members on workspace_members.workspace_id = leads.workspace_id
      where leads.id = lead_events.lead_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists idx_lead_ad_sources_workspace on lead_ad_sources(workspace_id);
create index if not exists idx_lead_ad_sources_platform  on lead_ad_sources(workspace_id, platform);
create index if not exists idx_leads_workspace            on leads(workspace_id);
create index if not exists idx_leads_source               on leads(source_id);
create index if not exists idx_leads_platform             on leads(source_platform);
create index if not exists idx_leads_email                on leads(workspace_id, email);
create index if not exists idx_leads_phone                on leads(workspace_id, phone);
create index if not exists idx_leads_created_at           on leads(workspace_id, created_at desc);
create index if not exists idx_lead_events_lead           on lead_events(lead_id);
