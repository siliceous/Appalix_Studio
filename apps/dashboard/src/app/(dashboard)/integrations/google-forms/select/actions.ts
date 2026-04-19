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
  const admin = createAdminClient()

  // Fetch existing config so we preserve tokens
  const { data: existing } = await (admin as unknown as {
    from: (t: string) => { select: (s: string) => { eq: (...a: unknown[]) => { eq: (...a: unknown[]) => { eq: (...a: unknown[]) => { maybeSingle: () => Promise<{ data: { config: Record<string, string> } | null }> } } } } }
  }).from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_forms')
    .maybeSingle()

  if (!existing?.config) return { error: 'Google Forms not connected. Please reconnect.' }

  const { error } = await (admin as unknown as {
    from: (t: string) => { update: (d: unknown) => { eq: (...a: unknown[]) => { eq: (...a: unknown[]) => { eq: (...a: unknown[]) => Promise<{ error: { message: string } | null }> } } } }
  }).from('sage_integrations')
    .update({
      config: {
        ...existing.config,
        form_id:    formId,
        form_title: formTitle,
      },
    })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_forms')

  if (error) {
    console.error('[selectGoogleForm]', error.message)
    return { error: 'Failed to save form selection. Please try again.' }
  }

  return {}
}
