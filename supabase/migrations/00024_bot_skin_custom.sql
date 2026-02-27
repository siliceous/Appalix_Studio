-- Add custom colour overrides for the widget skin.
-- Used when widget_skin = 'custom'.
-- accent_color  → launcher, user bubbles, send button
-- header_color  → widget header background

alter table bots
  add column if not exists widget_accent_color text,
  add column if not exists widget_header_color  text;
