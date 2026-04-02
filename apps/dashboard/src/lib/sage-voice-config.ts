export interface SageVoiceConfig {
  voice_name:              string
  language_code:           string
  temperature:             number
  output_transcription:    boolean
  input_transcription:     boolean
  enable_affective_dialog: boolean
  wake_word_enabled:       boolean
}

export const DEFAULT_VOICE_CONFIG: SageVoiceConfig = {
  voice_name:              'Aoede',
  language_code:           'en-US',
  temperature:             0.7,
  output_transcription:    true,
  input_transcription:     false,
  enable_affective_dialog: false,
  wake_word_enabled:       true,
}
