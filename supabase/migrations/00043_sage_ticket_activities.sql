-- Ticket activities (notes, calls, meetings, tasks) per ticket
create table if not exists sage_ticket_activities (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  ticket_id    uuid not null references sage_tickets(id) on delete cascade,
  type         text not null check (type in ('note','call','meeting','task')),
  title        text,
  body         text,
  due_at       timestamptz,
  completed_at timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists sage_ticket_activities_ticket_id_idx
  on sage_ticket_activities(ticket_id, created_at desc);

-- Extend ticket status to include in_progress and closed
-- Safe: alter check constraint if it exists, otherwise a text column accepts any value
do $$
begin
  -- If the status column has a check constraint, drop and recreate it
  if exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'sage_tickets' and column_name = 'status'
  ) then
    alter table sage_tickets
      drop constraint if exists sage_tickets_status_check;
  end if;

  alter table sage_tickets
    add constraint sage_tickets_status_check
    check (status in ('open','in_progress','pending','resolved','closed'));
exception
  when others then null;  -- column may be text with no constraint; safe to ignore
end $$;
