-- Add cloud knowledge source types to the sources table type constraint.
-- Tokens for each provider are stored in sources.metadata (JSONB).

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;

ALTER TABLE sources ADD CONSTRAINT sources_type_check
  CHECK (type IN (
    'url', 'sitemap', 'file', 'text',
    'notion', 'confluence',
    'google_drive', 'dropbox', 'onedrive', 'sharepoint', 'gitbook'
  ));
