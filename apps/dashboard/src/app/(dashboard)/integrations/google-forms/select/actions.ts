'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function selectGoogleForm({
  workspaceId,
  userId,
  formId,
  formTitle,
}: {
  workspaceId: string
  userId:      string
  formId:      string
  formTitle:   string
}): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Fetch existing config to preserve tokens
  const { data: existing } = await admin
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_forms')
    .maybeSingle() as { data: { config: Record<string, string> } | null }

  if (!existing?.config) return { error: 'Google Forms not connected. Please reconnect.' }

  const { error } = await admin
    .from('sage_integrations')
    .update({
      config: {
        ...existing.config,
        form_id:    formId,
        form_title: formTitle,
      },
    })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_forms') as { error: { message: string } | null }

  if (error) {
    console.error('[selectGoogleForm]', error.message)
    return { error: 'Failed to save form selection. Please try again.' }
  }

  return {}
}
