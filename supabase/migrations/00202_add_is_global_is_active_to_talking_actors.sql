-- Add is_global and is_active columns to talking_actors
ALTER TABLE talking_actors
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index on is_global and is_active for queries
CREATE INDEX IF NOT EXISTS idx_talking_actors_is_global ON talking_actors(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_talking_actors_is_active ON talking_actors(is_active) WHERE is_active = true;
