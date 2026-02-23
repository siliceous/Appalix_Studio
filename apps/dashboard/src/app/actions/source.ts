'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function getWorkspaceId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: raw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = raw as { workspace_id: string } | null
  if (!membership) redirect('/login')
  return membership.workspace_id
}

async function triggerIngest(sourceId: string) {
  const apiBase = process.env.API_BASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiBase || !serviceKey) return

  // Fire-and-forget — ingest endpoint returns 202 immediately
  fetch(`${apiBase}/chat/ingest/${sourceId}`, {
    method: 'POST',
    headers: { 'x-service-key': serviceKey },
  }).catch(() => {/* ignore network errors */})
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
  } else if (type === 'file') {
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) throw new Error('No file provided')

    // Ensure the storage bucket exists (idempotent)
    await admin.storage.createBucket('sources', {
      public:           false,
      fileSizeLimit:    50 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    }).catch(() => { /* already exists */ })

    const ext         = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${workspaceId}/${crypto.randomUUID()}.${ext}`
    const buffer      = await file.arrayBuffer()

    const { error: uploadError } = await admin.storage
      .from('sources')
      .upload(storagePath, buffer, { contentType: file.type })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    filePath = storagePath
    metadata = { mime_type: file.type, original_name: file.name }
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

  await triggerIngest(data.id)
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

  await triggerIngest(sourceId)
  revalidatePath('/sources')
}
