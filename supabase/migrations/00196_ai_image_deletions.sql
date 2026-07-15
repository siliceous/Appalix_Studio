-- Create table for tracking deleted/trashed images across browsers
-- This allows deletion sync across different browser sessions for the same workspace

CREATE TABLE IF NOT EXISTS ai_image_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  image_id text NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient lookups by workspace
CREATE INDEX IF NOT EXISTS idx_ai_image_deletions_workspace_id ON ai_image_deletions(workspace_id);

-- Index for composite lookups (workspace + image)
CREATE INDEX IF NOT EXISTS idx_ai_image_deletions_workspace_image ON ai_image_deletions(workspace_id, image_id);

-- Index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_ai_image_deletions_created_at ON ai_image_deletions(created_at);

-- Add RLS policy for authenticated users to manage their workspace deletions
ALTER TABLE ai_image_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_image_deletions_workspace_access ON ai_image_deletions
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
