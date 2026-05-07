-- Per-template imageObjectPosition for precise subject framing in side panels

-- Fashion Sale Alert: woman's face at ~55% X, 20% Y
UPDATE forms_templates
SET theme = theme || '{"imageObjectPosition":"55% 20%"}'
WHERE name = 'Fashion Sale Alert' AND is_system_template = true;

-- Solar Energy Quote: couple together in right portion of image
UPDATE forms_templates
SET theme = theme || '{"imageObjectPosition":"70% 30%"}'
WHERE name = 'Solar Energy Quote Request' AND is_system_template = true;

-- Yoga & Wellness: both people visible, woman foreground right
UPDATE forms_templates
SET theme = theme || '{"imageObjectPosition":"50% 25%"}'
WHERE name = 'Yoga & Wellness Studio' AND is_system_template = true;

-- Summer Fashion Drop: woman's face near top-center
UPDATE forms_templates
SET theme = theme || '{"imageObjectPosition":"45% 15%"}'
WHERE name = 'Summer Fashion Drop' AND is_system_template = true;
