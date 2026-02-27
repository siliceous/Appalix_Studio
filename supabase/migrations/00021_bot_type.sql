-- ============================================================
-- Migration 00021: Bot type
-- Adds a bot_type column to distinguish customer-facing chat
-- widgets from internal Sage assistant bots.
-- ============================================================

alter table bots
  add column bot_type text not null default 'widget'
    check (bot_type in ('widget', 'internal'));

comment on column bots.bot_type is
  'widget = customer-facing chat embed; internal = workspace Sage AI assistant';
