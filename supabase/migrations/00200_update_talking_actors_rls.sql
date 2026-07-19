-- Update RLS policy to allow viewing main workspace actors
DROP POLICY IF EXISTS "Users can view actors in their workspace" ON talking_actors;

CREATE POLICY "Users can view actors in their workspace and main workspace"
  ON talking_actors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = talking_actors.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = talking_actors.workspace_id
      AND w.owner_email = 'info@gorank.com.au'
    )
  );
