-- Create talking_actors table for storing custom user-uploaded actors
CREATE TABLE IF NOT EXISTS talking_actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('builtin', 'custom')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_talking_actors_workspace_id ON talking_actors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_talking_actors_created_at ON talking_actors(created_at DESC);

-- RLS Policies
ALTER TABLE talking_actors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view actors in their workspace" ON talking_actors;
DROP POLICY IF EXISTS "Users can create actors in their workspace" ON talking_actors;
DROP POLICY IF EXISTS "Users can update actors in their workspace" ON talking_actors;
DROP POLICY IF EXISTS "Users can delete actors in their workspace" ON talking_actors;

CREATE POLICY "Users can view actors in their workspace"
  ON talking_actors
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create actors in their workspace"
  ON talking_actors
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update actors in their workspace"
  ON talking_actors
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete actors in their workspace"
  ON talking_actors
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
DROP TRIGGER IF EXISTS talking_actors_updated_at_trigger ON talking_actors;

CREATE OR REPLACE FUNCTION update_talking_actors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER talking_actors_updated_at_trigger
BEFORE UPDATE ON talking_actors
FOR EACH ROW
EXECUTE FUNCTION update_talking_actors_updated_at();

-- Create table for linking Gemini voices to talking actors with lip-sync settings
CREATE TABLE IF NOT EXISTS talking_actor_voice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  talking_actor_id UUID NOT NULL REFERENCES talking_actors(id) ON DELETE CASCADE,
  gemini_voice_id UUID NOT NULL REFERENCES gemini_voices(id) ON DELETE CASCADE,
  lip_sync_strength DECIMAL(2,1) NOT NULL DEFAULT 0.8 CHECK (lip_sync_strength >= 0 AND lip_sync_strength <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one voice per actor (or allow multiple voices per actor)
  UNIQUE(talking_actor_id, gemini_voice_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_talking_actor_voice_links_workspace_id ON talking_actor_voice_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_talking_actor_voice_links_actor_id ON talking_actor_voice_links(talking_actor_id);
CREATE INDEX IF NOT EXISTS idx_talking_actor_voice_links_voice_id ON talking_actor_voice_links(gemini_voice_id);
CREATE INDEX IF NOT EXISTS idx_talking_actor_voice_links_created_at ON talking_actor_voice_links(created_at DESC);

-- RLS Policies
ALTER TABLE talking_actor_voice_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view voice links in their workspace" ON talking_actor_voice_links;
DROP POLICY IF EXISTS "Users can create voice links in their workspace" ON talking_actor_voice_links;
DROP POLICY IF EXISTS "Users can update voice links in their workspace" ON talking_actor_voice_links;
DROP POLICY IF EXISTS "Users can delete voice links in their workspace" ON talking_actor_voice_links;

CREATE POLICY "Users can view voice links in their workspace"
  ON talking_actor_voice_links
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create voice links in their workspace"
  ON talking_actor_voice_links
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update voice links in their workspace"
  ON talking_actor_voice_links
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete voice links in their workspace"
  ON talking_actor_voice_links
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
DROP TRIGGER IF EXISTS talking_actor_voice_links_updated_at_trigger ON talking_actor_voice_links;

CREATE OR REPLACE FUNCTION update_talking_actor_voice_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER talking_actor_voice_links_updated_at_trigger
BEFORE UPDATE ON talking_actor_voice_links
FOR EACH ROW
EXECUTE FUNCTION update_talking_actor_voice_links_updated_at();

-- Create a view for easier querying of actor-voice combinations
DROP VIEW IF EXISTS actor_voice_combinations;

CREATE OR REPLACE VIEW actor_voice_combinations AS
SELECT
  l.id,
  l.workspace_id,
  l.talking_actor_id,
  l.gemini_voice_id,
  l.lip_sync_strength,
  a.actor_name,
  v.voice_name,
  v.language_code,
  v.ssml_gender,
  l.created_at
FROM talking_actor_voice_links l
JOIN talking_actors a ON l.talking_actor_id = a.id
JOIN gemini_voices v ON l.gemini_voice_id = v.id;

-- Allow users to query the view
GRANT SELECT ON actor_voice_combinations TO authenticated;
