-- ============================================================
-- Fix system form template thumbnails:
--  • Back in Stock Alert was using graduation.jpg (wrong theme)
--  • Spin to Win duplicated balloons-beach.jpg with Exit Intent
-- ============================================================

UPDATE forms_templates
SET preview_image_url = '/form-images/bbq-party.jpg'
WHERE workspace_id IS NULL
  AND name = 'Back in Stock Alert'
  AND preview_image_url = '/form-images/graduation.jpg';

UPDATE forms_templates
SET preview_image_url = '/form-images/graduation.jpg'
WHERE workspace_id IS NULL
  AND name = 'Spin to Win'
  AND preview_image_url = '/form-images/balloons-beach.jpg';
