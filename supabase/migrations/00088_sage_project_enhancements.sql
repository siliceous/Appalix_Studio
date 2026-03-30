-- ── 1. Project Templates ──────────────────────────────────────────────────────
-- Must be created before sage_projects references it via template_id

create table if not exists sage_project_templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,  -- null = global default
  name         text not null,
  project_type text not null default 'client_work'
    check (project_type in ('client_work', 'internal', 'support', 'onboarding', 'custom')),
  description  text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists sage_project_templates_workspace_idx on sage_project_templates(workspace_id);

alter table sage_project_templates enable row level security;

create policy "workspace members can manage templates"
  on sage_project_templates for all
  using (
    workspace_id is null  -- global templates are readable by all
    or workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- ── 2. Template Tasks ─────────────────────────────────────────────────────────

create table if not exists sage_template_tasks (
  id                    uuid primary key default gen_random_uuid(),
  template_id           uuid not null references sage_project_templates(id) on delete cascade,
  title                 text not null,
  description           text,
  default_assignee_role text not null default 'owner'
    check (default_assignee_role in ('owner', 'team_member', 'custom')),
  due_offset_days       integer not null default 0,
  order_index           integer not null default 0,
  created_at            timestamptz not null default now()
);

create index if not exists sage_template_tasks_template_idx on sage_template_tasks(template_id);

alter table sage_template_tasks enable row level security;

create policy "workspace members can manage template tasks"
  on sage_template_tasks for all
  using (
    template_id in (
      select id from sage_project_templates
      where workspace_id is null
         or workspace_id in (
           select workspace_id from workspace_members where user_id = auth.uid()
         )
    )
  );

-- ── 3. Missing columns on sage_projects ──────────────────────────────────────

alter table sage_projects
  add column if not exists project_type    text not null default 'client_work'
    check (project_type in ('client_work', 'internal', 'support', 'onboarding', 'custom')),
  add column if not exists template_id     uuid references sage_project_templates(id) on delete set null,
  add column if not exists progress_percent integer not null default 0
    check (progress_percent >= 0 and progress_percent <= 100),
  add column if not exists billing_status  text not null default 'not_invoiced'
    check (billing_status in ('not_invoiced', 'invoiced', 'partial', 'paid')),
  add column if not exists is_recurring    boolean not null default false,
  add column if not exists source          text
    check (source in ('email', 'bot', 'forms', 'manual', 'ads', 'deal')),
  add column if not exists next_action     text,
  add column if not exists blocker_flag    boolean not null default false,
  add column if not exists blocker_reason  text;

create index if not exists sage_projects_template_id_idx on sage_projects(template_id);
create index if not exists sage_projects_blocker_idx     on sage_projects(blocker_flag) where blocker_flag = true;

-- ── 4. Progress auto-calculation trigger ─────────────────────────────────────
-- Recalculates progress_percent whenever a task's status changes

create or replace function sage_recalculate_project_progress()
returns trigger language plpgsql as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);

  update sage_projects
  set progress_percent = (
    select case
      when count(*) = 0 then 0
      else round(
        count(*) filter (where status = 'completed') * 100.0 / count(*)
      )
    end
    from sage_project_tasks
    where project_id = v_project_id
  )
  where id = v_project_id;

  return new;
end;
$$;

drop trigger if exists trg_project_progress_update on sage_project_tasks;

create trigger trg_project_progress_update
  after insert or update of status or delete
  on sage_project_tasks
  for each row
  execute function sage_recalculate_project_progress();

-- ── 5. Seed global templates ──────────────────────────────────────────────────
-- These are workspace_id = null (global defaults), one per project_type

do $$
declare
  t_client  uuid;
  t_intern  uuid;
  t_support uuid;
  t_onboard uuid;
  t_custom  uuid;
begin
  -- Client Work template
  insert into sage_project_templates (workspace_id, name, project_type, description, is_default)
  values (null, 'Client Work', 'client_work', 'Standard workflow for client-facing delivery projects', true)
  returning id into t_client;

  insert into sage_template_tasks (template_id, title, due_offset_days, order_index) values
    (t_client, 'Kick-off call with client',       1,  0),
    (t_client, 'Gather requirements & brief',      3,  1),
    (t_client, 'Proposal / scope of work sign-off',5,  2),
    (t_client, 'Project setup & team assignment',  6,  3),
    (t_client, 'First delivery milestone',         14, 4),
    (t_client, 'Client review & feedback',         16, 5),
    (t_client, 'Revisions',                        20, 6),
    (t_client, 'Final delivery',                   25, 7),
    (t_client, 'Invoice raised',                   26, 8),
    (t_client, 'Project closed & feedback collected', 30, 9);

  -- Internal template
  insert into sage_project_templates (workspace_id, name, project_type, description, is_default)
  values (null, 'Internal Project', 'internal', 'Workflow for internal team initiatives', true)
  returning id into t_intern;

  insert into sage_template_tasks (template_id, title, due_offset_days, order_index) values
    (t_intern, 'Define objectives & success metrics', 2,  0),
    (t_intern, 'Assign owner and team',               3,  1),
    (t_intern, 'Break down into tasks',               4,  2),
    (t_intern, 'Mid-point check-in',                  14, 3),
    (t_intern, 'Final review',                        25, 4),
    (t_intern, 'Close-out & lessons learned',         28, 5);

  -- Support / Issue template
  insert into sage_project_templates (workspace_id, name, project_type, description, is_default)
  values (null, 'Support Case', 'support', 'Workflow for resolving client support issues', true)
  returning id into t_support;

  insert into sage_template_tasks (template_id, title, due_offset_days, order_index) values
    (t_support, 'Acknowledge issue with client',  0, 0),
    (t_support, 'Reproduce & diagnose',           1, 1),
    (t_support, 'Implement fix or workaround',    2, 2),
    (t_support, 'Test resolution',                3, 3),
    (t_support, 'Confirm resolution with client', 4, 4),
    (t_support, 'Close ticket & document',        5, 5);

  -- Onboarding template
  insert into sage_project_templates (workspace_id, name, project_type, description, is_default)
  values (null, 'Client Onboarding', 'onboarding', 'Step-by-step onboarding flow for new clients', true)
  returning id into t_onboard;

  insert into sage_template_tasks (template_id, title, due_offset_days, order_index) values
    (t_onboard, 'Welcome email & intro pack sent', 0,  0),
    (t_onboard, 'Onboarding call scheduled',       1,  1),
    (t_onboard, 'Onboarding call completed',        3,  2),
    (t_onboard, 'Access & credentials shared',      4,  3),
    (t_onboard, 'Account setup verified',           5,  4),
    (t_onboard, 'First check-in call',              14, 5),
    (t_onboard, 'Onboarding complete — hand to CSM',21, 6);

  -- Custom template (blank)
  insert into sage_project_templates (workspace_id, name, project_type, description, is_default)
  values (null, 'Custom Project', 'custom', 'Blank template — define your own tasks', true)
  returning id into t_custom;

  insert into sage_template_tasks (template_id, title, due_offset_days, order_index) values
    (t_custom, 'Define scope', 1, 0),
    (t_custom, 'Assign team',  2, 1),
    (t_custom, 'Deliver',      7, 2);
end;
$$;
