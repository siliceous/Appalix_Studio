-- Migration: Add AI analysis fields to conversations table
-- Mirrors the ai_* columns on sage_emails for the bot conversation triage feature.

alter table conversations
  add column if not exists ai_priority    text check (ai_priority in ('high','medium','low')),
  add column if not exists ai_summary     text,
  add column if not exists ai_insights    jsonb,
  add column if not exists ai_action      text,
  add column if not exists ai_entities    jsonb,
  add column if not exists ai_analyzed_at timestamptz;

create index if not exists conversations_ai_priority_idx
  on conversations(workspace_id, ai_priority);
