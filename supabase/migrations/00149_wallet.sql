-- ─────────────────────────────────────────────────────────────────────────────
-- 00149_wallet.sql
-- Appalix Wallet — pre-paid balance ledger for SMS, calling, and phone numbers.
-- Telnyx is infrastructure; Appalix owns the customer-facing wallet.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── wallet_accounts ───────────────────────────────────────────────────────────
-- One row per workspace. Mutable balance column is the source of truth.

create table if not exists wallet_accounts (
  id                        uuid        primary key default gen_random_uuid(),
  workspace_id              uuid        not null references workspaces(id) on delete cascade,
  balance                   numeric(12,4) not null default 0 check (balance >= -1000), -- allow small negative for admin use
  currency                  text        not null default 'AUD',
  -- auto-recharge settings
  auto_recharge_enabled     boolean     not null default false,
  auto_recharge_threshold   numeric(12,4) not null default 10,  -- recharge when balance drops below this
  auto_recharge_amount      numeric(12,4) not null default 50,  -- credit this much on recharge
  -- alert settings
  low_balance_threshold     numeric(12,4) not null default 5,
  low_balance_alert_sent_at timestamptz,
  -- stripe auto-recharge
  stripe_payment_method_id  text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint wallet_accounts_workspace_id_unique unique (workspace_id)
);

create index if not exists wallet_accounts_workspace_id_idx on wallet_accounts (workspace_id);

comment on table wallet_accounts is
  'Pre-paid balance account per workspace. Customers top up via Stripe; usage is deducted automatically.';

-- ── wallet_transactions ───────────────────────────────────────────────────────
-- Immutable ledger — one row per credit or debit. Never updated, only inserted.

do $$ begin
  create type wallet_transaction_type as enum (
    'topup',
    'usage_deduction',
    'refund',
    'admin_adjustment',
    'auto_recharge'
  );
exception when duplicate_object then null;
end $$;

create table if not exists wallet_transactions (
  id                  uuid        primary key default gen_random_uuid(),
  workspace_id        uuid        not null references workspaces(id) on delete cascade,
  wallet_account_id   uuid        not null references wallet_accounts(id),
  type                wallet_transaction_type not null,
  -- positive = credit, negative = debit
  amount              numeric(12,4) not null,
  balance_before      numeric(12,4) not null,
  balance_after       numeric(12,4) not null,
  currency            text        not null default 'AUD',
  description         text,
  -- link back to Stripe or usage_events
  reference_id        text,
  reference_type      text,   -- 'stripe_payment_intent' | 'usage_event' | 'admin' | 'stripe_session'
  -- who triggered this (null = system/automated)
  created_by          uuid        references auth.users(id),
  created_at          timestamptz not null default now()
);

create index if not exists wallet_transactions_workspace_id_idx on wallet_transactions (workspace_id, created_at desc);
create index if not exists wallet_transactions_reference_idx    on wallet_transactions (reference_id) where reference_id is not null;

comment on table wallet_transactions is
  'Immutable ledger of every wallet credit and debit. balance_before/after make each row self-verifiable.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table wallet_accounts    enable row level security;
alter table wallet_transactions enable row level security;

create policy "workspace members read wallet_accounts"
  on wallet_accounts for select
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = wallet_accounts.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace members read wallet_transactions"
  on wallet_transactions for select
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = wallet_transactions.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- ── Atomic credit RPC ─────────────────────────────────────────────────────────
-- Called by: Stripe webhook on successful top-up, admin adjustments, refunds.
-- Returns the new balance.

create or replace function wallet_credit(
  p_workspace_id   uuid,
  p_amount         numeric,
  p_type           wallet_transaction_type,
  p_description    text,
  p_reference_id   text    default null,
  p_reference_type text    default null,
  p_created_by     uuid    default null
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id  uuid;
  v_before     numeric;
  v_after      numeric;
begin
  -- Ensure wallet exists
  insert into wallet_accounts (workspace_id) values (p_workspace_id)
  on conflict (workspace_id) do nothing;

  -- Lock the row
  select id, balance into v_wallet_id, v_before
  from wallet_accounts
  where workspace_id = p_workspace_id
  for update;

  v_after := v_before + p_amount;

  update wallet_accounts
  set balance = v_after, updated_at = now()
  where id = v_wallet_id;

  insert into wallet_transactions (
    workspace_id, wallet_account_id, type, amount,
    balance_before, balance_after, currency, description,
    reference_id, reference_type, created_by
  ) select
    p_workspace_id, v_wallet_id, p_type, p_amount,
    v_before, v_after, wa.currency, p_description,
    p_reference_id, p_reference_type, p_created_by
  from wallet_accounts wa where wa.id = v_wallet_id;

  return v_after;
end;
$$;

-- ── Atomic deduct RPC ─────────────────────────────────────────────────────────
-- Called by: usage-ledger after every SMS segment, call minute, etc.
-- Raises 'insufficient_wallet_balance' if funds are too low (unless p_allow_negative).
-- Returns the new balance.

create or replace function wallet_deduct(
  p_workspace_id   uuid,
  p_amount         numeric,
  p_type           wallet_transaction_type,
  p_description    text,
  p_reference_id   text    default null,
  p_reference_type text    default null,
  p_allow_negative boolean default false,
  p_created_by     uuid    default null
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id  uuid;
  v_before     numeric;
  v_after      numeric;
begin
  -- Ensure wallet exists (balance defaults to 0)
  insert into wallet_accounts (workspace_id) values (p_workspace_id)
  on conflict (workspace_id) do nothing;

  select id, balance into v_wallet_id, v_before
  from wallet_accounts
  where workspace_id = p_workspace_id
  for update;

  v_after := v_before - p_amount;

  if v_after < 0 and not p_allow_negative then
    raise exception 'insufficient_wallet_balance'
      using hint = format('Balance %.4f, required %.4f', v_before, p_amount);
  end if;

  update wallet_accounts
  set balance = v_after, updated_at = now()
  where id = v_wallet_id;

  insert into wallet_transactions (
    workspace_id, wallet_account_id, type, amount,
    balance_before, balance_after, currency, description,
    reference_id, reference_type, created_by
  ) select
    p_workspace_id, v_wallet_id, p_type, -p_amount,
    v_before, v_after, wa.currency, p_description,
    p_reference_id, p_reference_type, p_created_by
  from wallet_accounts wa where wa.id = v_wallet_id;

  return v_after;
end;
$$;

-- ── Helper: get balance ───────────────────────────────────────────────────────

create or replace function get_wallet_balance(p_workspace_id uuid)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(balance, 0)
  from wallet_accounts
  where workspace_id = p_workspace_id;
$$;

-- ── updated_at trigger ────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'wallet_accounts_updated_at' and tgrelid = 'wallet_accounts'::regclass
  ) then
    create trigger wallet_accounts_updated_at
      before update on wallet_accounts
      for each row execute function set_updated_at();
  end if;
end $$;
