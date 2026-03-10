-- Add extra_bots tracking and fix team bot_limit (10, not unlimited).
-- Extra bot add-on: $19/mo annual, $29/mo monthly — applies to all plans.

alter table workspaces
  add column if not exists extra_bots       int not null default 0,
  add column if not exists extra_bot_limit  int;  -- null = unlimited

-- Team plan: bot_limit is 10 (not null/unlimited)
update workspaces set bot_limit = 10 where plan = 'team';

-- Backfill extra_bot_limit for existing rows (matches PLAN_LIMITS)
update workspaces set extra_bot_limit = null where plan in ('individual', 'pro', 'team', 'enterprise');
