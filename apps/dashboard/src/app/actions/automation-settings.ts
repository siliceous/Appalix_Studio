'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveAutomationSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Unauthorised')
  }

  const config: Record<string, string> = {}

  const fields = [
    'resend_api_key',
    'email_from_address',
    'approver_email',
    'approval_slack_webhook_url',
  ]

  for (const field of fields) {
    const val = (formData.get(field) as string | null)?.trim()
    if (val) config[field] = val
  }

  // Merge with existing config (preserve keys not in this form)
  const { data: ws } = await supabase
    .from('workspaces')
    .select('automation_config')
    .eq('id', membership.workspace_id)
    .single()

  const existing = (ws?.automation_config ?? {}) as Record<string, string>
  const merged   = { ...existing, ...config }

  await supabase
    .from('workspaces')
    .update({ automation_config: merged })
    .eq('id', membership.workspace_id)

  redirect('/settings/automation?saved=1')
}
