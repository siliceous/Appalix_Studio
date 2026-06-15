-- Video generation templates (reusable prompts, presets, formats)
CREATE TABLE public.video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL = global templates

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'product', 'ucd', 'explainer', 'testimonial', 'promo', 'social_ad', 'generic')),

  -- Template configuration
  video_type TEXT NOT NULL CHECK (video_type IN ('text_to_video', 'image_to_video', 'ugc')),
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  social_platform TEXT CHECK (social_platform IN ('tiktok', 'instagram_reels', 'youtube_shorts', 'generic')),

  -- Template content
  prompt_template TEXT NOT NULL, -- Contains placeholders: {{product}}, {{feature}}, etc.
  required_variables TEXT[] DEFAULT '{}', -- e.g., ['product', 'feature']
  optional_variables TEXT[] DEFAULT '{}',

  -- Visual/generation presets
  suggested_duration_seconds INT DEFAULT 15,
  suggested_quality_mode TEXT DEFAULT 'fast',
  style_guide JSONB, -- e.g., { "color_theme": "vibrant", "tone": "upbeat" }

  -- Metadata
  thumbnail_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE, -- System templates vs. user-created

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_video_templates_workspace_category
  ON public.video_templates(workspace_id, category)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_video_templates_is_featured
  ON public.video_templates(is_featured)
  WHERE deleted_at IS NULL AND workspace_id IS NULL;

-- RLS Policies
ALTER TABLE public.video_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system and workspace templates"
  ON public.video_templates FOR SELECT
  USING (
    is_system = TRUE OR
    workspace_id IS NULL OR
    workspace_id IN (SELECT public.my_workspace_ids())
  );

CREATE POLICY "Users can create templates in their workspace"
  ON public.video_templates FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.my_workspace_ids()) AND
    created_by = auth.uid()
  );

-- Insert default system templates
INSERT INTO public.video_templates (
  workspace_id,
  name,
  description,
  category,
  video_type,
  aspect_ratio,
  social_platform,
  prompt_template,
  required_variables,
  optional_variables,
  suggested_quality_mode,
  is_system,
  is_featured
) VALUES
(
  NULL,
  'Restaurant Menu Showcase',
  'Perfect for showcasing restaurant dishes and menu items',
  'restaurant',
  'image_to_video',
  '9:16',
  'instagram_reels',
  'A delicious {{dish_name}} from {{restaurant_name}}. {{description}}. Mouth-watering food photography, cinematic lighting, close-up food shots.',
  ARRAY['dish_name', 'restaurant_name'],
  ARRAY['description'],
  'fast',
  TRUE,
  TRUE
),
(
  NULL,
  'Product Demo - Quick',
  'Quick product feature demo for social media',
  'product',
  'text_to_video',
  '9:16',
  'tiktok',
  'Showing off {{product_name}}: {{feature}}. Product demonstration, close-up detail shots, clean modern aesthetic, product in use.',
  ARRAY['product_name', 'feature'],
  ARRAY['use_case', 'benefit'],
  'fast',
  TRUE,
  TRUE
),
(
  NULL,
  'Testimonial - UGC Style',
  'User-generated content testimonial',
  'testimonial',
  'image_to_video',
  '9:16',
  'instagram_reels',
  'Real customer using {{product_name}}. {{testimonial}}. Authentic, casual, relatable content, real person, genuine reaction.',
  ARRAY['product_name', 'testimonial'],
  ARRAY['customer_name'],
  'fast',
  TRUE,
  TRUE
),
(
  NULL,
  'Social Media Ad - Attention Grab',
  'Quick-paced social media advertisement',
  'social_ad',
  'text_to_video',
  '9:16',
  'instagram_reels',
  '{{attention_hook}} {{product_name}} solves {{problem}}. {{cta}}. Fast-paced cuts, trending audio, high-energy, vibrant colors, bold text overlays.',
  ARRAY['attention_hook', 'product_name', 'problem'],
  ARRAY['cta', 'price_or_offer'],
  'fast',
  TRUE,
  TRUE
);
