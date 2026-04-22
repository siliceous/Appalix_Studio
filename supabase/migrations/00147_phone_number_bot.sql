-- Add bot_id to workspace_phone_numbers so inbound SMS can auto-reply

alter table workspace_phone_numbers
  add column if not exists bot_id uuid references bots(id) on delete set null;
