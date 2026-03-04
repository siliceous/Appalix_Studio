'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { LeadAdSource, Lead } from '@/lib/types'

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

  // Create SageContact
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

  const contactId = contactRaw ? (contactRaw as { id: string }).id : null

  // Create SageDeal
  const platformLabel = lead.source_platform === 'meta' ? 'Meta Ads' : 'Google Ads'
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
