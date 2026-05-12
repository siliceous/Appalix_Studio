-- ============================================================
-- Dedupe system form templates by name + add unique constraint
-- so future re-runs of seed migrations can't create duplicates.
-- ============================================================

-- 1. Remap any forms that reference a duplicate template_id to the canonical
--    (oldest) row, so we don't break existing forms when we delete duplicates.
WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM forms_templates
  WHERE workspace_id IS NULL
    AND is_system_template = true
),
remap AS (
  SELECT
    dup.id   AS dup_id,
    keep.id  AS keep_id
  FROM ranked dup
  JOIN ranked keep
    ON keep.name = dup.name
   AND keep.rn  = 1
  WHERE dup.rn > 1
)
UPDATE forms
SET template_id = remap.keep_id
FROM remap
WHERE forms.template_id = remap.dup_id;

-- 2. Delete the duplicates (keep rn = 1 per name).
WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM forms_templates
  WHERE workspace_id IS NULL
    AND is_system_template = true
)
DELETE FROM forms_templates
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- 3. Prevent future duplicates: one system template per name.
CREATE UNIQUE INDEX IF NOT EXISTS forms_templates_system_name_unique
ON forms_templates (name)
WHERE workspace_id IS NULL AND is_system_template = true;
