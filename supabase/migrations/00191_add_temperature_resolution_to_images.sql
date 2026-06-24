-- Add temperature and resolution columns to ai_image_generations
ALTER TABLE ai_image_generations
ADD COLUMN temperature DECIMAL(3,1) DEFAULT 0.7,
ADD COLUMN resolution TEXT DEFAULT '1080';
