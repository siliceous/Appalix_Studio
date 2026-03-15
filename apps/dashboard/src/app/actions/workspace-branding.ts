'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface WorkspaceBranding {
  workspace_id:    string
  brand_name:      string | null
  logo_url:        string | null
  favicon_url:     string | null
  primary_color:   string
  hide_powered_by: boolean
  welcome_message: string | null
}

const DEFAULTS: Omit<WorkspaceBranding, 'workspace_id'> = {
  brand_name:      null,
  logo_url:        null,
  favicon_url:     null,
  primary_color:   '#15A4AE',
  hide_powered_by: false,
  welcome_message: null,
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

export async function getBranding(): Promise<WorkspaceBranding | null> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('workspace_branding')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!data) return { workspace_id: workspaceId, ...DEFAULTS }
  return { ...DEFAULTS, ...(data as WorkspaceBranding) }
}

export async function updateBranding(
  patch: Partial<Omit<WorkspaceBranding, 'workspace_id'>>,
): Promise<{ ok: boolean; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ok: false, error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('workspace_branding')
    .upsert(
      { workspace_id: workspaceId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' },
    )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function uploadBrandingLogo(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { ok: false, error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'No file provided' }

  // Validate: image only, max 2 MB
  if (!file.type.startsWith('image/')) return { ok: false, error: 'File must be an image' }
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Logo must be under 2 MB' }

  const admin   = createAdminClient()
  const ext     = file.name.split('.').pop() ?? 'png'
  const path    = `${workspaceId}/logo.${ext}`
  const buffer  = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('workspace-logos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: { publicUrl } } = admin.storage
    .from('workspace-logos')
    .getPublicUrl(path)

  // Persist URL to branding row
  await updateBranding({ logo_url: publicUrl })

  return { ok: true, url: publicUrl }
}
