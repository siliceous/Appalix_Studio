-- Enable pgvector if not already (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- Record summaries cache (AI-generated per entity)
CREATE TABLE IF NOT EXISTS sage_record_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type     text NOT NULL CHECK (entity_type IN ('contact','deal','ticket','company','conversation')),
  entity_id       uuid NOT NULL,
  summary         text NOT NULL,
  key_facts       jsonb NOT NULL DEFAULT '[]',
  generated_at    timestamptz NOT NULL DEFAULT now(),
  model           text,
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_sage_record_summaries_workspace ON sage_record_summaries(workspace_id);

-- Sage CRM embeddings (separate from RAG chunks table)
CREATE TABLE IF NOT EXISTS sage_embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type     text NOT NULL CHECK (entity_type IN ('contact','deal','ticket','company','conversation','email')),
  entity_id       uuid NOT NULL,
  content         text NOT NULL,
  embedding       vector(1536),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_sage_embeddings_workspace ON sage_embeddings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sage_embeddings_vector ON sage_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Action audit log
CREATE TABLE IF NOT EXISTS sage_action_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  action_type     text NOT NULL,
  entity_type     text,
  entity_id       uuid,
  input_query     text,
  action_payload  jsonb NOT NULL DEFAULT '{}',
  result_payload  jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','pending')),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sage_action_logs_workspace ON sage_action_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sage_action_logs_user ON sage_action_logs(user_id, created_at DESC);

-- Proactive alerts
CREATE TABLE IF NOT EXISTS sage_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  alert_type      text NOT NULL CHECK (alert_type IN ('hot_lead','stale_deal','overdue_task','unassigned_deal','unassigned_ticket','deal_closing_soon','high_priority_email','idle_contact')),
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  title           text NOT NULL,
  body            text,
  priority        text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  is_dismissed    boolean NOT NULL DEFAULT false,
  dismissed_by    uuid REFERENCES auth.users(id),
  dismissed_at    timestamptz,
  expires_at      timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sage_alerts_workspace ON sage_alerts(workspace_id, is_dismissed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sage_alerts_entity ON sage_alerts(entity_type, entity_id);

-- Daily and weekly briefings cache
CREATE TABLE IF NOT EXISTS sage_briefings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  briefing_type   text NOT NULL CHECK (briefing_type IN ('daily','weekly')),
  briefing_date   date NOT NULL,
  content         text NOT NULL,
  sections        jsonb NOT NULL DEFAULT '[]',
  stats           jsonb NOT NULL DEFAULT '{}',
  generated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, briefing_type, briefing_date)
);
CREATE INDEX IF NOT EXISTS idx_sage_briefings_lookup ON sage_briefings(workspace_id, user_id, briefing_type, briefing_date DESC);
