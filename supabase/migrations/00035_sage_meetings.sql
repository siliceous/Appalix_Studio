-- Meetings extracted from .ics calendar attachments in inbound emails
create table if not exists sage_meetings (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  email_id        uuid references sage_emails(id) on delete cascade,
  ics_uid         text,
  title           text not null,
  start_at        timestamptz,
  end_at          timestamptz,
  location        text,
  description     text,
  organizer       text,       -- email address of organiser
  organizer_name  text,       -- display name of organiser
  attendees       text[],     -- array of attendee email addresses
  created_at      timestamptz not null default now()
);

create index on sage_meetings(workspace_id, start_at);
create index on sage_meetings(email_id);

-- Deduplicate by ics_uid per workspace (same calendar event arriving on multiple sync runs)
create unique index on sage_meetings(workspace_id, ics_uid) where ics_uid is not null;
