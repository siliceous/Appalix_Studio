-- Create tavus_voices table for storing voice replicas
CREATE TABLE IF NOT EXISTS tavus_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tavus_voice_id TEXT NOT NULL UNIQUE,
  voice_name TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('training', 'ready', 'error')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tavus_voices_workspace_id ON tavus_voices(workspace_id);
CREATE INDEX idx_tavus_voices_status ON tavus_voices(status);
CREATE INDEX idx_tavus_voices_created_at ON tavus_voices(created_at DESC);

-- RLS Policies
ALTER TABLE tavus_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace voices"
  ON tavus_voices
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create voices in their workspace"
  ON tavus_voices
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update voices in their workspace"
  ON tavus_voices
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete voices in their workspace"
  ON tavus_voices
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tavus_voices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tavus_voices_updated_at_trigger
BEFORE UPDATE ON tavus_voices
FOR EACH ROW
EXECUTE FUNCTION update_tavus_voices_updated_at();
