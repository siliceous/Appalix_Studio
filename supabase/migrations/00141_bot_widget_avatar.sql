-- Add widget_avatar_url to bots for the chat widget header avatar
alter table bots add column if not exists widget_avatar_url text;
