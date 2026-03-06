-- ============================================================
-- Migration 00040: Atomic message_count increment helper
-- Called by apps/api/src/lib/conversation.ts appendMessage()
-- ============================================================

create or replace function increment_conversation_message_count(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update conversations
  set
    message_count    = message_count + 1,
    last_activity_at = now()
  where id = p_id;
$$;
