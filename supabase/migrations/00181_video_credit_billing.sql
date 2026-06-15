-- Video generation credit-based billing (Option C)
-- Credits per second based on quality mode and resolution

INSERT INTO public.billing_rate_cards (
  workspace_id,
  name,
  rates,
  effective_from,
  effective_to
) VALUES (
  NULL, -- Global/default rates
  'Video Generation - Credit System',
  jsonb_build_object(
    'video_generation_credit_per_second', jsonb_build_object(
      'unit', 'credit',
      'credit_unit_price', 0.08,
      'description', 'Cost per credit when buying in bulk (50% markup on $0.053/credit base)'
    ),
    'video_generation_kling_fast', jsonb_build_object(
      'unit', 'second',
      'credits_per_second', 6,
      'resolution', '720p',
      'description', 'Kling Fast Mode - 720p'
    ),
    'video_generation_kling_pro', jsonb_build_object(
      'unit', 'second',
      'credits_per_second', 12,
      'resolution', '1080p',
      'description', 'Kling Pro Cinematic - 1080p with audio'
    ),
    'video_generation_kling_ultra', jsonb_build_object(
      'unit', 'second',
      'credits_per_second', 18,
      'resolution', '1080p+',
      'description', 'Kling Ultra Realistic - Premium 1080p (future)'
    )
  ),
  NOW(),
  NULL
) ON CONFLICT DO NOTHING;

-- Credit bundle tiers (for future wallet top-up flows)
-- These represent the pricing structure users see when buying credits
CREATE TABLE IF NOT EXISTS public.credit_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INT NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL,
  discount_percent INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default credit bundles
INSERT INTO public.credit_bundles (name, credits, price_usd, discount_percent, display_order) VALUES
  ('Starter', 100, 10.00, 10, 1),
  ('Popular', 500, 40.00, 25, 2),
  ('Pro', 2000, 120.00, 50, 3),
  ('Enterprise', 5000, 250.00, 60, 4)
ON CONFLICT DO NOTHING;

-- Helper function to calculate video generation cost in credits
CREATE OR REPLACE FUNCTION public.calculate_video_credits(
  p_quality_mode TEXT,
  p_duration_seconds INT
) RETURNS INT AS $$
DECLARE
  v_credits_per_second INT;
BEGIN
  CASE p_quality_mode
    WHEN 'fast' THEN v_credits_per_second := 6;
    WHEN 'pro_cinematic' THEN v_credits_per_second := 12;
    WHEN 'ultra_realistic' THEN v_credits_per_second := 18;
    ELSE v_credits_per_second := 6; -- Default to fast
  END CASE;

  RETURN v_credits_per_second * p_duration_seconds;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to convert credits to USD
CREATE OR REPLACE FUNCTION public.credits_to_usd(p_credits INT) RETURNS NUMERIC AS $$
BEGIN
  -- $0.08 per credit (50% markup on Kling's ~$0.053 per credit)
  RETURN ROUND(p_credits * 0.08, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION public.calculate_video_credits(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credits_to_usd(INT) TO authenticated;
