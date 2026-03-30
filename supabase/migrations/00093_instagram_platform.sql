-- Add instagram as a valid platform for integrations
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS integrations_platform_check;

ALTER TABLE integrations
  ADD CONSTRAINT integrations_platform_check CHECK (platform IN (
    'slack',
    'google_chat',
    'facebook_messenger',
    'whatsapp',
    'instagram',
    'wordpress',
    'web_widget',
    'custom_api',
    'telegram',
    'shopify'
  ));
