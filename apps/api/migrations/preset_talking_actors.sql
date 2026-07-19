-- Add is_preset flag to talking_actors table
ALTER TABLE talking_actors ADD COLUMN is_preset BOOLEAN DEFAULT FALSE;
ALTER TABLE talking_actors ADD COLUMN preset_created_by VARCHAR(255);
ALTER TABLE talking_actors ADD COLUMN preset_source_id UUID;

-- Create index for faster preset lookups
CREATE INDEX idx_talking_actors_preset ON talking_actors(is_preset) WHERE is_preset = true;
CREATE INDEX idx_talking_actors_preset_source ON talking_actors(preset_source_id);

-- Add constraint: only info@gorank.com.au workspace can create presets
-- (enforced in application code)
