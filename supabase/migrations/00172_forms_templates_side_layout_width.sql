-- Bump default container width to 680px for system templates that use a
-- side (left/right) image layout. Top/background layouts keep their existing widths.

UPDATE forms_templates
SET theme = jsonb_set(
  theme,
  '{modal,width}',
  '"680px"'::jsonb,
  true
)
WHERE is_system_template = true
  AND theme->>'imagePosition' IN ('left', 'right');
