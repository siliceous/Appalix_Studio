-- sage_documents: quotes, packing lists, invoices
create table if not exists sage_documents (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  doc_type            text not null check (doc_type in ('quote','packing_list','invoice')),
  doc_number          text not null,
  project_id          uuid references sage_projects(id) on delete set null,
  contact_id          uuid references sage_contacts(id) on delete set null,
  company_id          uuid references sage_companies(id) on delete set null,
  quote_id            uuid references sage_documents(id) on delete set null,
  status              text not null default 'draft' check (status in ('draft','sent','accepted','declined','invoiced','paid','partial','overdue','void')),
  currency            text not null default 'USD',
  subtotal            numeric(12,2) not null default 0,
  discount_type       text not null default 'percent' check (discount_type in ('percent','fixed')),
  discount_value      numeric(12,2) not null default 0,
  tax_rate            numeric(5,2) not null default 0,
  tax_amount          numeric(12,2) not null default 0,
  total               numeric(12,2) not null default 0,
  issue_date          date not null default current_date,
  due_date            date,
  valid_until         date,
  notes               text,
  terms               text,
  stripe_customer_id  text,
  stripe_invoice_id   text,
  stripe_payment_link text,
  sent_at             timestamptz,
  accepted_at         timestamptz,
  paid_at             timestamptz,
  viewed_at           timestamptz,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create table if not exists sage_document_items (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references sage_documents(id) on delete cascade,
  description text not null default '',
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  amount      numeric(12,2) generated always as (quantity * unit_price) stored,
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);

alter table sage_documents      enable row level security;
alter table sage_document_items enable row level security;

create policy "workspace members manage documents"
  on sage_documents for all
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members manage document items"
  on sage_document_items for all
  using (document_id in (
    select id from sage_documents where workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  ));

create or replace function update_sage_document_timestamp()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_sage_document_updated_at
  before update on sage_documents
  for each row execute function update_sage_document_timestamp();
