alter table sage_documents
  add column if not exists accent_color text default '#2563eb',
  add column if not exists logo_url     text;
