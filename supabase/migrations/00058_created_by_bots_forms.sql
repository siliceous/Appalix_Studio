-- Track who created each bot and form.
-- Enables role-based scoping (manager/employee sees their own bots/forms)
-- and per-user plan limit enforcement (count bots/forms per creator).

-- ── bots ──────────────────────────────────────────────────────────────────────
alter table bots
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Backfill: assign existing bots to the workspace owner
update bots b
set created_by = (
  select user_id from workspace_members
  where workspace_id = b.workspace_id
    and role = 'owner'
  order by created_at asc
  limit 1
)
where created_by is null;

create index if not exists idx_bots_created_by
  on bots (workspace_id, created_by);

comment on column bots.created_by is 'User who created this bot — used for scoping and plan limit enforcement';

-- ── sage_forms ────────────────────────────────────────────────────────────────
alter table sage_forms
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Backfill: assign existing forms to the workspace owner
update sage_forms f
set created_by = (
  select user_id from workspace_members
  where workspace_id = f.workspace_id
    and role = 'owner'
  order by created_at asc
  limit 1
)
where created_by is null;

create index if not exists idx_sage_forms_created_by
  on sage_forms (workspace_id, created_by);

comment on column sage_forms.created_by is 'User who created this form — used for scoping and plan limit enforcement';
