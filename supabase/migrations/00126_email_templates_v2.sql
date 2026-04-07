-- Email Templates v2: campaign intent, variation tracking, template source
-- All new columns nullable for backward compatibility with existing templates.

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS campaign_intent  text
    CHECK (campaign_intent IN ('product_launch', 'promotion', 'newsletter', 'announcement', 'other')),
  ADD COLUMN IF NOT EXISTS variation_name   text,
  ADD COLUMN IF NOT EXISTS variation_index  integer
    CHECK (variation_index BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS template_source  text
    CHECK (template_source IN ('primary', 'secondary'));

COMMENT ON COLUMN email_templates.campaign_intent  IS 'Intent driving the email (product_launch, promotion, newsletter, announcement, other)';
COMMENT ON COLUMN email_templates.variation_name   IS 'Human-readable variation name e.g. Clean / Minimal';
COMMENT ON COLUMN email_templates.variation_index  IS '1=Clean/Minimal, 2=Bold/Promotional, 3=Conversion Focused, 4=Premium/Editorial';
COMMENT ON COLUMN email_templates.template_source  IS 'primary (internal marketing) or secondary (client asset source)';
