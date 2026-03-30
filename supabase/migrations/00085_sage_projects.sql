-- ─────────────────────────────────────────────────────────────────────────────
-- Sage Projects — post-deal delivery & project management
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Projects ───────────────────────────────────────────────────────────────

create table if not exists sage_projects (
  id               uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references workspaces(id) on delete cascade,
  deal_id          uuid        references sage_deals(id) on delete set null,
  contact_id       uuid        references sage_contacts(id) on delete set null,
  company_id       uuid        references sage_companies(id) on delete set null,
  owner_id         uuid        references auth.users(id) on delete set null,
  assigned_to      uuid[]      not null default '{}',   -- additional team members
  name             text        not null,
  service_type     text,                                 -- e.g. 'web_design', 'seo', 'custom'
  status           text        not null default 'onboarding'
                               check (status in ('onboarding','active','on_hold','completed','cancelled')),
  priority         text        not null default 'medium'
                               check (priority in ('low','medium','high')),
  start_date       date,
  due_date         date,
  value            numeric,
  currency         text        not null default 'USD',
  notes            text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists sage_projects_workspace   on sage_projects(workspace_id);
create index if not exists sage_projects_deal        on sage_projects(deal_id)    where deal_id    is not null;
create index if not exists sage_projects_contact     on sage_projects(contact_id) where contact_id is not null;
create index if not exists sage_projects_owner       on sage_projects(owner_id)   where owner_id   is not null;
create index if not exists sage_projects_status      on sage_projects(workspace_id, status);

alter table sage_projects enable row level security;

create policy "workspace members access projects"
  on sage_projects for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- ── 2. Project tasks ──────────────────────────────────────────────────────────

create table if not exists sage_project_tasks (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references sage_projects(id) on delete cascade,
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  title        text        not null,
  description  text,
  assigned_to  uuid        references auth.users(id) on delete set null,
  status       text        not null default 'pending'
               check (status in ('pending','in_progress','completed')),
  priority     text        not null default 'medium'
               check (priority in ('low','medium','high')),
  due_date     date,
  order_index  integer     not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists sage_project_tasks_project   on sage_project_tasks(project_id);
create index if not exists sage_project_tasks_workspace on sage_project_tasks(workspace_id);
create index if not exists sage_project_tasks_assignee  on sage_project_tasks(assigned_to) where assigned_to is not null;

alter table sage_project_tasks enable row level security;

create policy "workspace members access project tasks"
  on sage_project_tasks for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- ── 3. Task templates (per service type) ─────────────────────────────────────

create table if not exists sage_project_task_templates (
  id           uuid    primary key default gen_random_uuid(),
  workspace_id uuid    references workspaces(id) on delete cascade,  -- null = global default
  service_type text    not null,
  title        text    not null,
  description  text,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists sage_task_templates_service on sage_project_task_templates(service_type);

alter table sage_project_task_templates enable row level security;

create policy "workspace members read task templates"
  on sage_project_task_templates for select
  using (
    workspace_id is null  -- global defaults visible to all
    or workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "workspace members manage own templates"
  on sage_project_task_templates for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- ── 4. Seed global task templates ────────────────────────────────────────────

insert into sage_project_task_templates (workspace_id, service_type, title, order_index) values
  -- Web Design
  (null, 'web_design', 'Send onboarding email',       0),
  (null, 'web_design', 'Collect requirements',         1),
  (null, 'web_design', 'Collect brand assets',         2),
  (null, 'web_design', 'Create wireframes',            3),
  (null, 'web_design', 'Client approval on wireframes',4),
  (null, 'web_design', 'Start development',            5),
  (null, 'web_design', 'Internal QA',                  6),
  (null, 'web_design', 'Client review',                7),
  (null, 'web_design', 'Launch',                       8),
  -- SEO
  (null, 'seo', 'Send onboarding email',               0),
  (null, 'seo', 'Get Google Search Console access',    1),
  (null, 'seo', 'Get Google Analytics access',         2),
  (null, 'seo', 'Keyword research',                    3),
  (null, 'seo', 'Technical audit',                     4),
  (null, 'seo', 'On-page fixes',                       5),
  (null, 'seo', 'Content plan',                        6),
  (null, 'seo', 'Reporting setup',                     7),
  -- Marketing
  (null, 'marketing', 'Send onboarding email',         0),
  (null, 'marketing', 'Strategy call',                 1),
  (null, 'marketing', 'Audience research',             2),
  (null, 'marketing', 'Campaign setup',                3),
  (null, 'marketing', 'Creative assets',               4),
  (null, 'marketing', 'Launch campaign',               5),
  (null, 'marketing', 'Performance review',            6),
  -- Consulting
  (null, 'consulting', 'Send onboarding email',        0),
  (null, 'consulting', 'Discovery call',               1),
  (null, 'consulting', 'Research & analysis',          2),
  (null, 'consulting', 'Proposal / deliverable',       3),
  (null, 'consulting', 'Presentation',                 4),
  (null, 'consulting', 'Follow-up',                    5),
  -- Custom (generic)
  (null, 'custom', 'Send onboarding email',            0),
  (null, 'custom', 'Kickoff call',                     1),
  (null, 'custom', 'Define scope',                     2),
  (null, 'custom', 'Delivery',                         3),
  (null, 'custom', 'Review & sign-off',                4)
on conflict do nothing;

-- ── 5. Add project event types to activity log ────────────────────────────────

-- Extend entity_type check to include 'project'
-- (PostgreSQL requires dropping and recreating the constraint)
alter table sage_activity_log
  drop constraint if exists sage_activity_log_entity_type_check;

alter table sage_activity_log
  add constraint sage_activity_log_entity_type_check
  check (entity_type in ('contact','deal','ticket','company','project'));

-- ── 6. updated_at triggers ────────────────────────────────────────────────────

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sage_projects_updated_at
  before update on sage_projects
  for each row execute function update_updated_at_column();

create trigger sage_project_tasks_updated_at
  before update on sage_project_tasks
  for each row execute function update_updated_at_column();
