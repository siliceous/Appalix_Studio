-- AI Image Generations Table
CREATE TABLE ai_image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Input parameters
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  style TEXT,
  aspect_ratio TEXT,
  model TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,

  -- Generation state
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  provider TEXT NOT NULL DEFAULT 'leonardo',
  provider_job_id TEXT,

  -- Output
  output_url TEXT,
  output_urls TEXT, -- JSON array of URLs

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes
CREATE INDEX idx_ai_images_workspace_id ON ai_image_generations(workspace_id);
CREATE INDEX idx_ai_images_status ON ai_image_generations(status);
CREATE INDEX idx_ai_images_created_at ON ai_image_generations(created_at);
CREATE INDEX idx_ai_images_provider_job_id ON ai_image_generations(provider_job_id);

-- RLS Policies
ALTER TABLE ai_image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace's images"
  ON ai_image_generations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert images for their workspace"
  ON ai_image_generations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their workspace's images"
  ON ai_image_generations
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete their workspace's images"
  ON ai_image_generations
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
