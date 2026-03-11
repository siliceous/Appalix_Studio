-- Per-user assignment for conversations and leads.
-- assigned_to: the workspace member responsible for handling this item.
-- Nullable — unassigned means visible to owner/admin only (not scoped).

-- ── conversations ─────────────────────────────────────────────────────────────
alter table conversations
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists idx_conversations_assigned_to
  on conversations (workspace_id, assigned_to);

comment on column conversations.assigned_to is 'Workspace member assigned to handle this conversation';

-- ── leads ─────────────────────────────────────────────────────────────────────
alter table leads
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists idx_leads_assigned_to
  on leads (workspace_id, assigned_to);

comment on column leads.assigned_to is 'Workspace member assigned to follow up on this lead';
