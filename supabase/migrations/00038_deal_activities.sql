-- Deal activities (notes, calls, meetings, tasks) per deal
create table if not exists sage_deal_activities (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  deal_id      uuid not null references sage_deals(id) on delete cascade,
  type         text not null check (type in ('note','call','meeting','task')),
  title        text,
  body         text,
  due_at       timestamptz,
  completed_at timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists sage_deal_activities_deal_id_idx
  on sage_deal_activities(deal_id, created_at desc);

-- Won/Lost reason tracking on deals
alter table sage_deals
  add column if not exists lost_reason text,
  add column if not exists won_at      timestamptz,
  add column if not exists lost_at     timestamptz;
