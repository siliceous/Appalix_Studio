-- Per-user email scoping
-- sage_integrations: one row per workspace+user+provider (not workspace+provider)
-- sage_emails: each email is tagged with the user whose mailbox it came from

-- ── sage_integrations ────────────────────────────────────────────────────────
alter table sage_integrations
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Back-fill: assign existing workspace-level integrations to the workspace owner
update sage_integrations si
set user_id = wm.user_id
from workspace_members wm
where wm.workspace_id = si.workspace_id
  and wm.role = 'owner'
  and si.user_id is null;

-- Make user_id required going forward
alter table sage_integrations
  alter column user_id set not null;

-- Replace old (workspace_id, provider) unique constraint with (workspace_id, user_id, provider)
alter table sage_integrations
  drop constraint if exists sage_integrations_workspace_id_provider_key;

alter table sage_integrations
  add constraint sage_integrations_workspace_user_provider
  unique (workspace_id, user_id, provider);

-- ── sage_emails ──────────────────────────────────────────────────────────────
alter table sage_emails
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Drop old workspace+message unique constraint
alter table sage_emails
  drop constraint if exists sage_emails_workspace_id_message_id_key;

-- New: per-user dedup (allows same message_id for different users in same workspace)
create unique index if not exists sage_emails_workspace_user_message_key
  on sage_emails (workspace_id, user_id, message_id)
  where user_id is not null;

-- Legacy dedup for existing NULL user_id rows
create unique index if not exists sage_emails_workspace_message_legacy_key
  on sage_emails (workspace_id, message_id)
  where user_id is null;
