alter table sage_contacts
  add column if not exists ai_summary     text,
  add column if not exists ai_analyzed_at timestamptz;
