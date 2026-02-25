-- Automation config column on workspaces (email provider, approver config, etc.)
alter table workspaces
  add column if not exists automation_config jsonb not null default '{}';

-- Log of emails sent via the send_email AI tool
create table if not exists emails_sent (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references workspaces(id) on delete cascade,
  conversation_id      uuid,
  to_address           text not null,
  subject              text not null,
  provider             text not null default 'resend',
  provider_message_id  text,
  sent_at              timestamptz not null default now()
);

alter table emails_sent enable row level security;

create policy "workspace members can view emails_sent"
  on emails_sent for select
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = emails_sent.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Approval requests created via the request_approval AI tool
create table if not exists approval_requests (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  conversation_id  uuid,
  title            text not null,
  description      text,
  metadata         jsonb not null default '{}',
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  channel          text not null,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

alter table approval_requests enable row level security;

create policy "workspace members can manage approval_requests"
  on approval_requests for all
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = approval_requests.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create index if not exists idx_emails_sent_workspace on emails_sent(workspace_id);
create index if not exists idx_approval_requests_workspace on approval_requests(workspace_id);
create index if not exists idx_approval_requests_status on approval_requests(status);
