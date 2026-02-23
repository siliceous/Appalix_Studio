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
  const url  = (formData.get('url') as string)?.trim() || null
  const text = (formData.get('text') as string)?.trim() || null

  const { data, error } = await admin
    .from('sources')
    .insert({
      workspace_id: workspaceId,
      type,
      name,
      url:    type === 'url' ? url : null,
      status: 'pending',
      metadata: type === 'text' && text ? { raw_text: text } : {},
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
