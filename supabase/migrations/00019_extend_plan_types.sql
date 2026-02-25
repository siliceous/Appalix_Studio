-- Extend the workspace plan constraint to include Core and Scale tiers,
-- matching the 5-plan pricing structure on the marketing site.

alter table workspaces drop constraint if exists workspaces_plan_check;

alter table workspaces
  add constraint workspaces_plan_check
  check (plan in ('starter', 'core', 'pro', 'scale', 'enterprise'));
