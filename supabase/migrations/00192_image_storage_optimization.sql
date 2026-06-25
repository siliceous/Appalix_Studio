-- Image Storage Optimization
-- Store URLs + storage keys instead of base64 data

-- Add new columns to track storage
ALTER TABLE ai_image_generations
  ADD COLUMN IF NOT EXISTS storage_keys JSONB, -- Array of {key: "path/in/bucket", size: bytes}
  ADD COLUMN IF NOT EXISTS image_format VARCHAR DEFAULT 'webp', -- webp, jpeg, png
  ADD COLUMN IF NOT EXISTS compressed_size_bytes INTEGER; -- Size after compression

-- Update existing completed generations to use new schema
-- (They currently have base64 in output_url/output_urls - will migrate separately)

-- Create storage bucket if it doesn't exist
-- Note: This must be done via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ai-image-generations', 'ai-image-generations', false);

-- Set proper RLS policies on storage bucket
CREATE POLICY "Workspace members can view their images"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ai-image-generations'
    AND auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = (storage.foldername(name))[1]::UUID
    )
  );

CREATE POLICY "Workspace admins can delete images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ai-image-generations'
    AND auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = (storage.foldername(name))[1]::UUID
      AND role IN ('admin', 'owner')
    )
  );
