-- ============================================================
-- Outbound AI Agent Call Campaigns
-- Supports both single ad-hoc calls and bulk campaigns
-- ============================================================

-- Campaign metadata for bulk outbound calls
create table if not exists outbound_campaigns (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  voice_agent_id    uuid not null references voice_agents(id) on delete cascade,
  name              text not null,
  description       text,

  -- Campaign parameters
  status            text not null default 'draft', -- 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'
  contact_list_url  text,  -- S3 URL to CSV file (for bulk campaigns)
  total_contacts    integer default 0,

  -- Calling rules
  calls_per_minute  integer not null default 5,
  retry_on_failure  boolean not null default true,
  max_retries       integer not null default 3,

  -- Campaign timing
  scheduled_start   timestamptz,
  scheduled_end     timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,

  -- Stats
  calls_initiated   integer not null default 0,
  calls_completed   integer not null default 0,
  calls_failed      integer not null default 0,
  avg_duration_sec  integer,

  metadata          jsonb not null default '{}',  -- custom campaign config
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Individual call records for both ad-hoc and campaign calls
create table if not exists outbound_call_records (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  campaign_id       uuid references outbound_campaigns(id) on delete set null,
  call_session_id   uuid references call_sessions(id) on delete set null,

  contact_id        uuid references contacts(id) on delete set null,
  to_phone_number   text not null,  -- E.164 format

  status            text not null default 'pending',  -- pending | initiated | ringing | answered | completed | failed | cancelled
  attempt_number    integer not null default 1,

  -- Call outcomes
  answered          boolean default false,
  duration_seconds  integer,
  hangup_cause      text,

  -- Context passed to AI agent
  contact_data      jsonb,  -- {name, email, company, ...}
  custom_context    jsonb,  -- campaign-specific context

  scheduled_at      timestamptz,
  initiated_at      timestamptz,
  answered_at       timestamptz,
  completed_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes
create index if not exists idx_outbound_campaigns_workspace
  on outbound_campaigns(workspace_id, status);

create index if not exists idx_outbound_campaigns_agent
  on outbound_campaigns(voice_agent_id);

create index if not exists idx_outbound_call_records_campaign
  on outbound_call_records(campaign_id, status);

create index if not exists idx_outbound_call_records_workspace
  on outbound_call_records(workspace_id, created_at desc);

create index if not exists idx_outbound_call_records_status
  on outbound_call_records(status)
  where status not in ('completed', 'failed', 'cancelled');

-- RLS
alter table outbound_campaigns enable row level security;
alter table outbound_call_records enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'outbound_campaigns'
      and policyname = 'workspace members manage outbound campaigns'
  ) then
    create policy "workspace members manage outbound campaigns"
      on outbound_campaigns for all
      using (workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'outbound_call_records'
      and policyname = 'workspace members read outbound call records'
  ) then
    create policy "workspace members read outbound call records"
      on outbound_call_records for all
      using (workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      ));
  end if;
end $$;

-- Timestamp triggers
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'outbound_campaigns_updated_at'
  ) then
    create trigger outbound_campaigns_updated_at
      before update on outbound_campaigns
      for each row execute procedure touch_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'outbound_call_records_updated_at'
  ) then
    create trigger outbound_call_records_updated_at
      before update on outbound_call_records
      for each row execute procedure touch_updated_at();
  end if;
end $$;
