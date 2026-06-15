-- Create tavus_replicas table for storing actor replicas
CREATE TABLE IF NOT EXISTS tavus_replicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tavus_replica_id TEXT NOT NULL UNIQUE,
  replica_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'processing', 'ready', 'error')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tavus_replicas_workspace_id ON tavus_replicas(workspace_id);
CREATE INDEX idx_tavus_replicas_status ON tavus_replicas(status);
CREATE INDEX idx_tavus_replicas_created_at ON tavus_replicas(created_at DESC);

-- RLS Policies
ALTER TABLE tavus_replicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace replicas"
  ON tavus_replicas
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create replicas in their workspace"
  ON tavus_replicas
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update replicas in their workspace"
  ON tavus_replicas
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete replicas in their workspace"
  ON tavus_replicas
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tavus_replicas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tavus_replicas_updated_at_trigger
BEFORE UPDATE ON tavus_replicas
FOR EACH ROW
EXECUTE FUNCTION update_tavus_replicas_updated_at();
