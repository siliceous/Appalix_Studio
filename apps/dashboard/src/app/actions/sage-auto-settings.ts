'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const API_BASE    = process.env.API_BASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export interface AutoSettings {
  global_auto_enabled:  boolean
  email_auto_enabled:   boolean
  bots_auto_enabled:    boolean
  forms_auto_enabled:   boolean
  tickets_auto_enabled: boolean
  default_pipeline_id:  string | null
}

const DEFAULTS: AutoSettings = {
  global_auto_enabled:  false,
  email_auto_enabled:   false,
  bots_auto_enabled:    false,
  forms_auto_enabled:   false,
  tickets_auto_enabled: false,
  default_pipeline_id:  null,
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
    .select('global_auto_enabled, email_auto_enabled, bots_auto_enabled, forms_auto_enabled, tickets_auto_enabled, default_pipeline_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!data) return DEFAULTS
  return { ...DEFAULTS, ...(data as Partial<AutoSettings>) }
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

export async function setDefaultPipeline(pipelineId: string | null): Promise<void> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return

  const admin = createAdminClient()
  await admin
    .from('sage_workspace_settings')
    .upsert(
      { workspace_id: workspaceId, default_pipeline_id: pipelineId, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' },
    )
}

export interface BackfillResultItem {
  id:         string
  channel:    'email' | 'bots' | 'forms' | 'tickets'
  action:     'create_lead' | 'create_ticket'
  name:       string
  pipelineId: string | null
}

export async function runAutoBackfill(): Promise<{ ok: boolean; applied?: number; results?: BackfillResultItem[]; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ok: false, error: 'Not authenticated' }
  if (!API_BASE || !SERVICE_KEY) return { ok: false, error: 'API not configured' }

  try {
    const res = await fetch(`${API_BASE}/sage/emails/backfill-auto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId }),
    })
    const json = await res.json() as { ok: boolean; applied?: number; results?: BackfillResultItem[]; error?: string }
    return json
  } catch {
    return { ok: false, error: 'Request failed' }
  }
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
