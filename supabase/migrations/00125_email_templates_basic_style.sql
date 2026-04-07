-- Add 'basic' to the email_templates.template_style check constraint
-- Basic = classic transactional 1-column layout with social icons + full footer

ALTER TABLE email_templates
  DROP CONSTRAINT IF EXISTS email_templates_template_style_check;

ALTER TABLE email_templates
  ADD CONSTRAINT email_templates_template_style_check
  CHECK (template_style IN (
    'basic', 'minimalist', 'promotional', 'offer',
    'newsletter', 'announcement', 'custom'
  ));
