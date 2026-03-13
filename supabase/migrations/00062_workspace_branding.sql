-- White-label / client portal branding per workspace.
-- Agencies and resellers can replace the Appalix logo, brand name,
-- and primary color to deliver a fully branded dashboard experience.

create table workspace_branding (
  workspace_id      uuid        primary key references workspaces(id) on delete cascade,

  -- Replace "Appalix" with the agency/client brand name
  brand_name        text,

  -- Custom logo shown in the sidebar (URL, typically stored in Supabase Storage)
  logo_url          text,

  -- Favicon URL (shown in browser tab)
  favicon_url       text,

  -- Brand primary color (hex, e.g. '#1a73e8')
  primary_color     text        not null default '#61c2ad',

  -- Toggle to hide "Powered by Appalix" mark in the sidebar
  hide_powered_by   boolean     not null default false,

  -- Optional welcome message shown on the Sage dashboard greeting
  welcome_message   text,

  updated_at        timestamptz not null default now()
);

alter table workspace_branding enable row level security;

create policy "workspace members can view branding"
  on workspace_branding for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspace_branding.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace admins can upsert branding"
  on workspace_branding for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspace_branding.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin')
    )
  );

create policy "workspace admins can update branding"
  on workspace_branding for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspace_branding.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin')
    )
  );
