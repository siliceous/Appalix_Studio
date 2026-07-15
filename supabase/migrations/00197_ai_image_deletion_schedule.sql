-- Add scheduled deletion support to ai_image_deletions table
-- Allows images to be marked for permanent deletion in 3 days

ALTER TABLE ai_image_deletions
ADD COLUMN IF NOT EXISTS scheduled_for_deletion_at timestamp with time zone;

-- Index for finding images scheduled for deletion
CREATE INDEX IF NOT EXISTS idx_ai_image_deletions_scheduled ON ai_image_deletions(scheduled_for_deletion_at)
WHERE scheduled_for_deletion_at IS NOT NULL;
