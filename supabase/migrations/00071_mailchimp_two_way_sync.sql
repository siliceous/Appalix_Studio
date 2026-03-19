-- Two-way Mailchimp sync support

-- Sync toggle + last sync timestamp on integrations
alter table sage_integrations
  add column if not exists sync_enabled   boolean     not null default false,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_sync_count int         not null default 0;

-- Track which Mailchimp member each contact maps to + soft-delete grace period
alter table sage_contacts
  add column if not exists mailchimp_member_id text,
  add column if not exists sync_deleted_at     timestamptz;
