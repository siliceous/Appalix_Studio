-- Expand the role check constraint on workspace_members to include
-- 'manager' and 'employee' roles used by the invite flow.
alter table workspace_members
  drop constraint if exists workspace_members_role_check;

alter table workspace_members
  add constraint workspace_members_role_check
  check (role in ('owner', 'admin', 'manager', 'employee', 'member', 'viewer'));
