-- ── billing_next_at on workspace_phone_numbers ────────────────────────────────
-- Tracks when the next monthly rental charge is due per number.
-- A nightly job queries WHERE billing_next_at <= now() AND released_at IS NULL,
-- charges the wallet, and rolls billing_next_at forward by 30 days.

alter table workspace_phone_numbers
  add column if not exists billing_next_at timestamptz;

-- Backfill: first renewal due 30 days after purchase
update workspace_phone_numbers
set    billing_next_at = coalesce(purchased_at, created_at) + interval '30 days'
where  billing_next_at is null
  and  released_at     is null;

create index if not exists idx_wpn_billing_next_at
  on workspace_phone_numbers (billing_next_at)
  where released_at is null;

-- ── Provider voice cost rates ──────────────────────────────────────────────────
-- Seed voice costs into provider_cost_rate_cards so usage-ledger can calculate
-- Appalix margin on voice calls. Only inserts the AU global row; expand per
-- region or provider as needed.

insert into provider_cost_rate_cards (provider, region, effective_from, currency, rates)
select 'telnyx', 'AU', now(), 'AUD',
  '{
    "sms_outbound_segment":  {"unit_price": 0.0080},
    "sms_inbound_message":   {"unit_price": 0.0040},
    "phone_number_month":    {"unit_price": 1.5000},
    "voice_inbound_minute":  {"unit_price": 0.0050, "min_increment_sec": 60},
    "voice_outbound_minute": {"unit_price": 0.0080, "min_increment_sec": 60},
    "voice_ai_stream_minute":{"unit_price": 0.0300}
  }'::jsonb
where not exists (
  select 1 from provider_cost_rate_cards
  where  provider = 'telnyx' and region = 'AU'
);

-- Patch existing Telnyx AU row to add voice rates if it was missing them
update provider_cost_rate_cards
set    rates = rates ||
  '{
    "voice_inbound_minute":  {"unit_price": 0.0050, "min_increment_sec": 60},
    "voice_outbound_minute": {"unit_price": 0.0080, "min_increment_sec": 60},
    "voice_ai_stream_minute":{"unit_price": 0.0300}
  }'::jsonb
where  provider = 'telnyx'
  and  not (rates ? 'voice_inbound_minute');
