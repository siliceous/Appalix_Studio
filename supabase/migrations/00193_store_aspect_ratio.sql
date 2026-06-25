-- Store aspect ratio metadata for images
ALTER TABLE ai_image_generations
  ADD COLUMN IF NOT EXISTS aspect_ratio_stored VARCHAR DEFAULT '1:1';

-- Update migration script (run separately if needed)
-- UPDATE ai_image_generations
-- SET aspect_ratio_stored = aspect_ratio
-- WHERE aspect_ratio_stored = '1:1' AND aspect_ratio IS NOT NULL;
