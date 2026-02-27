-- Add language preference to bots
-- 'auto' = respond in the same language as the user (default)
-- Any other value = always respond in that language

alter table bots
  add column if not exists language_preference text not null default 'auto';
