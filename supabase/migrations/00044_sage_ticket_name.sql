-- Add customer name field to sage_tickets (free-text, for AI and manual entry)
alter table sage_tickets
  add column if not exists name text;
