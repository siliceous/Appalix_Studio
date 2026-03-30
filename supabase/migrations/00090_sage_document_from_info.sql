alter table sage_documents
  add column if not exists from_name    text,
  add column if not exists from_address text;
