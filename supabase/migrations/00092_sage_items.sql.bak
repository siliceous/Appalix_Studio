-- sage_items: reusable item / product catalog
create table if not exists sage_items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  item_code    text not null,
  description  text not null default '',
  category     text,
  job          text,
  tax_code     text,
  unit         text,
  unit_price   numeric(12,2) not null default 0,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, item_code)
);

alter table sage_items enable row level security;

create policy "workspace members manage sage_items"
  on sage_items for all
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

-- ── Extend sage_document_items ────────────────────────────────────────────────
-- Drop the old generated amount column so we can add discount first
alter table sage_document_items drop column if exists amount;

alter table sage_document_items
  add column if not exists item_code text,
  add column if not exists category  text,
  add column if not exists job       text,
  add column if not exists tax_code  text,
  add column if not exists unit      text,
  add column if not exists discount  numeric(5,2) not null default 0;

-- Recreate amount as generated: qty × price × (1 − discount%)
alter table sage_document_items
  add column amount numeric(12,2) generated always as (
    quantity * unit_price * (1 - discount / 100)
  ) stored;

-- ── Extend sage_documents ─────────────────────────────────────────────────────
alter table sage_documents
  add column if not exists customer_po   text,
  add column if not exists tax_inclusive boolean not null default false,
  add column if not exists amount_paid   numeric(12,2) not null default 0,
  add column if not exists attachments   jsonb not null default '[]'::jsonb;
