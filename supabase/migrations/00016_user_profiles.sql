-- User profiles: captures name + company at signup onboarding
create table if not exists user_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  first_name  text not null,
  last_name   text,
  company     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "users can manage own profile"
  on user_profiles for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
