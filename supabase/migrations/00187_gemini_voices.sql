-- Create gemini_voices table for Gemini text-to-speech voice library
CREATE TABLE IF NOT EXISTS gemini_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  voice_name TEXT NOT NULL,
  language_code TEXT NOT NULL,
  ssml_gender TEXT NOT NULL CHECK (ssml_gender IN ('MALE', 'FEMALE', 'NEUTRAL')),
  natural_sample_rate_hertz INTEGER NOT NULL,
  voice_provider TEXT NOT NULL DEFAULT 'google',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one voice per workspace (voice_name + language_code combo)
  UNIQUE(workspace_id, voice_name, language_code)
);

-- Indexes
CREATE INDEX idx_gemini_voices_workspace_id ON gemini_voices(workspace_id);
CREATE INDEX idx_gemini_voices_language_code ON gemini_voices(language_code);
CREATE INDEX idx_gemini_voices_is_active ON gemini_voices(is_active);
CREATE INDEX idx_gemini_voices_created_at ON gemini_voices(created_at DESC);

-- RLS Policies
ALTER TABLE gemini_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view voices in their workspace"
  ON gemini_voices
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create voices in their workspace"
  ON gemini_voices
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow service role (admin) to manage voices globally
CREATE POLICY "Service role can manage voices"
  ON gemini_voices
  FOR ALL
  USING (auth.uid() IS NULL);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_gemini_voices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gemini_voices_updated_at_trigger
BEFORE UPDATE ON gemini_voices
FOR EACH ROW
EXECUTE FUNCTION update_gemini_voices_updated_at();

-- Seed with common Gemini voices (example data)
-- Note: These are standard Google Cloud Text-to-Speech voices
-- In production, populate this from your voice configuration/API

INSERT INTO gemini_voices (workspace_id, voice_name, language_code, ssml_gender, natural_sample_rate_hertz, voice_provider)
SELECT
  ws.id,
  voice_data.voice_name,
  voice_data.language_code,
  voice_data.ssml_gender,
  24000,
  'google'
FROM workspaces ws
CROSS JOIN (
  SELECT 'en-US-Neural2-A' as voice_name, 'en-US' as language_code, 'FEMALE' as ssml_gender
  UNION ALL SELECT 'en-US-Neural2-B', 'en-US', 'MALE'
  UNION ALL SELECT 'en-US-Neural2-C', 'en-US', 'MALE'
  UNION ALL SELECT 'en-US-Neural2-D', 'en-US', 'MALE'
  UNION ALL SELECT 'en-US-Neural2-E', 'en-US', 'FEMALE'
  UNION ALL SELECT 'en-US-Neural2-F', 'en-US', 'FEMALE'
  UNION ALL SELECT 'en-US-Neural2-G', 'en-US', 'FEMALE'
  UNION ALL SELECT 'en-US-Neural2-H', 'en-US', 'FEMALE'
  UNION ALL SELECT 'en-US-Neural2-I', 'en-US', 'MALE'
  UNION ALL SELECT 'en-US-Neural2-J', 'en-US', 'MALE'
  UNION ALL SELECT 'es-ES-Neural2-A', 'es-ES', 'FEMALE'
  UNION ALL SELECT 'es-ES-Neural2-B', 'es-ES', 'MALE'
  UNION ALL SELECT 'es-ES-Neural2-C', 'es-ES', 'MALE'
  UNION ALL SELECT 'es-ES-Neural2-D', 'es-ES', 'FEMALE'
  UNION ALL SELECT 'es-ES-Neural2-E', 'es-ES', 'MALE'
  UNION ALL SELECT 'es-MX-Neural2-A', 'es-MX', 'FEMALE'
  UNION ALL SELECT 'es-MX-Neural2-B', 'es-MX', 'MALE'
  UNION ALL SELECT 'es-MX-Neural2-C', 'es-MX', 'FEMALE'
  UNION ALL SELECT 'fr-FR-Neural2-A', 'fr-FR', 'FEMALE'
  UNION ALL SELECT 'fr-FR-Neural2-B', 'fr-FR', 'MALE'
  UNION ALL SELECT 'fr-FR-Neural2-C', 'fr-FR', 'MALE'
  UNION ALL SELECT 'fr-FR-Neural2-D', 'fr-FR', 'FEMALE'
  UNION ALL SELECT 'de-DE-Neural2-A', 'de-DE', 'FEMALE'
  UNION ALL SELECT 'de-DE-Neural2-B', 'de-DE', 'MALE'
  UNION ALL SELECT 'de-DE-Neural2-C', 'de-DE', 'MALE'
  UNION ALL SELECT 'de-DE-Neural2-D', 'de-DE', 'FEMALE'
  UNION ALL SELECT 'de-DE-Neural2-E', 'de-DE', 'MALE'
  UNION ALL SELECT 'it-IT-Neural2-A', 'it-IT', 'FEMALE'
  UNION ALL SELECT 'it-IT-Neural2-B', 'it-IT', 'MALE'
  UNION ALL SELECT 'it-IT-Neural2-C', 'it-IT', 'MALE'
  UNION ALL SELECT 'it-IT-Neural2-D', 'it-IT', 'FEMALE'
  UNION ALL SELECT 'ja-JP-Neural2-A', 'ja-JP', 'FEMALE'
  UNION ALL SELECT 'ja-JP-Neural2-B', 'ja-JP', 'MALE'
  UNION ALL SELECT 'ja-JP-Neural2-C', 'ja-JP', 'MALE'
  UNION ALL SELECT 'ja-JP-Neural2-D', 'ja-JP', 'FEMALE'
  UNION ALL SELECT 'ko-KR-Neural2-A', 'ko-KR', 'FEMALE'
  UNION ALL SELECT 'ko-KR-Neural2-B', 'ko-KR', 'MALE'
  UNION ALL SELECT 'ko-KR-Neural2-C', 'ko-KR', 'MALE'
  UNION ALL SELECT 'ko-KR-Neural2-D', 'ko-KR', 'FEMALE'
  UNION ALL SELECT 'pt-BR-Neural2-A', 'pt-BR', 'FEMALE'
  UNION ALL SELECT 'pt-BR-Neural2-B', 'pt-BR', 'MALE'
  UNION ALL SELECT 'pt-BR-Neural2-C', 'pt-BR', 'MALE'
  UNION ALL SELECT 'pt-BR-Neural2-D', 'pt-BR', 'FEMALE'
  UNION ALL SELECT 'ru-RU-Neural2-A', 'ru-RU', 'FEMALE'
  UNION ALL SELECT 'ru-RU-Neural2-B', 'ru-RU', 'MALE'
  UNION ALL SELECT 'ru-RU-Neural2-C', 'ru-RU', 'MALE'
  UNION ALL SELECT 'ru-RU-Neural2-D', 'ru-RU', 'FEMALE'
  UNION ALL SELECT 'zh-CN-Neural2-A', 'zh-CN', 'FEMALE'
  UNION ALL SELECT 'zh-CN-Neural2-B', 'zh-CN', 'MALE'
  UNION ALL SELECT 'zh-CN-Neural2-C', 'zh-CN', 'MALE'
  UNION ALL SELECT 'zh-CN-Neural2-D', 'zh-CN', 'FEMALE'
  UNION ALL SELECT 'en-GB-Neural2-A', 'en-GB', 'FEMALE'
  UNION ALL SELECT 'en-GB-Neural2-B', 'en-GB', 'MALE'
  UNION ALL SELECT 'en-GB-Neural2-C', 'en-GB', 'MALE'
  UNION ALL SELECT 'en-GB-Neural2-D', 'en-GB', 'FEMALE'
  UNION ALL SELECT 'en-GB-Neural2-F', 'en-GB', 'FEMALE'
) voice_data
WHERE NOT EXISTS (SELECT 1 FROM gemini_voices WHERE workspace_id = ws.id);
