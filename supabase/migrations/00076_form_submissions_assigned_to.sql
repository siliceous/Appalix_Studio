-- Add assignment column to sage_form_submissions
alter table sage_form_submissions
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists idx_form_submissions_assigned_to
  on sage_form_submissions (workspace_id, assigned_to);

comment on column sage_form_submissions.assigned_to is 'Workspace member assigned to handle this form submission';
