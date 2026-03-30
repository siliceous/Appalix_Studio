-- Add sage_voice_config JSONB column to user_profiles for per-user voice assistant settings
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sage_voice_config jsonb DEFAULT NULL;

COMMENT ON COLUMN user_profiles.sage_voice_config IS
  'Per-user Sage voice assistant settings: { voice_name, language_code, temperature, output_transcription, input_transcription, enable_affective_dialog }';
