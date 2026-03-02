-- Sage Email Intelligence: stores emails fetched from connected Gmail/Outlook accounts
-- AI fields (priority, summary, insights, reply_drafts) are populated by Claude after sync

create table if not exists sage_emails (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  contact_id      uuid        references sage_contacts(id) on delete set null,
  deal_id         uuid        references sage_deals(id) on delete set null,
  message_id      text        not null,          -- RFC 2822 Message-ID header (de-duplication key)
  thread_id       text,                          -- for future thread grouping
  from_address    text        not null,
  from_name       text,
  to_address      text        not null,
  subject         text        not null default '(no subject)',
  body_text       text,
  body_html       text,
  received_at     timestamptz not null,
  direction       text        not null default 'inbound' check (direction in ('inbound', 'outbound')),
  is_read         boolean     not null default false,
  is_starred      boolean     not null default false,
  -- AI analysis fields (null until analyzeEmail() runs)
  ai_priority     text        check (ai_priority in ('high', 'medium', 'low')),
  ai_summary      text,
  ai_insights     jsonb,      -- string[]
  ai_reply_drafts jsonb,      -- {tone: string, body: string}[]
  ai_analyzed_at  timestamptz,
  created_at      timestamptz not null default now()
);

-- Deduplication: one row per (workspace, message-id)
create unique index if not exists sage_emails_workspace_message_id
  on sage_emails(workspace_id, message_id);

-- Hot path: inbox list ordered by time
create index if not exists sage_emails_workspace_received
  on sage_emails(workspace_id, received_at desc);

-- Filter by AI priority
create index if not exists sage_emails_workspace_priority
  on sage_emails(workspace_id, ai_priority)
  where ai_priority is not null;

-- Join from contact detail pages
create index if not exists sage_emails_contact
  on sage_emails(contact_id)
  where contact_id is not null;
