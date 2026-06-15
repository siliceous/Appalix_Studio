-- Extend billing_rate_cards with video generation rates
-- This migration adds video-specific rates for different providers and quality modes

-- Video rates structure (stored as JSONB in billing_rate_cards)
-- {
--   "video_generation_kling_fast": {
--     "unit": "minute",
--     "unit_price": 0.25
--   },
--   "video_generation_runway_pro": {
--     "unit": "minute",
--     "unit_price": 0.50
--   }
-- }

-- Add default video generation rates to the global rate card
INSERT INTO public.billing_rate_cards (
  workspace_id,
  name,
  rates,
  effective_from,
  effective_to
) VALUES (
  NULL, -- Global/default rates
  'Video Generation Default Rates (Kling)',
  jsonb_build_object(
    'video_generation_kling_fast', jsonb_build_object(
      'unit', 'minute',
      'unit_price', 0.25,
      'description', 'Kling Fast Mode - up to 15 seconds'
    ),
    'video_generation_kling_pro', jsonb_build_object(
      'unit', 'minute',
      'unit_price', 0.50,
      'description', 'Kling Standard - up to 30 seconds (future)'
    )
  ),
  NOW(),
  NULL
) ON CONFLICT DO NOTHING;

-- Create a helper function to get video generation cost
CREATE OR REPLACE FUNCTION public.get_video_generation_cost(
  p_workspace_id UUID,
  p_provider TEXT,
  p_quality_mode TEXT,
  p_duration_minutes NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_rate_key TEXT;
  v_rate_info JSONB;
  v_unit_price NUMERIC;
  v_rate_card JSONB;
BEGIN
  -- Build the rate card key based on provider and quality mode
  v_rate_key := 'video_generation_' || p_provider || '_' || p_quality_mode;

  -- Get workspace-specific rate card (if exists), otherwise use global default
  SELECT rates INTO v_rate_card
  FROM public.billing_rate_cards
  WHERE workspace_id = p_workspace_id AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
  ORDER BY effective_from DESC
  LIMIT 1;

  -- Fall back to global rates
  IF v_rate_card IS NULL THEN
    SELECT rates INTO v_rate_card
    FROM public.billing_rate_cards
    WHERE workspace_id IS NULL AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
    ORDER BY effective_from DESC
    LIMIT 1;
  END IF;

  -- Extract the rate info for this provider/quality combination
  v_rate_info := v_rate_card -> v_rate_key;

  -- If rate not found, return a default (should not happen in production)
  IF v_rate_info IS NULL THEN
    v_unit_price := 0.25; -- Default to $0.25/min
  ELSE
    v_unit_price := (v_rate_info ->> 'unit_price')::NUMERIC;
  END IF;

  -- Return cost based on duration
  RETURN ROUND(v_unit_price * p_duration_minutes, 4);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_video_generation_cost(UUID, TEXT, TEXT, NUMERIC) TO authenticated;
