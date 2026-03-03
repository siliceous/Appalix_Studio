-- Extend sage_emails with all columns the application code expects.
-- Migration 00032 only created ai_priority, ai_summary, ai_insights,
-- ai_reply_drafts, ai_analyzed_at.  These additions are required for the
-- email triage feature to function at all.

alter table sage_emails
  -- Soft-delete: dashboard filters is_trashed=false; without this column
  -- every email query fails and returns 0 rows.
  add column if not exists is_trashed     boolean     not null default false,

  -- AI analysis fields
  add column if not exists ai_reason      text,        -- one sentence: why this priority
  add column if not exists ai_action      text,        -- 'create_lead'|'update_lead'|'reopen'|'create_ticket'|'reply_draft'|'ignore'
  add column if not exists ai_entities    jsonb,       -- {name,company,email,phone,website,product_interest,intent_signals[],urgency_signals[]}
  add column if not exists ai_category    text,        -- 'Sales'|'Support'|'Other'
  add column if not exists ai_user_prompt text;        -- short prompt shown to user: "Create lead?"

-- Index for the trash filter (common query path)
create index if not exists sage_emails_not_trashed
  on sage_emails(workspace_id, received_at desc)
  where is_trashed = false;
