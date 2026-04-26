-- Phase 1: persisted voice/call settings per phone number
ALTER TABLE workspace_phone_numbers
  ADD COLUMN IF NOT EXISTS call_recording_enabled        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS call_transcription_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_delete_recordings_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_retention_days      integer,
  ADD COLUMN IF NOT EXISTS voicemail_enabled             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voicemail_greeting            text,
  ADD COLUMN IF NOT EXISTS missed_call_textback_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS missed_call_textback_message  text,
  ADD COLUMN IF NOT EXISTS call_timeout_seconds          integer NOT NULL DEFAULT 30;
