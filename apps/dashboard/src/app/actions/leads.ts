'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { LeadAdSource, Lead, LeadScore } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Lead Ad Sources
// ---------------------------------------------------------------------------

/** Save (create or update) a lead ad source for the given platform */
export async function saveLeadSource(formData: FormData): Promise<LeadAdSource> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const platform = (formData.get('platform') as string).trim() as 'meta' | 'google_ads'
  const name     = (formData.get('name') as string | null)?.trim() || ''

  // Build config object based on platform
  let config: Record<string, string> = {}
  if (platform === 'meta') {
    config = {
      verify_token:      (formData.get('verify_token')      as string | null)?.trim() ?? '',
      app_secret:        (formData.get('app_secret')        as string | null)?.trim() ?? '',
      page_access_token: (formData.get('page_access_token') as string | null)?.trim() ?? '',
    }
  } else if (platform === 'google_ads') {
    config = {
      webhook_key: (formData.get('webhook_key') as string | null)?.trim() ?? '',
    }
  }

  // Check if source already exists for this workspace + platform
  const { data: existing } = await admin
    .from('lead_ad_sources')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .limit(1)
    .single()

  let result
  if (existing) {
    const { data, error } = await admin
      .from('lead_ad_sources')
      .update({ name, config, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', (existing as { id: string }).id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    result = data
  } else {
    const { data, error } = await admin
      .from('lead_ad_sources')
      .insert({ workspace_id: workspaceId, platform, name, config, status: 'active' })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    result = data
  }

  revalidatePath('/forms/sources')
  return result as LeadAdSource
}

/** Disconnect / deactivate a lead ad source */
export async function deleteLeadSource(id: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('lead_ad_sources')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  revalidatePath('/forms/sources')
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/** Delete a single lead and its events (cascade) */
export async function deleteLead(id: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  revalidatePath('/forms/leads')
}

export async function deleteLeads(ids: string[]): Promise<void> {
  if (!ids.length) return
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()
  const { error } = await admin
    .from('leads')
    .delete()
    .in('id', ids)
    .eq('workspace_id', workspaceId)
  if (error) throw new Error(error.message)
  revalidatePath('/forms/leads')
}

/**
 * Move a lead into the Sage CRM pipeline.
 * Creates a SageContact + SageDeal in the first stage of the first pipeline.
 */
export async function moveLeadToPipeline(leadId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  // Fetch the lead
  const { data: leadRaw, error: leadErr } = await admin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
    .single()

  if (leadErr || !leadRaw) throw new Error('Lead not found')
  const lead = leadRaw as Lead

  if (lead.pipeline_stage === 'crm_pipeline') {
    throw new Error('Lead is already in the pipeline')
  }

  // Find the first pipeline
  const { data: pipelineRaw } = await admin
    .from('sage_pipelines')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!pipelineRaw) throw new Error('No pipeline found. Create a pipeline in Sage first.')
  const pipelineId = (pipelineRaw as { id: string }).id

  // Find the first stage
  const { data: stageRaw } = await admin
    .from('sage_pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!stageRaw) throw new Error('Pipeline has no stages.')
  const stageId = (stageRaw as { id: string }).id

  // Find or create SageContact: email → name → phone
  type CR = { id: string }
  let contactId: string | null = null
  let existingContact: CR | null = null

  if (lead.email) {
    const { data } = await admin.from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('email', lead.email).limit(1).maybeSingle()
    if (data) existingContact = data as CR
  }
  if (!existingContact && lead.name) {
    const { data } = await admin.from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('name', lead.name.trim()).limit(1).maybeSingle()
    if (data) existingContact = data as CR
  }
  if (!existingContact && lead.phone) {
    const { data } = await admin.from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('phone', lead.phone.trim()).limit(1).maybeSingle()
    if (data) existingContact = data as CR
  }

  if (existingContact) {
    contactId = existingContact.id
    const upd: Record<string, string | string[]> = {}
    if (lead.email)    upd.email        = lead.email
    if (lead.phone)    upd.phone        = lead.phone
    if (lead.company)  upd.company_name = lead.company
    if (lead.job_title) upd.title       = lead.job_title
    if (Object.keys(upd).length > 0) await admin.from('sage_contacts').update(upd).eq('id', contactId)
  } else {
    const { data: contactRaw } = await admin
      .from('sage_contacts')
      .insert({
        workspace_id: workspaceId,
        name:         lead.name,
        email:        lead.email,
        phone:        lead.phone,
        company_name: lead.company,
        title:        lead.job_title,
        website_url:  lead.website,
        source:       'import',
        tags:         ['lead_ad', lead.source_platform],
      })
      .select('id')
      .single()
    contactId = contactRaw ? (contactRaw as CR).id : null
  }

  // Create SageDeal
  const PLATFORM_LABELS: Record<string, string> = {
    meta: 'Meta Ads', google_ads: 'Google Ads',
    mailchimp: 'Mailchimp', activecampaign: 'ActiveCampaign',
  }
  const platformLabel = PLATFORM_LABELS[lead.source_platform] ?? lead.source_platform
  const dealTitle     = `${lead.name} – ${platformLabel}`

  await admin.from('sage_deals').insert({
    workspace_id: workspaceId,
    pipeline_id:  pipelineId,
    stage_id:     stageId,
    contact_id:   contactId,
    title:        dealTitle,
    source:       lead.source_platform,
    priority:     lead.lead_score ?? 'medium',
    tags:         ['lead_ad'],
  })

  // Update lead pipeline_stage
  await admin
    .from('leads')
    .update({ pipeline_stage: 'crm_pipeline', updated_at: new Date().toISOString() })
    .eq('id', leadId)

  // Log event
  await admin.from('lead_events').insert({
    lead_id:    leadId,
    event_type: 'pipeline_moved',
    event_data: { pipeline_id: pipelineId, stage_id: stageId, contact_id: contactId },
  })

  revalidatePath('/forms/leads')
  revalidatePath('/sage/pipelines')
}

// ---------------------------------------------------------------------------
// Email Platform Sync (Mailchimp / ActiveCampaign)
// ---------------------------------------------------------------------------

interface NormalizedContact {
  name:      string
  email:     string | null
  phone:     string | null
  company:   string | null
  job_title: string | null
  raw:       Record<string, unknown>
}

function scoreContact(c: NormalizedContact): LeadScore {
  const n = [c.email, c.phone, c.company, c.job_title].filter(Boolean).length
  return n >= 3 ? 'high' : n >= 2 ? 'medium' : 'low'
}

async function fetchMailchimpContacts(config: Record<string, string>): Promise<NormalizedContact[]> {
  const { api_key, server, list_id } = config
  const results: NormalizedContact[] = []
  let offset = 0
  const count = 1000

  while (true) {
    const res = await fetch(
      `https://${server}.api.mailchimp.com/3.0/lists/${list_id}/members?count=${count}&offset=${offset}&status=subscribed`,
      { headers: { Authorization: `Basic ${Buffer.from(`any:${api_key}`).toString('base64')}` } }
    )
    if (!res.ok) break
    const data = await res.json() as { members?: Record<string, unknown>[]; total_items?: number }
    const members = data.members ?? []
    for (const m of members) {
      const mf = (m.merge_fields ?? {}) as Record<string, string>
      const name = (m.full_name as string | undefined) ||
        `${mf.FNAME ?? ''} ${mf.LNAME ?? ''}`.trim() ||
        (m.email_address as string)
      results.push({
        name,
        email:     (m.email_address as string | null) ?? null,
        phone:     mf.PHONE   ?? null,
        company:   mf.COMPANY ?? null,
        job_title: null,
        raw:       m,
      })
    }
    if (members.length < count) break
    offset += count
  }
  return results
}

async function fetchActiveCampaignContacts(config: Record<string, string>): Promise<NormalizedContact[]> {
  const { api_url, api_key } = config
  const results: NormalizedContact[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await fetch(
      `${api_url.replace(/\/$/, '')}/api/3/contacts?limit=${limit}&offset=${offset}`,
      { headers: { 'Api-Token': api_key } }
    )
    if (!res.ok) break
    const data = await res.json() as { contacts?: Record<string, unknown>[] }
    const contacts = data.contacts ?? []
    for (const c of contacts) {
      const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || (c.email as string)
      results.push({
        name,
        email:     (c.email     as string | null) ?? null,
        phone:     (c.phone     as string | null) ?? null,
        company:   (c.orgname   as string | null) ?? null,
        job_title: null,
        raw:       c,
      })
    }
    if (contacts.length < limit) break
    offset += limit
  }
  return results
}

export async function syncFromEmailPlatform(
  provider: 'mailchimp' | 'activecampaign',
): Promise<{ synced: number; skipped: number }> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  // Read stored credentials from sage_integrations
  const { data: integrationRaw } = await admin
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .eq('status', 'connected')
    .maybeSingle()

  if (!integrationRaw) throw new Error(`${provider} is not connected. Connect it in Sage → Automations first.`)
  const config = integrationRaw.config as Record<string, string>

  // Fetch contacts from the platform
  const contacts = provider === 'mailchimp'
    ? await fetchMailchimpContacts(config)
    : await fetchActiveCampaignContacts(config)

  let synced  = 0
  let skipped = 0

  for (const contact of contacts) {
    if (!contact.email && !contact.phone) { skipped++; continue }

    // Deduplicate by email or phone within workspace
    const orFilter = [
      contact.email ? `email.eq.${contact.email}` : null,
      contact.phone ? `phone.eq.${contact.phone}` : null,
    ].filter(Boolean).join(',')

    const { data: existing } = await admin
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(orFilter)
      .limit(1)
      .maybeSingle()

    if (existing) { skipped++; continue }

    await admin.from('leads').insert({
      workspace_id:    workspaceId,
      source_id:       null,
      source_platform: provider,
      name:            contact.name,
      email:           contact.email,
      phone:           contact.phone,
      company:         contact.company,
      job_title:       contact.job_title,
      lead_score:      scoreContact(contact),
      pipeline_stage:  'new_lead',
      raw_payload:     contact.raw,
    })
    synced++
  }

  revalidatePath('/forms/leads')
  revalidatePath('/forms/analytics')
  return { synced, skipped }
}
