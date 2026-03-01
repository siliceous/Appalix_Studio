-- Add 'excel' and 'csv' as first-class source types
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_type_check
  CHECK (type IN (
    'url', 'sitemap', 'file', 'text',
    'notion', 'confluence',
    'google_drive', 'dropbox', 'onedrive', 'sharepoint', 'gitbook',
    'excel', 'csv'
  ));
