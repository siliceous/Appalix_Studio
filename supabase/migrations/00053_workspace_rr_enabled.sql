-- Round-robin lead distribution toggle per workspace.
-- rr_enabled: when true, new contacts from bot/email/form triage are
--             auto-assigned to accepted team members in rotation.

alter table workspaces
  add column if not exists rr_enabled boolean not null default false;

comment on column workspaces.rr_enabled is 'When true, new leads from triage are auto-assigned in round-robin order across accepted workspace members';
