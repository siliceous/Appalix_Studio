-- Add trigger_phrases array to voice_knowledge_entries
-- title remains the primary/display phrase; trigger_phrases holds additional aliases
alter table voice_knowledge_entries
  add column if not exists trigger_phrases text[] not null default '{}';
