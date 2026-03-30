import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { Header }       from '@/components/layout/header'
import { SageVoiceSettingsForm } from './sage-voice-settings-form'
import { getSageVoiceConfig } from '@/app/actions/sage-voice-settings'
import { DEFAULT_VOICE_CONFIG } from '@/lib/sage-voice-config'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sage Voice Settings' }

export default async function SageVoiceSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check plan — voice is Pro+
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role, workspaces(plan, subscription_status, trial_ends_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type WS = { plan: string; subscription_status: string; trial_ends_at: string | null }
  const ws = (membership as unknown as { workspaces: WS } | null)?.workspaces
  const isOnTrial = ws?.subscription_status === 'trialing'
    && ws.trial_ends_at != null
    && new Date(ws.trial_ends_at) > new Date()
  const hasVoice = ['pro', 'team', 'enterprise'].includes(ws?.plan ?? '') || isOnTrial

  const { config } = await getSageVoiceConfig()
  const initial = config ?? DEFAULT_VOICE_CONFIG

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Header
        title="Sage Voice"
        description="Customise how Sage sounds and behaves during voice sessions"
      />

      {!hasVoice && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-6 py-4 text-sm text-amber-800 dark:text-amber-300">
          Sage Voice is available on Pro, Team, and Enterprise plans.{' '}
          <a href="/settings/upgrade" className="underline font-medium">Upgrade to unlock →</a>
        </div>
      )}

      <SageVoiceSettingsForm initial={initial} disabled={!hasVoice} />
    </div>
  )
}
