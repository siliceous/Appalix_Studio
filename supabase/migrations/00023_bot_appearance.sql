-- Add widget skin to bots
-- Determines the colour theme of the embedded chat widget.
-- Default is 'light'. Other built-in values: dark, forest, desert, ocean, midnight, rose, minimal.

alter table bots
  add column if not exists widget_skin text not null default 'light';
