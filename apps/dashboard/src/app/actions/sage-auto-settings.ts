'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface AutoSettings {
  global_auto_enabled:  boolean
  email_auto_enabled:   boolean
  bots_auto_enabled:    boolean
  forms_auto_enabled:   boolean
  tickets_auto_enabled: boolean
}

const DEFAULTS: AutoSettings = {
  global_auto_enabled:  true,
  email_auto_enabled:   true,
  bots_auto_enabled:    true,
  forms_auto_enabled:   true,
  tickets_auto_enabled: true,
}

async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

export async function getAutoSettings(): Promise<AutoSettings> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return DEFAULTS

  const supabase = await createClient()
  const { data } = await supabase
    .from('sage_workspace_settings')
    .select('global_auto_enabled, email_auto_enabled, bots_auto_enabled, forms_auto_enabled, tickets_auto_enabled')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!data) return DEFAULTS
  return data as AutoSettings
}

export async function updateAutoSetting(
  field: keyof AutoSettings,
  value: boolean,
): Promise<void> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return

  const admin = createAdminClient()
  await admin
    .from('sage_workspace_settings')
    .upsert(
      { workspace_id: workspaceId, [field]: value, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' },
    )
}

export async function dismissFeedItem(
  sourceType: 'email' | 'bot' | 'form' | 'ticket',
  sourceId: string,
): Promise<void> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return

  const admin = createAdminClient()
  await admin
    .from('sage_feed_dismissals')
    .upsert(
      { workspace_id: workspaceId, source_type: sourceType, source_id: sourceId },
      { onConflict: 'workspace_id,source_type,source_id' },
    )
}
