-- Monthly video usage metering for billing
CREATE TABLE public.video_usage_metering (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Billing period (YYYY-MM format)
  billing_period TEXT NOT NULL CHECK (billing_period ~ '^\d{4}-\d{2}$'),

  -- Usage counts
  videos_generated INT DEFAULT 0,
  generation_minutes INT DEFAULT 0, -- Total minutes of video generated
  total_cost_usd NUMERIC(10, 4) DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate periods per workspace
  UNIQUE(workspace_id, billing_period)
);

-- Index for quick lookups
CREATE INDEX idx_video_usage_metering_workspace_period
  ON public.video_usage_metering(workspace_id, billing_period DESC);

-- RLS Policies
ALTER TABLE public.video_usage_metering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace metering"
  ON public.video_usage_metering FOR SELECT
  USING (workspace_id IN (SELECT public.my_workspace_ids()));

-- Materialized view for analytics
CREATE MATERIALIZED VIEW public.video_usage_analytics AS
SELECT
  workspace_id,
  DATE_TRUNC('month', created_at)::DATE as month,
  COUNT(*) as total_videos,
  SUM(COALESCE(video_duration_seconds, 0)) / 60.0 as total_minutes,
  SUM(COALESCE(actual_cost_usd, 0)) as total_cost
FROM public.video_generations
WHERE deleted_at IS NULL AND status = 'ready'
GROUP BY workspace_id, DATE_TRUNC('month', created_at);

CREATE INDEX idx_video_usage_analytics_workspace
  ON public.video_usage_analytics(workspace_id);
