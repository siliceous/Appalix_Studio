-- ============================================================
-- Migration 00031: Sage Reminders — calendar/follow-up prompts
-- ============================================================

create table if not exists sage_reminders (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  deal_id      uuid references sage_deals(id) on delete set null,
  contact_id   uuid references sage_contacts(id) on delete set null,
  title        text not null,
  note         text,
  due_at       timestamptz not null,
  is_sent      boolean not null default false,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists sage_reminders_workspace_due_idx
  on sage_reminders(workspace_id, due_at)
  where is_sent = false;
