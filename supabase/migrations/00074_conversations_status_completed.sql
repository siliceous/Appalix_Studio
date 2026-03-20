-- Replace 'closed' with 'completed' in the conversations status check constraint
-- The UI uses 'completed' but the DB only allowed 'active', 'closed', 'archived'

alter table conversations
  drop constraint if exists conversations_status_check;

-- Migrate any existing 'closed' rows to 'completed'
update conversations set status = 'completed' where status = 'closed';

alter table conversations
  add constraint conversations_status_check
  check (status in ('active', 'completed', 'archived'));
