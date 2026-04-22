-- ============================================================
-- Phase 2: Voice call sessions
-- Tracks every inbound/outbound Telnyx call end-to-end
-- ============================================================

create table if not exists call_sessions (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references workspaces(id) on delete cascade,
  phone_number_id         uuid references workspace_phone_numbers(id) on delete set null,
  voice_agent_id          uuid references voice_agents(id) on delete set null,
  telnyx_call_control_id  text not null unique,
  telnyx_connection_id    text,
  from_e164               text not null,
  to_e164                 text not null,
  direction               text not null default 'inbound',   -- 'inbound' | 'outbound'
  status                  text not null default 'initiated', -- initiated | answered | streaming | ended | failed | rejected
  answered_at             timestamptz,
  ended_at                timestamptz,
  duration_seconds        integer,
  hangup_cause            text,
  transcript              jsonb not null default '[]'::jsonb, -- [{role, text, ts}]
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists idx_call_sessions_workspace
  on call_sessions(workspace_id, created_at desc);

create index if not exists idx_call_sessions_status
  on call_sessions(status)
  where status not in ('ended', 'failed', 'rejected');

-- RLS
alter table call_sessions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'call_sessions'
      and policyname = 'workspace members read call sessions'
  ) then
    create policy "workspace members read call sessions"
      on call_sessions for select
      using (workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
      ));
  end if;
end $$;
