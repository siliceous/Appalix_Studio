-- Add bot_paused flag to conversations.
-- When true the API processor skips AI reply generation so a human agent
-- can take over the conversation from the dashboard.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS bot_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN conversations.bot_paused IS
  'When true, incoming messages are saved but the bot will not generate a reply. A human agent is handling the conversation.';
