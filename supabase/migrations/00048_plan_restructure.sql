-- Restructure plans: Individual / Pro / Team / Enterprise
-- Adds seat_limit, bot_limit, extra_seats, extra_seat_limit to workspaces.
-- Old plan values (starter, core, scale) are migrated to the nearest new plan.

-- 1. New columns
alter table workspaces
  add column if not exists seat_limit        int  not null default 1,
  add column if not exists bot_limit         int  not null default 1,
  add column if not exists extra_seats       int  not null default 0,
  add column if not exists extra_seat_limit  int;  -- null = unlimited

-- 2. Backfill limits for rows that already exist
update workspaces set seat_limit = 1,  bot_limit = 1,   extra_seat_limit = null  where plan = 'starter';
update workspaces set seat_limit = 1,  bot_limit = 1,   extra_seat_limit = null  where plan = 'individual';
update workspaces set seat_limit = 3,  bot_limit = 3,   extra_seat_limit = 6     where plan = 'core';
update workspaces set seat_limit = 3,  bot_limit = 3,   extra_seat_limit = 6     where plan = 'pro';
update workspaces set seat_limit = 10, bot_limit = null, extra_seat_limit = 10   where plan = 'scale';
update workspaces set seat_limit = 10, bot_limit = null, extra_seat_limit = 10   where plan = 'team';
update workspaces set seat_limit = null, bot_limit = null, extra_seat_limit = null where plan = 'enterprise';

-- 3. Migrate old plan names → new plan names
update workspaces set plan = 'individual' where plan in ('starter', 'core');
update workspaces set plan = 'team'       where plan = 'scale';
-- 'pro' stays as 'pro', 'enterprise' stays as 'enterprise'

-- 4. workspace_members: add manager role if not already a valid value
--    (role column already exists as text so no enum to alter)
