-- ─────────────────────────────────────────────────────────────────────────────
-- Email Marketing — Phase 1: Campaigns, Batches, Recipients, Usage Metering
-- ─────────────────────────────────────────────────────────────────────────────

-- Core campaign record
create table if not exists email_campaigns (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  name                 text not null,
  campaign_type        text not null default 'newsletter',
    -- newsletter | promotion | announcement | re_engagement | event | case_study | seasonal | custom
  subject              text not null,
  preview_text         text,
  body_html            text not null default '',
  body_text            text,
  from_name            text not null,
  from_email           text not null,
  reply_to             text,
  -- Recipient filter (stored as jsonb for flexibility: { all: true } | { tags: ['lead','vip'] })
  recipient_filter     jsonb not null default '{"all": true}',
  status               text not null default 'draft',
    -- draft | scheduled | sending | paused | completed | failed
  scheduled_at         timestamptz,
  sent_at              timestamptz,
  -- Aggregate counters (denormalised for fast dashboard reads)
  total_recipients     integer not null default 0,
  sent_count           integer not null default 0,
  delivered_count      integer not null default 0,
  opened_count         integer not null default 0,
  clicked_count        integer not null default 0,
  bounced_count        integer not null default 0,
  complained_count     integer not null default 0,
  unsubscribed_count   integer not null default 0,
  failed_count         integer not null default 0,
  -- AI / deliverability (Phase 4+)
  ai_score             numeric(5,2),
  deliverability_score numeric(5,2),
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Batch tracking — each campaign is split into ≤100-recipient batches
create table if not exists email_send_batches (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  campaign_id      uuid not null references email_campaigns(id) on delete cascade,
  batch_number     integer not null,
  recipient_count  integer not null default 0,
  status           text not null default 'pending',
    -- pending | sending | completed | failed | paused
  send_after       timestamptz not null default now(),
  sent_count       integer not null default 0,
  failed_count     integer not null default 0,
  opened_count     integer not null default 0,
  clicked_count    integer not null default 0,
  bounced_count    integer not null default 0,
  complained_count integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Per-recipient record — one row per contact per campaign
create table if not exists email_campaign_recipients (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  campaign_id     uuid not null references email_campaigns(id) on delete cascade,
  batch_id        uuid references email_send_batches(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  email           text not null,
  name            text,
  status          text not null default 'pending',
    -- pending | sent | delivered | opened | clicked | bounced | complained | unsubscribed | failed
  resend_email_id text,          -- Resend email ID; used for webhook correlation
  sent_at         timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  bounced_at      timestamptz,
  bounce_type     text,          -- hard | soft
  bounce_reason   text,
  complained_at   timestamptz,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

-- Usage metering — one row per workspace per billing month
create table if not exists email_usage_metering (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  billing_period          text not null,   -- YYYY-MM
  emails_sent             integer not null default 0,
  campaign_emails_sent    integer not null default 0,
  automation_emails_sent  integer not null default 0,
  contacts_count          integer not null default 0,
  ai_generations_count    integer not null default 0,
  overage_amount          numeric(10,2)    default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (workspace_id, billing_period)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_email_campaigns_workspace
  on email_campaigns (workspace_id, created_at desc);
create index if not exists idx_email_campaigns_status
  on email_campaigns (workspace_id, status);
create index if not exists idx_email_send_batches_campaign
  on email_send_batches (campaign_id, batch_number);
create index if not exists idx_email_send_batches_status
  on email_send_batches (status, send_after) where status = 'pending';
create index if not exists idx_email_campaign_recipients_campaign
  on email_campaign_recipients (campaign_id);
create index if not exists idx_email_campaign_recipients_resend_id
  on email_campaign_recipients (resend_email_id) where resend_email_id is not null;
create index if not exists idx_email_campaign_recipients_contact
  on email_campaign_recipients (contact_id) where contact_id is not null;
create index if not exists idx_email_usage_workspace_period
  on email_usage_metering (workspace_id, billing_period);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table email_campaigns           enable row level security;
alter table email_send_batches        enable row level security;
alter table email_campaign_recipients enable row level security;
alter table email_usage_metering      enable row level security;

create policy "workspace members can manage email campaigns"
  on email_campaigns for all
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can manage send batches"
  on email_send_batches for all
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can view campaign recipients"
  on email_campaign_recipients for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can view usage metering"
  on email_usage_metering for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));
