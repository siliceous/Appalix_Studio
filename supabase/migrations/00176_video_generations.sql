-- Video generations table (core content)
CREATE TABLE public.video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,

  -- Content generation
  prompt TEXT NOT NULL,
  source_image_url TEXT, -- For image-to-video workflows
  source_image_path TEXT, -- Supabase storage path
  video_type TEXT NOT NULL CHECK (video_type IN ('text_to_video', 'image_to_video', 'ugc')), -- V1: text_to_video + image_to_video

  -- Model & Provider
  provider TEXT NOT NULL DEFAULT 'kling' CHECK (provider IN ('kling', 'runway', 'veo', 'sora')),
  quality_mode TEXT NOT NULL DEFAULT 'fast' CHECK (quality_mode IN ('fast', 'pro_cinematic', 'ultra_realistic')),

  -- Video parameters
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1', '4:3')),
  duration_seconds INT DEFAULT 15,
  resolution TEXT DEFAULT '1080p' CHECK (resolution IN ('720p', '1080p', '4k')),

  -- Output
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'generating', 'ready', 'failed')),
  output_url TEXT, -- Signed URL to video in Supabase Storage
  output_path TEXT, -- Supabase storage bucket path (video-generations/{workspace_id}/{id}.mp4)
  file_size_bytes BIGINT,
  video_duration_seconds INT, -- Actual generated duration

  -- Billing
  estimated_cost_usd NUMERIC(10, 4),
  actual_cost_usd NUMERIC(10, 4),

  -- Social/metadata
  social_platform TEXT CHECK (social_platform IN ('tiktok', 'instagram_reels', 'youtube_shorts', 'generic')),
  tags TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT FALSE,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ, -- Soft delete

  -- Indexes
  CONSTRAINT video_generations_workspace_not_deleted CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL)
);

-- Indexes for common queries
CREATE INDEX idx_video_generations_workspace_created
  ON public.video_generations(workspace_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_video_generations_status
  ON public.video_generations(workspace_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_video_generations_provider
  ON public.video_generations(workspace_id, provider, created_at DESC)
  WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view videos in their workspace"
  ON public.video_generations FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Users can create videos in their workspace"
  ON public.video_generations FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.my_workspace_ids()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can update their own videos"
  ON public.video_generations FOR UPDATE
  USING (workspace_id IN (SELECT public.my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "Admins can delete videos in their workspace"
  ON public.video_generations FOR DELETE
  USING (public.is_workspace_admin(workspace_id));
