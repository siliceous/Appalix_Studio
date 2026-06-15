-- Video generation jobs table (async job tracking)
CREATE TABLE public.video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_generations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'processing', 'completed', 'failed', 'cancelled')),

  -- Provider-specific IDs
  provider_job_id TEXT, -- Kling's task_id, Runway's UUID, etc.
  provider TEXT NOT NULL, -- Redundant but useful for filtering

  -- Progress tracking
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),

  -- Error handling
  error_message TEXT,
  error_code TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Webhook tracking
  webhook_received BOOLEAN DEFAULT FALSE,
  webhook_received_at TIMESTAMPTZ,

  -- Async polling fallback
  last_polled_at TIMESTAMPTZ,
  next_poll_at TIMESTAMPTZ DEFAULT now(),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for polling efficiency
CREATE INDEX idx_video_generation_jobs_status_next_poll
  ON public.video_generation_jobs(status, next_poll_at)
  WHERE status != 'completed' AND status != 'failed' AND status != 'cancelled';

CREATE INDEX idx_video_generation_jobs_video_id
  ON public.video_generation_jobs(video_id);

CREATE INDEX idx_video_generation_jobs_workspace
  ON public.video_generation_jobs(workspace_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.video_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view jobs for their workspace videos"
  ON public.video_generation_jobs FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

CREATE POLICY "System can manage jobs"
  ON public.video_generation_jobs FOR ALL
  USING (true); -- Backend API service role will bypass RLS anyway
