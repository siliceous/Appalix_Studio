-- Add assigned_to column to sage_emails for team member assignment
alter table sage_emails
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists sage_emails_assigned_to
  on sage_emails(assigned_to)
  where assigned_to is not null;
