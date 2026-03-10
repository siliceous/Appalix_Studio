-- Round-robin index for auto lead distribution.
-- rr_index: pointer to the next workspace_member slot to assign a lead to.
-- Incremented (mod member count) each time a lead is auto-assigned.

alter table workspaces
  add column if not exists rr_index int not null default 0;

comment on column workspaces.rr_index is 'Round-robin pointer for auto lead distribution — incremented mod active member count on each assignment';
