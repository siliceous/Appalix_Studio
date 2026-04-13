-- Phone voice agents (inbound / outbound phone bots)
create table if not exists voice_agents (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  type         text not null default 'inbound',  -- 'inbound' | 'outbound' | 'both'
  phone_number text,
  bot_id       uuid references bots(id) on delete set null,
  preset       text,   -- 'receptionist' | 'sales' | 'support' | 'booking' | 'lead_capture'
  goal         text,   -- 'book_meeting' | 'capture_lead' | 'resolve_ticket' | 'sales_pitch' | 'take_message' | 'route_human'
  is_active    boolean not null default false,
  config       jsonb,  -- capture_fields, escalation_rules, working_hours, greeting_script, etc.
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Voice knowledge entries (FAQs, scripts, objections, phrases)
create table if not exists voice_knowledge_entries (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  bot_id       uuid references bots(id) on delete cascade,
  voice_agent_id uuid references voice_agents(id) on delete cascade,
  category     text not null,  -- 'faq' | 'objection' | 'booking' | 'escalation' | 'script' | 'compliance' | 'fallback' | 'greeting'
  title        text not null,
  content      text not null,
  usage_type   text not null default 'auto',  -- 'auto' | 'manual' | 'always'
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS
alter table voice_agents           enable row level security;
alter table voice_knowledge_entries enable row level security;

-- workspace-scoped access
create policy "workspace members can manage voice agents"
  on voice_agents for all
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "workspace members can manage voice knowledge"
  on voice_knowledge_entries for all
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

-- Timestamp trigger
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger voice_agents_updated_at
  before update on voice_agents
  for each row execute procedure touch_updated_at();

create trigger voice_knowledge_updated_at
  before update on voice_knowledge_entries
  for each row execute procedure touch_updated_at();
