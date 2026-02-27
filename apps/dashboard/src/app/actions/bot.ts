'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateBot(botId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify the bot belongs to the user's workspace
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
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
    model:            (formData.get('model') as string) || undefined,
    max_tokens:       parseInt(formData.get('max_tokens') as string) || undefined,
    temperature:      parseFloat(formData.get('temperature') as string) ?? undefined,
    enable_rag:       formData.get('enable_rag') === 'on',
    enable_memory:    formData.get('enable_memory') === 'on',
    enable_tools:     formData.get('enable_tools') === 'on',
    fallback_message: (formData.get('fallback_message') as string)?.trim() || null,
  }).eq('id', botId)

  if (error) throw new Error(error.message)
  redirect(`/bots/${botId}`)
}
