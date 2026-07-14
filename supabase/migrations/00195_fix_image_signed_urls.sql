-- Fix 150 completed images with signed URLs to use permanent public URLs
-- This migration converts temporary signed URLs to permanent public URLs

BEGIN;

-- Update single output_url for completed images with signed URLs
UPDATE ai_image_generations
SET output_url = (
  'https://rudeaapjryxcswvsqida.supabase.co/storage/v1/object/public/' ||
  substring(output_url FROM 'ai-image-generations/[^?]+')
)
WHERE status = 'completed'
  AND output_url IS NOT NULL
  AND output_url LIKE '%/object/sign/%'
  AND output_url LIKE '%ai-image-generations/%';

-- Handle output_urls (JSON array of signed URLs)
-- This is more complex as we need to parse JSON and reconstruct URLs
UPDATE ai_image_generations
SET output_urls = (
  SELECT jsonb_agg(
    'https://rudeaapjryxcswvsqida.supabase.co/storage/v1/object/public/' ||
    substring(url FROM 'ai-image-generations/[^?]+')
  )
  FROM jsonb_array_elements_text(output_urls::jsonb) AS url
  WHERE url LIKE '%/object/sign/%'
)
WHERE status = 'completed'
  AND output_urls IS NOT NULL
  AND output_urls LIKE '%/object/sign/%'
  AND output_urls LIKE '%ai-image-generations/%';

COMMIT;
