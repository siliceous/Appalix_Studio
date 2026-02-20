-- ============================================================
-- Migration 00002: Workspaces (Tenant Root)
-- Every piece of data in the system belongs to a workspace.
-- ============================================================

-- Shared trigger function: auto-update updated_at on every table
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table workspaces (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  -- URL-safe slug for subdomain routing (e.g. "acme" → acme.yoursaas.com)
  slug                text        not null unique,

  -- Billing / plan
  plan                text        not null default 'starter'
                                  check (plan in ('starter', 'pro', 'enterprise')),
  subscription_status text        not null default 'inactive'
                                  check (subscription_status in (
                                    'active', 'inactive', 'trialing',
                                    'past_due', 'cancelled', 'paused'
                                  )),
  -- Stripe
  stripe_customer_id    text      unique,
  stripe_subscription_id text     unique,
  -- WooCommerce (alternative billing path)
  woo_order_id          text,

  billing_email       text,
  trial_ends_at       timestamptz,

  -- Usage limits (set per plan by billing webhook)
  monthly_message_limit   integer  default 1000,
  monthly_agent_run_limit integer  default 100,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger workspaces_updated_at
  before update on workspaces
  for each row execute function update_updated_at_column();

-- Slug must be lowercase alphanumeric + hyphens only
alter table workspaces
  add constraint workspaces_slug_format
  check (slug ~ '^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$');
