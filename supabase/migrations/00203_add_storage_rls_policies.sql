-- Add Row Level Security to Supabase Storage buckets
-- Storage-level access control for multi-tenant isolation
-- NOTE: Supabase Storage RLS is applied at the path level through policies on storage.objects table

-- Enable RLS on storage.objects if not already enabled
-- This table controls access to all files in all buckets

-- Create policy: Users can list objects in their workspace paths
CREATE POLICY "Users can list objects in their workspace"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name IN ('ai-image-generations', 'actor-images', 'actor-videos', 'workspace-assets'))
    AND (
      -- Allow reading from workspaces/{userId}/* paths
      path LIKE 'workspaces/' || auth.uid() || '/%'
      -- OR allow reading from workspaces/{workspace_id}/* where user is a member
      OR path LIKE 'workspaces/%' AND
         SPLIT_PART(path, '/', 2)::uuid IN (
           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
         )
    )
  );

-- Create policy: Users can upload to their workspace paths
CREATE POLICY "Users can upload objects to their workspace"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name IN ('ai-image-generations', 'actor-images', 'actor-videos', 'workspace-assets'))
    AND (
      -- Allow uploading to workspaces/{userId}/* paths (personal workspace context)
      path LIKE 'workspaces/' || auth.uid() || '/%'
      -- OR allow uploading to workspaces/{workspace_id}/* where user is a member
      OR path LIKE 'workspaces/%' AND
         SPLIT_PART(path, '/', 2)::uuid IN (
           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
         )
    )
  );

-- Create policy: Users can delete objects from their workspace
CREATE POLICY "Users can delete objects in their workspace"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN (SELECT id FROM storage.buckets WHERE name IN ('ai-image-generations', 'actor-images', 'actor-videos', 'workspace-assets'))
    AND (
      -- Allow deleting from workspaces/{userId}/* paths
      path LIKE 'workspaces/' || auth.uid() || '/%'
      -- OR allow deleting from workspaces/{workspace_id}/* where user is an admin
      OR path LIKE 'workspaces/%' AND
         SPLIT_PART(path, '/', 2)::uuid IN (
           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
         )
    )
  );

-- Create policy: Service role can perform all operations on storage
CREATE POLICY "Service role bypass"
  ON storage.objects
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
