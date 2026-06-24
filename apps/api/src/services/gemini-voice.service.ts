import { createClient } from '@supabase/supabase-js'

interface GeminiVoice {
  id: string
  workspace_id: string
  voice_name: string
  language_code: string
  ssml_gender: 'MALE' | 'FEMALE' | 'NEUTRAL'
  natural_sample_rate_hertz: number
  voice_provider: 'google' // Gemini is Google's service
  is_active: boolean
  created_at: Date
}

interface TalkingActorVoiceLink {
  id: string
  workspace_id: string
  talking_actor_id: string
  gemini_voice_id: string
  lip_sync_strength: number // 0-1, how strong the lip sync is
  created_at: Date
}

export class GeminiVoiceService {
  private supabase: ReturnType<typeof createClient>

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Get all available Gemini voices from Appalix
   */
  async listGeminiVoices(
    workspaceId: string
  ): Promise<GeminiVoice[]> {
    try {
      const { data, error } = await this.supabase
        .from('gemini_voices')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('voice_name', { ascending: true })

      if (error) throw error
      return (data || []) as GeminiVoice[]
    } catch (error) {
      throw new Error(
        `Failed to list Gemini voices: ${error}`
      )
    }
  }

  /**
   * Get all Gemini voices (global/system voices)
   */
  async listAllGeminiVoices(): Promise<GeminiVoice[]> {
    try {
      const { data, error } = await this.supabase
        .from('gemini_voices')
        .select('*')
        .eq('is_active', true)
        .order('language_code', { ascending: true })
        .order('voice_name', { ascending: true })

      if (error) throw error
      return (data || []) as GeminiVoice[]
    } catch (error) {
      throw new Error(
        `Failed to list all Gemini voices: ${error}`
      )
    }
  }

  /**
   * Get Gemini voice by ID
   */
  async getGeminiVoice(voiceId: string): Promise<GeminiVoice | null> {
    try {
      const { data, error } = await this.supabase
        .from('gemini_voices')
        .select('*')
        .eq('id', voiceId)
        .single()

      if (error) throw error
      return (data || null) as GeminiVoice | null
    } catch (error) {
      throw new Error(`Failed to get Gemini voice: ${error}`)
    }
  }

  /**
   * Link Gemini voice to Tavus replica for lip-sync
   */
  async linkVoiceToActor(
    workspaceId: string,
    talkingActorId: string,
    geminiVoiceId: string,
    lipSyncStrength: number = 0.8
  ): Promise<TalkingActorVoiceLink> {
    try {
      const { data, error } = await this.supabase
        .from('talking_actor_voice_links')
        .insert({
          workspace_id: workspaceId,
          talking_actor_id: talkingActorId,
          gemini_voice_id: geminiVoiceId,
          lip_sync_strength: Math.max(0, Math.min(1, lipSyncStrength)), // Clamp 0-1
        })
        .select()
        .single()

      if (error) throw error
      return (data || {}) as TalkingActorVoiceLink
    } catch (error) {
      throw new Error(
        `Failed to link voice to actor: ${error}`
      )
    }
  }

  /**
   * Get voices linked to a specific actor
   */
  async getActorVoices(
    actorId: string
  ): Promise<(GeminiVoice & { lip_sync_strength: number })[]> {
    try {
      const { data, error } = await this.supabase
        .from('talking_actor_voice_links')
        .select(`
          lip_sync_strength,
          gemini_voices (*)
        `)
        .eq('talking_actor_id', actorId)

      if (error) throw error

      return (data || []).map((link: any) => ({
        ...link.gemini_voices,
        lip_sync_strength: link.lip_sync_strength,
      }))
    } catch (error) {
      throw new Error(
        `Failed to get actor voices: ${error}`
      )
    }
  }

  /**
   * Get actors that use a specific voice
   */
  async getVoiceActors(voiceId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('talking_actor_voice_links')
        .select('talking_actor_id')
        .eq('gemini_voice_id', voiceId)

      if (error) throw error
      return (data || []).map(row => row.talking_actor_id)
    } catch (error) {
      throw new Error(
        `Failed to get voice actors: ${error}`
      )
    }
  }

  /**
   * Update lip-sync strength for a voice on an actor
   */
  async updateLipSyncStrength(
    actorId: string,
    voiceId: string,
    lipSyncStrength: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('talking_actor_voice_links')
        .update({
          lip_sync_strength: Math.max(0, Math.min(1, lipSyncStrength)),
        })
        .eq('talking_actor_id', actorId)
        .eq('gemini_voice_id', voiceId)

      if (error) throw error
    } catch (error) {
      throw new Error(
        `Failed to update lip-sync strength: ${error}`
      )
    }
  }

  /**
   * Remove voice from actor
   */
  async unlinkVoiceFromActor(
    actorId: string,
    voiceId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('talking_actor_voice_links')
        .delete()
        .eq('talking_actor_id', actorId)
        .eq('gemini_voice_id', voiceId)

      if (error) throw error
    } catch (error) {
      throw new Error(
        `Failed to unlink voice from actor: ${error}`
      )
    }
  }

  /**
   * Synthesize speech using Gemini voice and get audio for lip-sync
   * This would call your existing Gemini speech synthesis integration
   */
  async synthesizeWithLipSync(
    script: string,
    geminiVoiceId: string,
    talkingActorId: string
  ): Promise<{ audioUrl: string; duration: number; lipSyncData: any }> {
    try {
      // Get voice details
      const voice = await this.getGeminiVoice(geminiVoiceId)
      if (!voice) throw new Error('Voice not found')

      // Get lip-sync strength
      const { data: linkData, error: linkError } = await this.supabase
        .from('talking_actor_voice_links')
        .select('lip_sync_strength')
        .eq('talking_actor_id', talkingActorId)
        .eq('gemini_voice_id', geminiVoiceId)
        .single()

      if (linkError) throw linkError

      const lipSyncStrength = linkData?.lip_sync_strength || 0.8

      // TODO: Call your existing Gemini speech synthesis API
      // This should return:
      // - audioUrl: URL to the generated audio
      // - lipSyncData: Phoneme timing data for lip-sync animation
      // - duration: Total duration in seconds

      return {
        audioUrl: 'https://storage.example.com/audio.mp3',
        duration: 10.5,
        lipSyncData: {
          phonemes: [
            { phoneme: 'aa', startTime: 0.0, endTime: 0.2 },
            { phoneme: 'e', startTime: 0.2, endTime: 0.4 },
            // ... more phoneme data
          ],
          strength: lipSyncStrength,
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to synthesize with lip-sync: ${error}`
      )
    }
  }

  /**
   * Get voice languages available
   */
  async getAvailableLanguages(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('gemini_voices')
        .select('language_code')
        .eq('is_active', true)
        .distinct()

      if (error) throw error
      return (data || [])
        .map(row => row.language_code)
        .filter(Boolean)
    } catch (error) {
      throw new Error(
        `Failed to get languages: ${error}`
      )
    }
  }

  /**
   * Get voices by language
   */
  async getVoicesByLanguage(
    languageCode: string,
    workspaceId?: string
  ): Promise<GeminiVoice[]> {
    try {
      let query = this.supabase
        .from('gemini_voices')
        .select('*')
        .eq('language_code', languageCode)
        .eq('is_active', true)

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }

      const { data, error } = await query.order('voice_name', {
        ascending: true,
      })

      if (error) throw error
      return (data || []) as GeminiVoice[]
    } catch (error) {
      throw new Error(
        `Failed to get voices by language: ${error}`
      )
    }
  }
}

export const geminiVoiceService = new GeminiVoiceService(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
