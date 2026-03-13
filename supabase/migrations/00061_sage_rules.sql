-- Sage automation rules: condition-based routing for multi-pipeline support.
-- Each rule targets a channel (or 'any'), evaluates conditions against an item,
-- and overrides the default action / pipeline when matched.

create table sage_rules (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  name          text        not null,
  enabled       boolean     not null default true,

  -- 'any' means the rule applies to all channels
  channel       text        not null default 'any'
                            check (channel in ('email', 'bots', 'forms', 'tickets', 'any')),

  -- JSON array of conditions, e.g.:
  -- [{"field":"priority","op":"eq","value":"high"},{"field":"content","op":"contains","value":"enterprise"}]
  -- fields: priority | content | channel
  -- ops:    eq | contains | not_contains
  conditions    jsonb       not null default '[]',

  -- What to do when this rule matches
  action_type   text        not null default 'create_lead'
                            check (action_type in ('create_lead', 'create_ticket', 'ignore')),

  -- Override default pipeline (null = use workspace default)
  pipeline_id   uuid        references sage_pipelines(id) on delete set null,

  -- Send email notification to workspace owner when rule fires
  notify_owner  boolean     not null default false,

  -- Higher priority rules are evaluated first
  rule_priority integer     not null default 0,

  created_at    timestamptz not null default now()
);

-- Index for fast per-workspace lookup ordered by priority
create index sage_rules_workspace_priority_idx
  on sage_rules (workspace_id, rule_priority desc, created_at asc)
  where enabled = true;

alter table sage_rules enable row level security;

create policy "workspace members can view rules"
  on sage_rules for select
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_rules.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can manage rules"
  on sage_rules for insert
  with check (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_rules.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can update rules"
  on sage_rules for update
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_rules.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace members can delete rules"
  on sage_rules for delete
  using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = sage_rules.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
