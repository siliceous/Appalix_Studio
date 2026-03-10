-- Lead assignment: track which workspace member owns each contact.
-- assigned_to: FK to auth.users (nullable — unassigned by default).

alter table sage_contacts
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists idx_sage_contacts_assigned_to on sage_contacts (workspace_id, assigned_to);

comment on column sage_contacts.assigned_to is 'Workspace member (auth.users.id) responsible for this contact/lead';
