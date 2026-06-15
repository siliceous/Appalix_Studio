-- Create tavus_videos table for storing generated videos
CREATE TABLE IF NOT EXISTS tavus_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tavus_video_id TEXT NOT NULL UNIQUE,
  script TEXT NOT NULL,
  replica_id UUID NOT NULL REFERENCES tavus_replicas(id) ON DELETE CASCADE,
  voice_id UUID NOT NULL REFERENCES tavus_voices(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'completed', 'error')),
  video_url TEXT,
  thumbnail_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tavus_videos_workspace_id ON tavus_videos(workspace_id);
CREATE INDEX idx_tavus_videos_status ON tavus_videos(status);
CREATE INDEX idx_tavus_videos_replica_id ON tavus_videos(replica_id);
CREATE INDEX idx_tavus_videos_voice_id ON tavus_videos(voice_id);
CREATE INDEX idx_tavus_videos_created_at ON tavus_videos(created_at DESC);

-- RLS Policies
ALTER TABLE tavus_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace videos"
  ON tavus_videos
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create videos in their workspace"
  ON tavus_videos
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update videos in their workspace"
  ON tavus_videos
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete videos in their workspace"
  ON tavus_videos
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tavus_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tavus_videos_updated_at_trigger
BEFORE UPDATE ON tavus_videos
FOR EACH ROW
EXECUTE FUNCTION update_tavus_videos_updated_at();
