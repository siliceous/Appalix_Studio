-- Soft-delete support for conversations, form submissions, and tickets
-- Deleted items are kept for 3 days then can be permanently purged

alter table conversations
  add column if not exists deleted_at timestamptz;

alter table sage_form_submissions
  add column if not exists deleted_at timestamptz;

alter table sage_tickets
  add column if not exists deleted_at timestamptz;

-- Indexes to efficiently query trash (deleted_at IS NOT NULL and recent)
create index if not exists conversations_deleted_idx
  on conversations(workspace_id, deleted_at)
  where deleted_at is not null;

create index if not exists sage_form_submissions_deleted_idx
  on sage_form_submissions(workspace_id, deleted_at)
  where deleted_at is not null;

create index if not exists sage_tickets_deleted_idx
  on sage_tickets(workspace_id, deleted_at)
  where deleted_at is not null;
