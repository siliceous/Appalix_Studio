-- Add AI summary, company, and assigned_to fields to sage_tickets
alter table sage_tickets
  add column if not exists company     text,
  add column if not exists ai_summary  text,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists sage_tickets_assigned_to
  on sage_tickets(assigned_to)
  where assigned_to is not null;
