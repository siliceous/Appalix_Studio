-- sage_project_boards: like sage_pipelines
create table if not exists sage_project_boards (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now()
);

-- sage_project_board_stages: like sage_pipeline_stages
create table if not exists sage_project_board_stages (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references sage_project_boards(id) on delete cascade,
  name       text not null,
  color      text not null default '#6b7280',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- Add board_id and stage_id to sage_projects (nullable - projects can be unassigned)
alter table sage_projects add column if not exists board_id uuid references sage_project_boards(id) on delete set null;
alter table sage_projects add column if not exists stage_id uuid references sage_project_board_stages(id) on delete set null;

-- Indexes
create index if not exists sage_project_boards_workspace_id_idx on sage_project_boards(workspace_id);
create index if not exists sage_project_board_stages_board_id_idx on sage_project_board_stages(board_id);
create index if not exists sage_projects_board_id_idx on sage_projects(board_id);

-- RLS
alter table sage_project_boards enable row level security;
alter table sage_project_board_stages enable row level security;

create policy "workspace members can manage project boards"
  on sage_project_boards for all
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "workspace members can manage board stages"
  on sage_project_board_stages for all
  using (board_id in (select id from sage_project_boards where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())));
