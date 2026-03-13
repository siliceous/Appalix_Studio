-- Change per-source auto-setting defaults to false.
-- Sage Auto should be opt-in, not opt-out.

alter table sage_workspace_settings
  alter column global_auto_enabled  set default false,
  alter column email_auto_enabled   set default false,
  alter column bots_auto_enabled    set default false,
  alter column forms_auto_enabled   set default false,
  alter column tickets_auto_enabled set default false;

-- Reset any existing rows that still carry the old opt-out defaults.
-- Workspaces that never explicitly toggled anything will now start fresh as OFF.
update sage_workspace_settings
set
  global_auto_enabled  = false,
  email_auto_enabled   = false,
  bots_auto_enabled    = false,
  forms_auto_enabled   = false,
  tickets_auto_enabled = false;

-- Allow workspace members to write their own workspace settings
-- (belt-and-suspenders alongside the admin-client writes).
create policy "workspace members can upsert settings"
  on sage_workspace_settings for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_workspace_settings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can update settings"
  on sage_workspace_settings for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_workspace_settings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
