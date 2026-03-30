'use server'

import { createClient } from '@/lib/supabase/server'
import type { SageVoiceConfig } from '@/lib/sage-voice-config'

export async function getSageVoiceConfig(): Promise<{ config: SageVoiceConfig | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { config: null, error: 'Unauthenticated' }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('sage_voice_config')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') return { config: null, error: error.message }

  const raw = (data as { sage_voice_config: SageVoiceConfig | null } | null)?.sage_voice_config
  return { config: raw ?? null }
}

export async function saveSageVoiceConfig(
  config: SageVoiceConfig,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthenticated' }

  // sage_voice_config is a new column — cast to any until types are regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('user_profiles') as any)
    .update({ sage_voice_config: config, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
