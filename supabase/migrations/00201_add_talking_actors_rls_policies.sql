-- Add basic RLS policies for talking_actors table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view actors in their workspace" ON talking_actors;
DROP POLICY IF EXISTS "Users can view actors in their workspace and main workspace" ON talking_actors;
DROP POLICY IF EXISTS "Users can view talking actors in their workspace" ON talking_actors;
DROP POLICY IF EXISTS "Admins can insert actors in their workspace" ON talking_actors;
DROP POLICY IF EXISTS "Admins can update actors in their workspace" ON talking_actors;
DROP POLICY IF EXISTS "Admins can delete actors in their workspace" ON talking_actors;

-- Allow users to view talking actors if they're a member of that workspace
CREATE POLICY "Users can view talking actors in their workspace"
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
