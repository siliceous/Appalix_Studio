-- Add aspect_ratio column to talking_actors table
ALTER TABLE talking_actors ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(10) DEFAULT '1:1';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_talking_actors_aspect_ratio ON talking_actors(aspect_ratio);
