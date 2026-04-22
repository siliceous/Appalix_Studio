-- ============================================================
-- Phase 1: Telnyx SMS infrastructure
-- New tables only — extends existing workspaces/conversations/messages
-- ============================================================

-- ---------- ENUMS ----------

do $$ begin
  create type usage_event_type as enum (
    'sms_outbound_segment',
    'sms_inbound_message',
    'voice_inbound_minute',
    'voice_outbound_minute',
    'voice_ai_stream_minute',
    'phone_number_month',
    'recording_minute',
    'transcription_minute',
    'carrier_surcharge',
    'manual_adjustment'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type rating_status as enum ('unrated', 'rated', 'invoiced', 'waived');
exception when duplicate_object then null;
end $$;

-- ---------- PHONE NUMBERS ----------

create table if not exists workspace_phone_numbers (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  provider             text not null default 'telnyx',
  provider_number_id   text,
  e164                 text not null unique,
  country_code         text,
  capabilities         jsonb not null default '{"sms": true, "voice": false, "mms": false}'::jsonb,
  messaging_profile_id text,
  connection_id        text,
  purchased_at         timestamptz,
  released_at          timestamptz,
  monthly_cost_override numeric(12,4),
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

create index if not exists idx_wpn_workspace on workspace_phone_numbers(workspace_id);
create index if not exists idx_wpn_e164      on workspace_phone_numbers(e164);

-- ---------- WEBHOOK EVENTS ----------

create table if not exists webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  event_type        text not null,
  provider_event_id text,
  signature_valid   boolean,
  payload           jsonb not null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  processing_status text not null default 'pending',
  error             text
);

create unique index if not exists uq_webhook_provider_event_id
  on webhook_events(provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists idx_webhook_events_received on webhook_events(received_at desc);
create index if not exists idx_webhook_events_status   on webhook_events(processing_status)
  where processing_status = 'pending';

-- ---------- USAGE EVENTS ----------

create table if not exists usage_events (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  source_table        text not null,
  source_id           uuid,
  provider            text not null,
  usage_type          usage_event_type not null,
  quantity            numeric(18,6) not null,
  unit                text not null,
  occurred_at         timestamptz not null default now(),
  provider_unit_cost  numeric(12,6),
  provider_cost_total numeric(12,6),
  sell_unit_price     numeric(12,6),
  sell_total          numeric(12,6),
  currency            text not null default 'AUD',
  rating_status       rating_status not null default 'unrated',
  meta                jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Backfill any missing columns if the table pre-existed with a different schema
alter table usage_events add column if not exists source_table        text not null default 'unknown';
alter table usage_events add column if not exists source_id           uuid;
alter table usage_events add column if not exists provider            text not null default 'telnyx';
alter table usage_events add column if not exists usage_type          usage_event_type not null default 'sms_outbound_segment';
alter table usage_events add column if not exists quantity            numeric(18,6) not null default 1;
alter table usage_events add column if not exists unit                text not null default 'segment';
alter table usage_events add column if not exists occurred_at         timestamptz not null default now();
alter table usage_events add column if not exists provider_unit_cost  numeric(12,6);
alter table usage_events add column if not exists provider_cost_total numeric(12,6);
alter table usage_events add column if not exists sell_unit_price     numeric(12,6);
alter table usage_events add column if not exists sell_total          numeric(12,6);
alter table usage_events add column if not exists currency            text not null default 'AUD';
alter table usage_events add column if not exists rating_status       rating_status not null default 'unrated';
alter table usage_events add column if not exists meta                jsonb not null default '{}'::jsonb;

create index if not exists idx_usage_events_workspace_occurred
  on usage_events(workspace_id, occurred_at desc);

create index if not exists idx_usage_events_unrated
  on usage_events(rating_status)
  where rating_status = 'unrated';

create index if not exists idx_usage_events_source
  on usage_events(source_table, source_id)
  where source_id is not null;

-- ---------- BILLING RATE CARDS ----------

create table if not exists billing_rate_cards (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade,
  name           text not null,
  effective_from timestamptz not null,
  effective_to   timestamptz,
  currency       text not null default 'AUD',
  rates          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists idx_billing_rate_cards_workspace
  on billing_rate_cards(workspace_id, effective_from desc);

-- ---------- PROVIDER COST RATE CARDS ----------

create table if not exists provider_cost_rate_cards (
  id             uuid primary key default gen_random_uuid(),
  provider       text not null,
  region         text,
  effective_from timestamptz not null,
  effective_to   timestamptz,
  currency       text not null default 'AUD',
  rates          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists idx_provider_cost_rate_cards_provider
  on provider_cost_rate_cards(provider, effective_from desc);

-- ---------- RLS ----------

alter table workspace_phone_numbers  enable row level security;
alter table webhook_events           enable row level security;
alter table usage_events             enable row level security;
alter table billing_rate_cards       enable row level security;
alter table provider_cost_rate_cards enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'workspace_phone_numbers'
      and policyname = 'workspace members read phone numbers'
  ) then
    create policy "workspace members read phone numbers"
      on workspace_phone_numbers for select
      using (workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'usage_events'
      and policyname = 'workspace members read usage events'
  ) then
    create policy "workspace members read usage events"
      on usage_events for select
      using (workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'billing_rate_cards'
      and policyname = 'workspace members read rate cards'
  ) then
    create policy "workspace members read rate cards"
      on billing_rate_cards for select
      using (
        workspace_id is null
        or workspace_id in (
          select workspace_id from workspace_members where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ---------- SEED DATA ----------
-- Only insert if no rows exist yet to avoid duplicates on re-run.

insert into provider_cost_rate_cards (provider, region, effective_from, currency, rates)
select * from (values
  (
    'telnyx', 'AU', now(), 'AUD',
    '{"sms_outbound_segment":{"unit_price":0.0080},"sms_inbound_message":{"unit_price":0.0040},"phone_number_month":{"unit_price":1.5000}}'::jsonb
  ),
  (
    'telnyx', 'US', now(), 'AUD',
    '{"sms_outbound_segment":{"unit_price":0.0060},"sms_inbound_message":{"unit_price":0.0030},"phone_number_month":{"unit_price":1.5000}}'::jsonb
  ),
  (
    'telnyx', 'GB', now(), 'AUD',
    '{"sms_outbound_segment":{"unit_price":0.0120},"sms_inbound_message":{"unit_price":0.0060},"phone_number_month":{"unit_price":2.0000}}'::jsonb
  )
) as v(provider, region, effective_from, currency, rates)
where not exists (
  select 1 from provider_cost_rate_cards where provider = 'telnyx'
);

insert into billing_rate_cards (workspace_id, name, effective_from, currency, rates)
select null, 'Default AUD', now(), 'AUD',
  '{"sms_outbound_segment":{"unit_price":0.0200},"sms_inbound_message":{"unit_price":0.0100},"voice_inbound_minute":{"unit_price":0.0500,"min_increment_sec":60},"voice_outbound_minute":{"unit_price":0.0600,"min_increment_sec":60},"voice_ai_stream_minute":{"unit_price":0.2000},"phone_number_month":{"unit_price":5.0000}}'::jsonb
where not exists (
  select 1 from billing_rate_cards where workspace_id is null and name = 'Default AUD'
);
