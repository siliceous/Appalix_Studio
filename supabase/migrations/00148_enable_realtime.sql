-- Enable Supabase Realtime for live message streaming on conversation pages
alter publication supabase_realtime add table messages, conversations;
