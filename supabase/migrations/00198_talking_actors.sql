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
  aspect_ratio VARCHAR(10) DEFAULT '1:1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE talking_actors ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_talking_actors_workspace ON talking_actors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_talking_actors_preset ON talking_actors(is_preset) WHERE is_preset = true;
CREATE INDEX IF NOT EXISTS idx_talking_actors_preset_source ON talking_actors(preset_source_id);
CREATE INDEX IF NOT EXISTS idx_talking_actors_aspect_ratio ON talking_actors(aspect_ratio);
