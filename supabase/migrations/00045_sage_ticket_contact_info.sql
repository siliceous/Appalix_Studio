-- Add direct contact info and occurrence date/time to sage_tickets
alter table sage_tickets
  add column if not exists email      text,
  add column if not exists phone      text,
  add column if not exists occurred_at timestamptz;
