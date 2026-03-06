'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

async function getWorkspaceId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: raw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = raw as { workspace_id: string } | null
  if (!membership) redirect('/login')
  return membership.workspace_id
}

function triggerIngest(sourceId: string) {
  const apiBase    = process.env.API_BASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiBase || !serviceKey) {
    console.error('[triggerIngest] Missing API_BASE_URL or SUPABASE_SERVICE_ROLE_KEY — ingestion will not run.')
    return
  }

  // after() runs AFTER the response/redirect is sent so it cannot be cancelled
  // by the NEXT_REDIRECT throw. The API responds with 202 immediately and does
  // the real embedding work in setImmediate on its end.
  after(async () => {
    try {
      const res = await fetch(`${apiBase}/chat/ingest/${sourceId}`, {
        method:  'POST',
        headers: { 'x-service-key': serviceKey },
      })
      if (!res.ok) {
        console.error(`[triggerIngest] Ingest API returned ${res.status} for source ${sourceId}`)
      }
    } catch (err: unknown) {
      console.error(`[triggerIngest] Request to ${apiBase}/chat/ingest/${sourceId} failed:`, err)
    }
  })
}

export async function createSource(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const type = (formData.get('type') as string) || 'url'
  const name = (formData.get('name') as string)?.trim() || 'Untitled source'

  let url:      string | null = null
  let filePath: string | null = null
  let metadata: Record<string, unknown> = {}

  if (type === 'url') {
    url = (formData.get('url') as string)?.trim() || null
  } else if (type === 'text') {
    const text = (formData.get('text') as string)?.trim()
    if (text) metadata = { raw_text: text }
  } else if (type === 'notion') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('notion_token') as string)?.trim()
    if (token) metadata = { notion_token: token }
  } else if (type === 'gitbook') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('gitbook_token') as string)?.trim()
    if (token) metadata = { gitbook_token: token }
  } else if (type === 'google_drive') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('google_access_token') as string)?.trim()
    if (token) metadata = { google_access_token: token }
  } else if (type === 'dropbox') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('dropbox_token') as string)?.trim()
    if (token) metadata = { dropbox_token: token }
  } else if (type === 'onedrive') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('ms_access_token') as string)?.trim()
    if (token) metadata = { ms_access_token: token }
  } else if (type === 'sharepoint') {
    url = (formData.get('url') as string)?.trim() || null
    const token  = (formData.get('ms_access_token') as string)?.trim()
    const siteId = (formData.get('sharepoint_site_id') as string)?.trim()
    if (token) metadata = { ms_access_token: token, ...(siteId ? { sharepoint_site_id: siteId } : {}) }
  } else if (type === 'file' || type === 'excel' || type === 'csv') {
    // File was uploaded directly to Supabase Storage from the browser via presigned URL.
    // The form submits only the path + metadata — no binary payload goes through Vercel.
    const preuploaded = (formData.get('file_path') as string)?.trim()
    if (!preuploaded) throw new Error('No file uploaded')
    filePath = preuploaded
    metadata = {
      mime_type:     (formData.get('mime_type') as string) || 'application/octet-stream',
      original_name: (formData.get('original_name') as string) || 'file',
    }
  }

  const { data, error } = await admin
    .from('sources')
    .insert({
      workspace_id: workspaceId,
      type,
      name,
      url,
      file_path: filePath,
      status:    'pending',
      metadata,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create source')

  triggerIngest(data.id)
  redirect('/sources')
}

export async function updateSource(sourceId: string, formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Verify ownership
  const { data: existing } = await admin
    .from('sources')
    .select('type, metadata')
    .eq('id', sourceId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!existing) throw new Error('Source not found')

  const type     = (existing as { type: string; metadata: Record<string, unknown> }).type
  const prevMeta = (existing as { type: string; metadata: Record<string, unknown> }).metadata ?? {}

  const name = (formData.get('name') as string)?.trim() || undefined
  let url:      string | null | undefined = undefined
  let metadata: Record<string, unknown> | undefined = undefined

  if (type === 'url' || type === 'sitemap') {
    url = (formData.get('url') as string)?.trim() || null
  } else if (type === 'text') {
    const text = (formData.get('text') as string)?.trim()
    metadata = { ...prevMeta, ...(text ? { raw_text: text } : {}) }
  } else if (type === 'notion') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('notion_token') as string)?.trim()
    metadata = { ...prevMeta, ...(token ? { notion_token: token } : {}) }
  } else if (type === 'gitbook') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('gitbook_token') as string)?.trim()
    metadata = { ...prevMeta, ...(token ? { gitbook_token: token } : {}) }
  } else if (type === 'google_drive') {
    url = (formData.get('url') as string)?.trim() || null
    // Edit form sends two separate fields; prefer Service Account JSON over OAuth token
    const jsonKey = (formData.get('google_service_account_json') as string)?.trim()
    const oauthToken = (formData.get('google_oauth_token') as string)?.trim()
    // Also accept legacy combined field name (from add form)
    const legacyToken = (formData.get('google_access_token') as string)?.trim()
    const credential = jsonKey || oauthToken || legacyToken || null
    metadata = { ...prevMeta, ...(credential ? { google_access_token: credential } : {}) }
  } else if (type === 'dropbox') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('dropbox_token') as string)?.trim()
    metadata = { ...prevMeta, ...(token ? { dropbox_token: token } : {}) }
  } else if (type === 'onedrive') {
    url = (formData.get('url') as string)?.trim() || null
    const token = (formData.get('ms_access_token') as string)?.trim()
    metadata = { ...prevMeta, ...(token ? { ms_access_token: token } : {}) }
  } else if (type === 'sharepoint') {
    url = (formData.get('url') as string)?.trim() || null
    const token  = (formData.get('ms_access_token') as string)?.trim()
    const siteId = (formData.get('sharepoint_site_id') as string)?.trim()
    metadata = { ...prevMeta, ...(token ? { ms_access_token: token } : {}), ...(siteId ? { sharepoint_site_id: siteId } : {}) }
  }

  const patch: Record<string, unknown> = { status: 'pending', error_message: null }
  if (name)            patch.name     = name
  if (url !== undefined) patch.url    = url
  if (metadata)        patch.metadata = metadata

  await admin.from('sources').update(patch).eq('id', sourceId).eq('workspace_id', workspaceId)
  triggerIngest(sourceId)
  redirect('/sources')
}

export async function deleteSource(sourceId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  await admin.from('sources').delete().eq('id', sourceId).eq('workspace_id', workspaceId)
  revalidatePath('/sources')
}

export async function resyncSource(sourceId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  await admin
    .from('sources')
    .update({ status: 'pending' })
    .eq('id', sourceId)
    .eq('workspace_id', workspaceId)

  triggerIngest(sourceId)
  revalidatePath('/sources')
}
