-- Sage Forms: embeddable lead-capture forms + AI-triaged submissions
-- Run this in Supabase SQL Editor

create table if not exists sage_forms (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists sage_forms_workspace_idx on sage_forms(workspace_id);

create table if not exists sage_form_submissions (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  form_id        uuid not null references sage_forms(id) on delete cascade,
  -- Submitted fields (name, email, phone, company, message + any extras)
  fields         jsonb not null default '{}',
  -- AI analysis
  ai_priority    text check (ai_priority in ('high', 'medium', 'low')),
  ai_summary     text,
  ai_insights    jsonb,          -- string[]
  ai_action      text,           -- 'create_lead' | 'create_ticket' | 'ignore'
  ai_entities    jsonb,          -- {name, email, phone, product_interest}
  ai_analyzed_at timestamptz,
  -- CRM action taken
  actioned_at    timestamptz,
  action_type    text,           -- 'lead' | 'ticket' | 'ignored'
  created_at     timestamptz not null default now()
);
create index if not exists sage_form_submissions_form_idx      on sage_form_submissions(form_id, created_at desc);
create index if not exists sage_form_submissions_workspace_idx on sage_form_submissions(workspace_id, ai_priority);
