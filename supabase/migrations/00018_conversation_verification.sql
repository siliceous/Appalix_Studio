-- Tracks identity verification for sensitive-query access control.
-- When a visitor provides their registered team email and it matches
-- a workspace member, we mark the conversation as verified.

alter table conversations
  add column if not exists verified_user_email  text,
  add column if not exists verified_user_name   text,
  add column if not exists verified_at          timestamptz;

create index if not exists idx_conversations_verified
  on conversations(workspace_id, verified_user_email)
  where verified_user_email is not null;
