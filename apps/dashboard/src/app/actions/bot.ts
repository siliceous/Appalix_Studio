'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createBot(payload: {
  name: string
  description: string
  bot_type: 'widget' | 'internal'
  model: string
  system_prompt: string
  max_tokens: number
  temperature: number
  enable_rag: boolean
  enable_memory: boolean
  enable_tools: boolean
  language_preference: string
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('bots')
    .insert({ ...payload, workspace_id: membership.workspace_id, created_by: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function updateBot(botId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify the bot belongs to the user's workspace
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: botRaw } = await supabase
    .from('bots')
    .select('workspace_id')
    .eq('id', botId)
    .single()
  if (!botRaw || (botRaw as { workspace_id: string }).workspace_id !== membership.workspace_id) {
    throw new Error('Bot not found')
  }

  const admin = createAdminClient()
  const { error } = await admin.from('bots').update({
    name:             (formData.get('name') as string)?.trim() || undefined,
    description:      (formData.get('description') as string)?.trim() || null,
    bot_type:         (formData.get('bot_type') as string) === 'internal' ? 'internal' : 'widget',
    system_prompt:    (formData.get('system_prompt') as string)?.trim() || null,
    max_tokens:       parseInt(formData.get('max_tokens') as string) || undefined,
    temperature:      parseFloat(formData.get('temperature') as string) ?? undefined,
    enable_rag:          formData.get('enable_rag') === 'on',
    enable_memory:       formData.get('enable_memory') === 'on',
    enable_tools:        formData.get('enable_tools') === 'on',
    fallback_message:    (formData.get('fallback_message') as string)?.trim() || null,
    language_preference: (formData.get('language_preference') as string)?.trim() || 'auto',
    widget_skin:         (formData.get('widget_skin') as string) || 'light',
    widget_accent_color: (formData.get('widget_accent_color') as string) || null,
    widget_header_color:  (formData.get('widget_header_color') as string) || null,
    widget_avatar_url:    (formData.get('widget_avatar_url') as string)?.trim() || null,
  }).eq('id', botId)

  if (error) throw new Error(error.message)
  redirect(`/bots/${botId}`)
}

export async function uploadBotAvatar(
  botId: string,
  base64: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return { ok: false, error: 'Not authenticated' }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 0) return { ok: false, error: 'Empty image data' }
  if (buffer.length > 1 * 1024 * 1024) return { ok: false, error: 'Avatar must be under 1 MB after crop' }

  const admin = createAdminClient()
  const path  = `${membership.workspace_id}/bots/${botId}/avatar_${Date.now()}.jpg`

  const { error: uploadError } = await admin.storage
    .from('bot-avatars')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: { publicUrl } } = admin.storage
    .from('bot-avatars')
    .getPublicUrl(path)

  return { ok: true, url: publicUrl }
}

export async function deleteBot(botId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { error } = await admin
    .from('bots')
    .delete()
    .eq('id', botId)
    .eq('workspace_id', membership.workspace_id)

  if (error) throw new Error(error.message)
}
