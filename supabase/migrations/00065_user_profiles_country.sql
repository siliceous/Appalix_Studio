-- Add country, timezone and currency to user_profiles
alter table user_profiles
  add column if not exists country  text,
  add column if not exists timezone text,
  add column if not exists currency text;
