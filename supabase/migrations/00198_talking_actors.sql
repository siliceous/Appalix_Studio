-- Create talking_actors table for storing actor profiles with images/videos
CREATE TABLE IF NOT EXISTS talking_actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  video_url TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_preset BOOLEAN DEFAULT FALSE,
  preset_created_by VARCHAR(255),
  preset_source_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE talking_actors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow workspace members to view their own workspace's actors
CREATE POLICY "Users can view actors in their workspace"
  ON talking_actors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = talking_actors.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Allow workspace admins to insert actors
CREATE POLICY "Admins can insert actors in their workspace"
  ON talking_actors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = talking_actors.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'owner')
    )
  );

-- Allow workspace admins to update actors
CREATE POLICY "Admins can update actors in their workspace"
  ON talking_actors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = talking_actors.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = talking_actors.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'owner')
    )
  );

-- Allow workspace admins to delete actors
CREATE POLICY "Admins can delete actors in their workspace"
  ON talking_actors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = talking_actors.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'owner')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_talking_actors_workspace ON talking_actors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_talking_actors_preset ON talking_actors(is_preset) WHERE is_preset = true;
CREATE INDEX IF NOT EXISTS idx_talking_actors_preset_source ON talking_actors(preset_source_id);

-- Create updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_talking_actors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS talking_actors_updated_at
  BEFORE UPDATE ON talking_actors
  FOR EACH ROW
  EXECUTE FUNCTION update_talking_actors_updated_at();
