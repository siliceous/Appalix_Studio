-- ============================================================
-- Migration 00003: Workspace Members (RBAC)
-- Links Supabase auth users to workspaces with roles.
-- ============================================================

create table workspace_members (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,

  role          text        not null default 'member'
                            check (role in ('owner', 'admin', 'member', 'viewer')),

  -- Invitation tracking
  invited_by    uuid        references auth.users(id) on delete set null,
  invited_at    timestamptz,
  accepted_at   timestamptz,

  created_at    timestamptz not null default now(),

  -- One membership per user per workspace
  unique (workspace_id, user_id)
);

-- Fast lookup: "which workspaces does this user belong to?" (used by RLS)
create index workspace_members_user_id_idx
  on workspace_members(user_id);

create index workspace_members_workspace_id_idx
  on workspace_members(workspace_id);
