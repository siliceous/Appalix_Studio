-- Voice capability fields on bots
alter table bots
  add column if not exists enable_voice   boolean not null default false,
  add column if not exists voice_mode     text    not null default 'voice_text',  -- 'text' | 'voice' | 'voice_text'
  add column if not exists voice_name     text,                                   -- Gemini prebuilt voice
  add column if not exists voice_preset   text,                                   -- 'receptionist' | 'sales' | 'support' | 'booking' | 'lead_capture'
  add column if not exists voice_goal     text,                                   -- 'book_meeting' | 'capture_lead' | 'resolve_ticket' | 'sales_pitch' | 'take_message' | 'route_human'
  add column if not exists voice_config   jsonb;                                  -- tone, pace, empathy, assertiveness, escalation_rules, etc.
