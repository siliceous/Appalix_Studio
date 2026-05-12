-- Two system templates had their image blocks removed in 00171 but still
-- carried a preview_image_url, so the templates gallery kept showing an image
-- that the editor couldn't render. Clear those dangling URLs.

UPDATE forms_templates
SET preview_image_url = NULL
WHERE workspace_id IS NULL
  AND is_system_template = true
  AND name IN ('Wedding Planning Enquiry', 'Exit Intent — 10% Off')
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(config->'blocks') AS b
    WHERE b->>'type' = 'image'
      AND coalesce(b->'props'->>'src', '') <> ''
  );
