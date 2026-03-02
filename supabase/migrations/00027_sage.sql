-- ============================================================
-- Migration 00027: Appalix Sage — CRM, Pipelines, Tickets
--
-- Tables:
--   sage_companies       — company records
--   sage_contacts        — contact/lead records (linked to chat)
--   sage_pipelines       — named deal pipelines
--   sage_pipeline_stages — ordered stages within a pipeline
--   sage_deals           — deals tracked through pipeline stages
--   sage_tickets         — simple internal support tickets
--   sage_activity_log    — unified event timeline for all entities
--   sage_integrations    — external service connections (Stripe, Gmail, etc.)
-- ============================================================

-- ---------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------
create table if not exists sage_companies (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  domain       text,
  industry     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------
create table if not exists sage_contacts (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  company_id              uuid references sage_companies(id) on delete set null,
  source_conversation_id  uuid references conversations(id) on delete set null,
  name                    text not null,
  email                   text,
  phone                   text,
  source                  text default 'manual',  -- 'chat' | 'manual' | 'import'
  tags                    text[] not null default '{}',
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Pipelines
-- ---------------------------------------------------------------
create table if not exists sage_pipelines (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  template_type text,          -- 'sales' | 'agency' | 'consulting' | 'support' | 'onboarding' | 'custom'
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Pipeline stages
-- ---------------------------------------------------------------
create table if not exists sage_pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references sage_pipelines(id) on delete cascade,
  name        text not null,
  position    int  not null,
  color       text not null default '#6b7280',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------
create table if not exists sage_deals (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references workspaces(id) on delete cascade,
  pipeline_id            uuid references sage_pipelines(id) on delete set null,
  stage_id               uuid references sage_pipeline_stages(id) on delete set null,
  contact_id             uuid references sage_contacts(id) on delete set null,
  company_id             uuid references sage_companies(id) on delete set null,
  owner_id               uuid references auth.users(id) on delete set null,
  source_conversation_id uuid references conversations(id) on delete set null,
  title                  text not null,
  value                  numeric(12, 2),
  currency               text not null default 'USD',
  status                 text not null default 'open',   -- 'open' | 'won' | 'lost'
  tags                   text[] not null default '{}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Tickets (simple internal, with optional external link)
-- ---------------------------------------------------------------
create table if not exists sage_tickets (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  contact_id        uuid references sage_contacts(id) on delete set null,
  deal_id           uuid references sage_deals(id) on delete set null,
  owner_id          uuid references auth.users(id) on delete set null,
  title             text not null,
  description       text,
  status            text not null default 'open',    -- 'open' | 'pending' | 'resolved'
  priority          text not null default 'medium',  -- 'low' | 'medium' | 'high' | 'urgent'
  -- External ticket system link (Zendesk / Freshdesk)
  external_provider text,   -- 'zendesk' | 'freshdesk'
  external_id       text,
  external_url      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Activity log — unified timeline for all Sage entities
-- ---------------------------------------------------------------
create table if not exists sage_activity_log (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  entity_type  text not null,  -- 'contact' | 'deal' | 'ticket' | 'company'
  entity_id    uuid not null,
  event_type   text not null,  -- 'contact_created' | 'deal_created' | 'stage_changed' | 'ticket_created' | 'note_added' | ...
  payload      jsonb not null default '{}',
  user_id      uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Sage integrations — external service connections per workspace
-- ---------------------------------------------------------------
create table if not exists sage_integrations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider     text not null,   -- 'stripe' | 'gmail' | 'microsoft' | 'zapier' | 'freshdesk' | 'zendesk'
  status       text not null default 'disconnected',  -- 'connected' | 'disconnected' | 'error'
  config       jsonb not null default '{}',            -- tokens, API keys, webhook URLs (encrypted at rest by Supabase)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, provider)
);

-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------
create index if not exists idx_sage_contacts_workspace   on sage_contacts (workspace_id);
create index if not exists idx_sage_contacts_company     on sage_contacts (company_id);
create index if not exists idx_sage_contacts_email       on sage_contacts (workspace_id, email);
create index if not exists idx_sage_companies_workspace  on sage_companies (workspace_id);
create index if not exists idx_sage_pipelines_workspace  on sage_pipelines (workspace_id);
create index if not exists idx_sage_stages_pipeline      on sage_pipeline_stages (pipeline_id, position);
create index if not exists idx_sage_deals_workspace      on sage_deals (workspace_id);
create index if not exists idx_sage_deals_pipeline       on sage_deals (pipeline_id);
create index if not exists idx_sage_deals_stage          on sage_deals (stage_id);
create index if not exists idx_sage_deals_contact        on sage_deals (contact_id);
create index if not exists idx_sage_tickets_workspace    on sage_tickets (workspace_id);
create index if not exists idx_sage_tickets_status       on sage_tickets (workspace_id, status);
create index if not exists idx_sage_activity_entity      on sage_activity_log (entity_type, entity_id);
create index if not exists idx_sage_activity_workspace   on sage_activity_log (workspace_id, created_at desc);
create index if not exists idx_sage_integrations_ws      on sage_integrations (workspace_id);

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table sage_companies      enable row level security;
alter table sage_contacts       enable row level security;
alter table sage_pipelines      enable row level security;
alter table sage_pipeline_stages enable row level security;
alter table sage_deals          enable row level security;
alter table sage_tickets        enable row level security;
alter table sage_activity_log   enable row level security;
alter table sage_integrations   enable row level security;

-- Companies
create policy "sage_companies: members can select"
  on sage_companies for select using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_companies: members can insert"
  on sage_companies for insert with check (workspace_id in (select public.my_workspace_ids()));
create policy "sage_companies: members can update"
  on sage_companies for update using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_companies: admins can delete"
  on sage_companies for delete using (public.is_workspace_admin(workspace_id));

-- Contacts
create policy "sage_contacts: members can select"
  on sage_contacts for select using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_contacts: members can insert"
  on sage_contacts for insert with check (workspace_id in (select public.my_workspace_ids()));
create policy "sage_contacts: members can update"
  on sage_contacts for update using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_contacts: admins can delete"
  on sage_contacts for delete using (public.is_workspace_admin(workspace_id));

-- Pipelines
create policy "sage_pipelines: members can select"
  on sage_pipelines for select using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_pipelines: admins can insert"
  on sage_pipelines for insert with check (public.is_workspace_admin(workspace_id));
create policy "sage_pipelines: admins can update"
  on sage_pipelines for update using (public.is_workspace_admin(workspace_id));
create policy "sage_pipelines: admins can delete"
  on sage_pipelines for delete using (public.is_workspace_admin(workspace_id));

-- Pipeline stages (accessible by workspace members via pipeline join)
create policy "sage_pipeline_stages: members can select"
  on sage_pipeline_stages for select
  using (pipeline_id in (
    select id from sage_pipelines where workspace_id in (select public.my_workspace_ids())
  ));
create policy "sage_pipeline_stages: admins can insert"
  on sage_pipeline_stages for insert
  with check (pipeline_id in (
    select id from sage_pipelines where workspace_id in (select public.my_workspace_ids())
  ));
create policy "sage_pipeline_stages: admins can update"
  on sage_pipeline_stages for update
  using (pipeline_id in (
    select id from sage_pipelines where workspace_id in (select public.my_workspace_ids())
  ));
create policy "sage_pipeline_stages: admins can delete"
  on sage_pipeline_stages for delete
  using (pipeline_id in (
    select id from sage_pipelines where workspace_id in (select public.my_workspace_ids())
  ));

-- Deals
create policy "sage_deals: members can select"
  on sage_deals for select using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_deals: members can insert"
  on sage_deals for insert with check (workspace_id in (select public.my_workspace_ids()));
create policy "sage_deals: members can update"
  on sage_deals for update using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_deals: admins can delete"
  on sage_deals for delete using (public.is_workspace_admin(workspace_id));

-- Tickets
create policy "sage_tickets: members can select"
  on sage_tickets for select using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_tickets: members can insert"
  on sage_tickets for insert with check (workspace_id in (select public.my_workspace_ids()));
create policy "sage_tickets: members can update"
  on sage_tickets for update using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_tickets: admins can delete"
  on sage_tickets for delete using (public.is_workspace_admin(workspace_id));

-- Activity log
create policy "sage_activity_log: members can select"
  on sage_activity_log for select using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_activity_log: members can insert"
  on sage_activity_log for insert with check (workspace_id in (select public.my_workspace_ids()));

-- Integrations
create policy "sage_integrations: members can select"
  on sage_integrations for select using (workspace_id in (select public.my_workspace_ids()));
create policy "sage_integrations: admins can insert"
  on sage_integrations for insert with check (public.is_workspace_admin(workspace_id));
create policy "sage_integrations: admins can update"
  on sage_integrations for update using (public.is_workspace_admin(workspace_id));
create policy "sage_integrations: admins can delete"
  on sage_integrations for delete using (public.is_workspace_admin(workspace_id));
