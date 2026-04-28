'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!data) redirect('/login')
  return (data as { workspace_id: string }).workspace_id
}

async function getWorkspaceFromConfig(): Promise<{ workspaceId: string; fromEmail: string; fromName: string }> {
  const supabase     = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!member) redirect('/login')

  const workspaceId = (member as { workspace_id: string }).workspace_id
  const { data: ws } = await supabase
    .from('workspaces')
    .select('name, automation_config')
    .eq('id', workspaceId)
    .single()

  const cfg       = ((ws as { automation_config?: Record<string,string> } | null)?.automation_config ?? {})
  const fromEmail = cfg.email_from_address ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@appalix.com'
  const fromName  = (ws as { name?: string } | null)?.name ?? 'Appalix'

  return { workspaceId, fromEmail, fromName }
}

// ── Campaign CRUD ─────────────────────────────────────────────────────────────

export async function createCampaign(formData: FormData) {
  const { workspaceId, fromEmail, fromName } = await getWorkspaceFromConfig()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const recipientFilter = formData.get('recipient_tags')
    ? { tags: (formData.get('recipient_tags') as string).split(',').map(t => t.trim()).filter(Boolean) }
    : { all: true }

  const { data, error } = await admin.from('email_campaigns').insert({
    workspace_id:     workspaceId,
    name:             (formData.get('name') as string)?.trim(),
    campaign_type:    (formData.get('campaign_type') as string) || 'newsletter',
    subject:          (formData.get('subject') as string)?.trim(),
    preview_text:     (formData.get('preview_text') as string)?.trim() || null,
    body_html:        (formData.get('body_html') as string) || '',
    body_text:        (formData.get('body_text') as string)?.trim() || null,
    from_name:        (formData.get('from_name') as string)?.trim() || fromName,
    from_email:       (formData.get('from_email') as string)?.trim() || fromEmail,
    reply_to:         (formData.get('reply_to') as string)?.trim() || null,
    recipient_filter: recipientFilter,
    status:           'draft',
    created_by:       user?.id ?? null,
  }).select('id').single()

  if (error) throw new Error(error.message)
  redirect(`/email/campaigns/${(data as { id: string }).id}`)
}

export async function updateCampaign(campaignId: string, formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  // Verify ownership
  const { data: existing } = await admin.from('email_campaigns')
    .select('workspace_id, status')
    .eq('id', campaignId)
    .single()
  if (!existing || (existing as { workspace_id: string }).workspace_id !== workspaceId) {
    throw new Error('Campaign not found')
  }
  if (!['draft', 'paused', 'failed'].includes((existing as { status: string }).status)) {
    throw new Error('Cannot edit a campaign that is sending or completed')
  }

  const recipientFilter = formData.get('recipient_tags')
    ? { tags: (formData.get('recipient_tags') as string).split(',').map(t => t.trim()).filter(Boolean) }
    : { all: true }

  const { error } = await admin.from('email_campaigns').update({
    name:             (formData.get('name') as string)?.trim(),
    campaign_type:    (formData.get('campaign_type') as string) || 'newsletter',
    subject:          (formData.get('subject') as string)?.trim(),
    preview_text:     (formData.get('preview_text') as string)?.trim() || null,
    body_html:        (formData.get('body_html') as string) || '',
    body_text:        (formData.get('body_text') as string)?.trim() || null,
    from_name:        (formData.get('from_name') as string)?.trim(),
    from_email:       (formData.get('from_email') as string)?.trim(),
    reply_to:         (formData.get('reply_to') as string)?.trim() || null,
    recipient_filter: recipientFilter,
    updated_at:       new Date().toISOString(),
  }).eq('id', campaignId)

  if (error) throw new Error(error.message)
  revalidatePath(`/email/campaigns/${campaignId}`)
  redirect(`/email/campaigns/${campaignId}`)
}

export async function deleteCampaign(campaignId: string) {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data: existing } = await admin.from('email_campaigns')
    .select('workspace_id, status')
    .eq('id', campaignId)
    .single()
  if (!existing || (existing as { workspace_id: string }).workspace_id !== workspaceId) return
  if ((existing as { status: string }).status === 'sending') throw new Error('Cannot delete a campaign that is currently sending')

  await admin.from('email_campaigns').delete().eq('id', campaignId)
  redirect('/email/campaigns')
}

// ── Send ──────────────────────────────────────────────────────────────────────

export async function sendCampaign(campaignId: string) {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data: existing } = await admin.from('email_campaigns')
    .select('workspace_id, status')
    .eq('id', campaignId)
    .single()
  if (!existing || (existing as { workspace_id: string }).workspace_id !== workspaceId) {
    throw new Error('Campaign not found')
  }

  const apiBase    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(`${apiBase}/email/campaigns/${campaignId}/send`, {
    method:  'POST',
    headers: { 'x-service-key': serviceKey },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? 'Failed to start campaign')
  }

  revalidatePath('/email/campaigns')
  revalidatePath(`/email/campaigns/${campaignId}`)
}

// ── Read helpers (used by server components) ──────────────────────────────────

export async function getCampaigns() {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data, error } = await admin
    .from('email_campaigns')
    .select(`
      id, name, campaign_type, subject, status, scheduled_at, sent_at,
      total_recipients, sent_count, opened_count, clicked_count,
      bounced_count, complained_count, created_at
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCampaign(campaignId: string) {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data, error } = await admin
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) return null
  return data
}

export async function getContactCount(tags?: string[]) {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  let query = admin
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('email_opt_out', false)
    .neq('email_deliverability', 'bounced')
    .neq('email_deliverability', 'complained')
    .not('email', 'is', null)

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const { count } = await query
  return count ?? 0
}
