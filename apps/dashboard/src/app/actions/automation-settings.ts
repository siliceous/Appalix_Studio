'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveAutomationSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as { workspace_id: string; role: string } | null

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
  const { data: wsRaw } = await supabase
    .from('workspaces')
    .select('automation_config')
    .eq('id', membership.workspace_id)
    .single()

  const ws       = wsRaw as { automation_config: Record<string, string> } | null
  const existing = (ws?.automation_config ?? {}) as Record<string, string>
  const merged   = { ...existing, ...config }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('workspaces')
    .update({ automation_config: merged })
    .eq('id', membership.workspace_id)

  redirect('/settings/automation?saved=1')
}

export async function saveOutreachVariables(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as { workspace_id: string; role: string } | null
  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    throw new Error('Unauthorised')
  }

  const get = (key: string) => (formData.get(key) as string | null)?.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('workspace_automation_settings')
    .upsert(
      {
        workspace_id:           membership.workspace_id,
        value_proposition:      get('value_proposition'),
        workspace_tagline:      get('workspace_tagline'),
        challenge_area:         get('challenge_area'),
        fallback_sender_title:  get('fallback_sender_title'),
        fallback_calendar_link: get('fallback_calendar_link'),
        updated_by:             user.id,
      },
      { onConflict: 'workspace_id' }
    )

  redirect('/settings/automation?saved=outreach')
}
