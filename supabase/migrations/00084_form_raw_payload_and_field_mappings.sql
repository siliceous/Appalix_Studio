-- ─────────────────────────────────────────────────────────────────────────────
-- Two-layer form submission storage
--
-- Layer 1 — raw_payload  : exact payload as received from the webhook / import
-- Layer 2 — fields       : normalized Appalix standard fields (name, email, …)
--
-- For existing rows the raw_payload is back-filled from fields so nothing is lost.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add raw_payload column and back-fill from existing fields
alter table sage_form_submissions
  add column if not exists raw_payload jsonb not null default '{}';

update sage_form_submissions
  set raw_payload = fields
  where raw_payload = '{}';

-- 2. Field-mapping table
--    Persists detected + user-confirmed mappings between source keys and
--    Appalix standard fields for each connected form.
create table if not exists sage_form_field_mappings (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  form_id         uuid        references sage_forms(id) on delete cascade,
  -- source_key:   the key as it arrives in the webhook (e.g. "1", "email_address")
  source_key      text        not null,
  source_label    text,                     -- human label if available from the platform
  source_type     text        default 'text', -- text | email | phone | textarea | checkbox | …
  -- appalix_field: standard Appalix key this maps to, null = unmapped / custom
  appalix_field   text,
  -- ui toggles
  show_in_listing boolean     not null default false,
  show_in_detail  boolean     not null default true,
  hidden          boolean     not null default false,
  display_order   int         not null default 0,
  created_at      timestamptz not null default now(),
  unique(form_id, source_key)
);

create index if not exists sage_form_field_mappings_form_idx
  on sage_form_field_mappings(form_id);

create index if not exists sage_form_field_mappings_workspace_idx
  on sage_form_field_mappings(workspace_id);

-- RLS: workspace members can read/write their own mappings
alter table sage_form_field_mappings enable row level security;

create policy "workspace members can manage field mappings"
  on sage_form_field_mappings
  for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
