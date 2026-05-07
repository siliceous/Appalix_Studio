-- Add imagePosition to system template themes
-- Distributes 15 templates across: top, left, right, background

UPDATE forms_templates SET theme = theme || '{"imagePosition":"left"}'       WHERE name = 'Café Newsletter'             AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"top"}'        WHERE name = 'Fitness Challenge Signup'     AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"right"}'      WHERE name = 'Yoga & Wellness Studio'       AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"background"}' WHERE name = 'Wedding Planning Enquiry'     AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"left"}'       WHERE name = 'Business Team Newsletter'     AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"right"}'      WHERE name = 'Solar Energy Quote Request'   AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"top"}'        WHERE name = 'Kids Party Alert'             AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"left"}'       WHERE name = 'Fashion Sale Alert'           AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"background"}' WHERE name = 'Baby Shower RSVP'             AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"top"}'        WHERE name = 'Back in Stock Alert'          AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"background"}' WHERE name = 'Exit Intent — 10% Off'        AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"top"}'        WHERE name = 'Spin to Win'                  AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"background"}' WHERE name = 'Garden Dinner & Events'       AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"right"}'      WHERE name = 'Summer Fashion Drop'          AND is_system_template = true;
UPDATE forms_templates SET theme = theme || '{"imagePosition":"left"}'       WHERE name = 'Food Delivery Signup'         AND is_system_template = true;
