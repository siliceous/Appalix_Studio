'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SageContact, SageTicketStatus, SageTicketPriority, SageDealStatus, SageContactType, SageContactVisibility, SageDealActivity } from '@/lib/types'

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

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

async function logActivity(
  workspaceId: string,
  entityType: string,
  entityId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  entityType,
    entity_id:    entityId,
    event_type:   eventType,
    payload,
    user_id:      user?.id ?? null,
  })
}

// ---------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------

export async function createContact(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const name          = (formData.get('name') as string).trim()
  const email         = (formData.get('email') as string | null)?.trim() || null
  const phone         = (formData.get('phone') as string | null)?.trim() || null
  const title         = (formData.get('title') as string | null)?.trim() || null
  const contact_type  = ((formData.get('contact_type') as string | null) || 'potential_customer') as SageContactType
  const company_name  = (formData.get('company_name') as string | null)?.trim() || null
  const website_url   = (formData.get('website_url') as string | null)?.trim() || null
  const business_goal = (formData.get('business_goal') as string | null)?.trim() || null
  const street        = (formData.get('street') as string | null)?.trim() || null
  const city          = (formData.get('city') as string | null)?.trim() || null
  const state         = (formData.get('state') as string | null)?.trim() || null
  const zip           = (formData.get('zip') as string | null)?.trim() || null
  const country       = (formData.get('country') as string | null)?.trim() || null
  const visibility    = ((formData.get('visibility') as string | null) || 'everyone') as SageContactVisibility
  const notes         = (formData.get('notes') as string | null)?.trim() || null
  const tagsRaw       = (formData.get('tags') as string | null)?.trim() || ''
  const tags          = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const source        = ((formData.get('source') as string | null)?.trim() || 'manual')
  const valueRaw      = (formData.get('value') as string | null)?.trim()
  const value         = valueRaw ? parseFloat(valueRaw) : null

  // Dedup check: email → name → phone before insert
  type CR = { id: string }
  let dupId: string | null = null
  if (email) {
    const { data: d } = await admin.from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('email', email).limit(1).maybeSingle()
    if (d) dupId = (d as CR).id
  }
  if (!dupId && name) {
    const { data: d } = await admin.from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('name', name.trim()).limit(1).maybeSingle()
    if (d) dupId = (d as CR).id
  }
  if (!dupId && phone) {
    const { data: d } = await admin.from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('phone', phone.trim()).limit(1).maybeSingle()
    if (d) dupId = (d as CR).id
  }
  if (dupId) throw new Error('A contact with the same email, name, or phone already exists.')

  const { data, error } = await admin
    .from('sage_contacts')
    .insert({ workspace_id: workspaceId, name, email, phone, title, contact_type, company_name, website_url, business_goal, street, city, state, zip, country, visibility, notes, tags, source, value })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const contact = data as SageContact
  await logActivity(workspaceId, 'contact', contact.id, 'contact_created', { name })
  revalidatePath('/sage/contacts')
  return contact
}

export async function updateContact(id: string, formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const name          = (formData.get('name') as string).trim()
  const email         = (formData.get('email') as string | null)?.trim() || null
  const phone         = (formData.get('phone') as string | null)?.trim() || null
  const title         = (formData.get('title') as string | null)?.trim() || null
  const contact_type  = ((formData.get('contact_type') as string | null) || 'potential_customer') as SageContactType
  const company_name  = (formData.get('company_name') as string | null)?.trim() || null
  const website_url   = (formData.get('website_url') as string | null)?.trim() || null
  const business_goal = (formData.get('business_goal') as string | null)?.trim() || null
  const street        = (formData.get('street') as string | null)?.trim() || null
  const city          = (formData.get('city') as string | null)?.trim() || null
  const state         = (formData.get('state') as string | null)?.trim() || null
  const zip           = (formData.get('zip') as string | null)?.trim() || null
  const country       = (formData.get('country') as string | null)?.trim() || null
  const visibility    = ((formData.get('visibility') as string | null) || 'everyone') as SageContactVisibility
  const notes         = (formData.get('notes') as string | null)?.trim() || null
  const tagsRaw       = (formData.get('tags') as string | null)?.trim() || ''
  const tags          = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const source        = ((formData.get('source') as string | null)?.trim() || 'manual')
  const valueRaw      = (formData.get('value') as string | null)?.trim()
  const value         = valueRaw ? parseFloat(valueRaw) : null

  const { data, error } = await admin
    .from('sage_contacts')
    .update({ name, email, phone, title, contact_type, company_name, website_url, business_goal, street, city, state, zip, country, visibility, notes, tags, source, value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'contact', id, 'contact_updated', { name })
  revalidatePath('/sage/contacts')
  revalidatePath(`/sage/contacts/${id}`)
  return data as SageContact
}

export async function deleteContact(id: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_contacts')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  revalidatePath('/sage/contacts')
}

// ---------------------------------------------------------------
// Pipelines
// ---------------------------------------------------------------

const PIPELINE_TEMPLATES: Record<string, { name: string; stages: Array<{ name: string; color: string }> }> = {
  sales: {
    name: 'Sales Pipeline',
    stages: [
      { name: 'New Lead',       color: '#6b7280' },
      { name: 'Contacted',      color: '#3b82f6' },
      { name: 'Qualified',      color: '#8b5cf6' },
      { name: 'Proposal Sent',  color: '#f59e0b' },
      { name: 'Negotiation',    color: '#ec732e' },
      { name: 'Won',            color: '#10b981' },
      { name: 'Lost',           color: '#ef4444' },
    ],
  },
  agency: {
    name: 'Agency Lead Gen',
    stages: [
      { name: 'Inquiry',        color: '#6b7280' },
      { name: 'Qualified',      color: '#3b82f6' },
      { name: 'Proposal',       color: '#8b5cf6' },
      { name: 'Contract',       color: '#f59e0b' },
      { name: 'Onboarding',     color: '#10b981' },
      { name: 'Active Client',  color: '#61c2ad' },
    ],
  },
  consulting: {
    name: 'Consulting Sales',
    stages: [
      { name: 'Discovery',      color: '#6b7280' },
      { name: 'Proposal',       color: '#3b82f6' },
      { name: 'Scoping',        color: '#8b5cf6' },
      { name: 'Approved',       color: '#f59e0b' },
      { name: 'In Progress',    color: '#61c2ad' },
      { name: 'Completed',      color: '#10b981' },
    ],
  },
  support: {
    name: 'Customer Support',
    stages: [
      { name: 'Open',           color: '#ef4444' },
      { name: 'In Progress',    color: '#f59e0b' },
      { name: 'Pending',        color: '#3b82f6' },
      { name: 'Resolved',       color: '#10b981' },
    ],
  },
  onboarding: {
    name: 'Onboarding',
    stages: [
      { name: 'Welcome',        color: '#6b7280' },
      { name: 'Setup',          color: '#3b82f6' },
      { name: 'Training',       color: '#8b5cf6' },
      { name: 'Go-Live',        color: '#61c2ad' },
      { name: 'Review',         color: '#10b981' },
    ],
  },
}

export async function createPipeline(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const templateKey     = (formData.get('template') as string | null) || 'custom'
  const customName      = (formData.get('name') as string | null)?.trim()
  const customStagesRaw = formData.get('custom_stages') as string | null
  const template        = PIPELINE_TEMPLATES[templateKey]

  const name         = customName || template?.name || 'New Pipeline'
  const templateType = templateKey === 'custom' ? null : templateKey

  const { data: pipeline, error } = await admin
    .from('sage_pipelines')
    .insert({ workspace_id: workspaceId, name, template_type: templateType, is_default: false })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const pipelineId = (pipeline as { id: string }).id

  // Use custom stages from step 3 of modal if provided; fall back to template defaults
  const fallbackColors = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec732e', '#10b981', '#ef4444', '#61c2ad']
  const templateStages = template?.stages ?? [
    { name: 'To Do', color: '#6b7280' },
    { name: 'In Progress', color: '#3b82f6' },
    { name: 'Done', color: '#10b981' },
  ]
  const templateColorMap = Object.fromEntries(templateStages.map(s => [s.name, s.color]))

  let stageEntries: Array<{ name: string; color: string }>
  if (customStagesRaw) {
    const stageNames = (JSON.parse(customStagesRaw) as string[]).filter(s => s.trim())
    stageEntries = stageNames.map((n, i) => ({
      name:  n,
      color: templateColorMap[n] ?? fallbackColors[i % fallbackColors.length],
    }))
  } else {
    stageEntries = templateStages
  }

  await admin.from('sage_pipeline_stages').insert(
    stageEntries.map((s, i) => ({
      pipeline_id: pipelineId,
      name:        s.name,
      position:    i,
      color:       s.color,
    }))
  )

  revalidatePath('/sage/pipelines')
  redirect(`/sage/pipelines/${pipelineId}`)
}

export async function updatePipelineStages(pipelineId: string, stageNames: string[]) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Verify ownership
  const { data: pipeline } = await admin
    .from('sage_pipelines')
    .select('id')
    .eq('id', pipelineId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!pipeline) throw new Error('Pipeline not found')

  // Preserve existing colors for unchanged stage names
  const { data: existingStages } = await admin
    .from('sage_pipeline_stages')
    .select('name, color')
    .eq('pipeline_id', pipelineId)
  const colorMap = Object.fromEntries((existingStages ?? []).map(s => [s.name, s.color]))
  const fallbackColors = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec732e', '#10b981', '#ef4444', '#61c2ad']

  await admin.from('sage_pipeline_stages').delete().eq('pipeline_id', pipelineId)

  const filtered = stageNames.filter(s => s.trim())
  if (filtered.length > 0) {
    await admin.from('sage_pipeline_stages').insert(
      filtered.map((stageName, i) => ({
        pipeline_id: pipelineId,
        name:        stageName,
        position:    i,
        color:       colorMap[stageName] ?? fallbackColors[i % fallbackColors.length],
      }))
    )
  }

  revalidatePath('/sage/pipelines')
  revalidatePath(`/sage/pipelines/${pipelineId}`)
}

export async function deletePipeline(id: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_pipelines')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  revalidatePath('/sage/pipelines')
}

// ---------------------------------------------------------------
// Deals
// ---------------------------------------------------------------

export async function createDeal(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const title         = (formData.get('title') as string).trim()
  const pipelineId    = (formData.get('pipeline_id') as string | null) || null
  const stageId       = (formData.get('stage_id') as string | null) || null
  const contactName   = (formData.get('contact_name') as string | null)?.trim() || null

  // Resolve contact: match existing by name (case-insensitive), or auto-create new
  let contactId: string | null = null
  if (contactName) {
    const { data: existing } = await admin
      .from('sage_contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', contactName)
      .limit(1)
      .maybeSingle()
    if (existing) {
      contactId = (existing as { id: string }).id
    } else {
      const { data: created } = await admin
        .from('sage_contacts')
        .insert({ workspace_id: workspaceId, name: contactName, source: 'manual', contact_type: 'potential_customer', visibility: 'everyone' })
        .select('id')
        .single()
      if (created) contactId = (created as { id: string }).id
    }
  }
  const valueRaw      = (formData.get('value') as string | null)?.trim()
  const value         = valueRaw ? parseFloat(valueRaw) : null
  const currency      = (formData.get('currency') as string | null) || 'USD'
  const status        = ((formData.get('status') as string | null) || 'open') as SageDealStatus
  const closeDate     = (formData.get('close_date') as string | null)?.trim() || null
  const source        = (formData.get('source') as string | null)?.trim() || null
  const priority      = (formData.get('priority') as string | null)?.trim() || null
  const winPctRaw     = (formData.get('win_percentage') as string | null)?.trim()
  const winPercentage = winPctRaw ? parseInt(winPctRaw, 10) : null
  const visibility    = (formData.get('visibility') as string | null) || 'everyone'
  const description   = (formData.get('description') as string | null)?.trim() || null
  const companyName   = (formData.get('company_name') as string | null)?.trim() || null
  const tagsRaw       = (formData.get('tags') as string | null)?.trim() || ''
  const tags          = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

  const { data, error } = await admin
    .from('sage_deals')
    .insert({
      workspace_id:   workspaceId,
      title,
      pipeline_id:    pipelineId,
      stage_id:       stageId,
      contact_id:     contactId,
      value,
      currency,
      status,
      close_date:     closeDate,
      source,
      priority:       priority || null,
      win_percentage: winPercentage,
      visibility,
      description,
      company_name:   companyName,
      tags,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const dealId = (data as { id: string }).id
  await logActivity(workspaceId, 'deal', dealId, 'deal_created', { title, value })

  revalidatePath('/sage/pipelines')
  if (pipelineId) revalidatePath(`/sage/pipelines/${pipelineId}`)
}

export async function moveDeal(dealId: string, stageId: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_deals')
    .update({ stage_id: stageId, updated_at: new Date().toISOString() })
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'deal', dealId, 'stage_changed', { stage_id: stageId })
  revalidatePath('/sage/pipelines')
}

export async function updateDeal(dealId: string, formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const title       = (formData.get('title') as string).trim()
  const valueRaw    = (formData.get('value') as string | null)?.trim()
  const value       = valueRaw ? parseFloat(valueRaw) : null
  const currency    = (formData.get('currency') as string | null) || 'USD'
  const closeDate   = (formData.get('close_date') as string | null)?.trim() || null
  const priority    = (formData.get('priority') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null

  const { error } = await admin
    .from('sage_deals')
    .update({ title, value, currency, close_date: closeDate, priority: priority || null, description, updated_at: new Date().toISOString() })
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath('/sage/pipelines')
}

export async function updateDealStatus(
  dealId:     string,
  status:     SageDealStatus,
  lostReason?: string,
  wonAt?:      string,
  lostAt?:     string,
) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'won') {
    patch.won_at    = wonAt ?? new Date().toISOString()
    patch.lost_at   = null
    patch.lost_reason = null
  } else if (status === 'lost') {
    patch.lost_at   = lostAt ?? new Date().toISOString()
    patch.lost_reason = lostReason ?? null
    patch.won_at    = null
  }

  const { error } = await admin
    .from('sage_deals')
    .update(patch)
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'deal', dealId, 'status_changed', { status, lost_reason: lostReason })
  revalidatePath('/sage/pipelines')
}

export async function getContactDetail(contactId: string): Promise<SageContact | null> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_contacts')
    .select('*')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .single()
  return (data ?? null) as SageContact | null
}

export async function getDealDetail(dealId: string): Promise<{
  deal: (Record<string, unknown> & { contact: Record<string, unknown> | null }) | null
  activities: SageDealActivity[]
  error?: string
}> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { data: deal, error: dealErr } = await admin
    .from('sage_deals')
    .select('*, contact:sage_contacts(id, name, email, phone, company_name, title, website_url, business_goal, street, city, state, zip, country, contact_type, source, tags, notes, created_at), stage:sage_pipeline_stages(id, name, color)')
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
    .single()

  if (dealErr || !deal) return { deal: null, activities: [], error: dealErr?.message }

  const { data: activities } = await admin
    .from('sage_deal_activities')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })

  return {
    deal:       deal as Record<string, unknown> & { contact: Record<string, unknown> | null },
    activities: (activities ?? []) as SageDealActivity[],
  }
}

export async function addDealActivity(
  dealId: string,
  type:   'note' | 'call' | 'meeting' | 'task',
  title?: string,
  body?:  string,
  dueAt?: string,
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await admin
    .from('sage_deal_activities')
    .insert({
      workspace_id: workspaceId,
      deal_id:      dealId,
      type,
      title:        title?.trim() || null,
      body:         body?.trim()  || null,
      due_at:       dueAt         || null,
      created_by:   user?.id      ?? null,
    })

  if (error) return { error: error.message }
  await logActivity(workspaceId, 'deal', dealId, `${type}_added`, { title, body })
  revalidatePath('/sage/pipelines')
  return {}
}

export async function completeDealTask(activityId: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_deal_activities')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', activityId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }
  revalidatePath('/sage/pipelines')
  return {}
}

// ---------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------

export async function createTicket(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const title          = (formData.get('title') as string).trim()
  const name           = (formData.get('name') as string | null)?.trim() || null
  const email          = (formData.get('email') as string | null)?.trim() || null
  const phone          = (formData.get('phone') as string | null)?.trim() || null
  const occurred_at    = (formData.get('occurred_at') as string | null) || null
  const description    = (formData.get('description') as string | null)?.trim() || null
  const priority       = (formData.get('priority') as SageTicketPriority | null) || 'medium'
  const contactId      = (formData.get('contact_id') as string | null) || null
  const dealId         = (formData.get('deal_id') as string | null) || null
  const contact_method = (formData.get('contact_method') as 'email' | 'phone' | null) || null
  const related_url    = (formData.get('related_url') as string | null)?.trim() || null

  const { data, error } = await admin
    .from('sage_tickets')
    .insert({ workspace_id: workspaceId, title, name, email, phone, occurred_at, description, priority, contact_id: contactId, deal_id: dealId, contact_method, related_url, status: 'open' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const ticketId = (data as { id: string }).id
  await logActivity(workspaceId, 'ticket', ticketId, 'ticket_created', { title, priority })

  revalidatePath('/sage/tickets')
}

export async function updateTicketStatus(id: string, status: SageTicketStatus) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'ticket', id, 'status_changed', { status })
  revalidatePath('/sage/tickets')
  revalidatePath('/dashboard/tickets')
  revalidatePath('/dashboard')
}

export async function deleteTicket(id: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_tickets')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  revalidatePath('/sage/tickets')
}

// ---------------------------------------------------------------
// Sage Integrations
// ---------------------------------------------------------------

export async function saveSageIntegration(provider: string, config: Record<string, string>) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_integrations')
    .upsert(
      { workspace_id: workspaceId, provider, config, status: 'connected', updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id,provider' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/sage/integrations')
}

export async function disconnectSageIntegration(provider: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_integrations')
    .update({ status: 'disconnected', config: {}, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)

  if (error) throw new Error(error.message)
  revalidatePath('/sage/integrations')
}

// ---------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------

export async function addDealReminder(
  dealId: string,
  title:  string,
  note:   string | null,
  dueAt:  string,  // ISO datetime string
): Promise<{ id?: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sage_reminders')
    .insert({ workspace_id: workspaceId, deal_id: dealId, title: title.trim(), note: note?.trim() || null, due_at: dueAt })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/sage/pipelines')
  return { id: data.id }
}

export async function getDealReminders(dealId: string): Promise<{ id: string; title: string; note: string | null; due_at: string }[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_reminders')
    .select('id, title, note, due_at')
    .eq('workspace_id', workspaceId)
    .eq('deal_id', dealId)
    .eq('is_sent', false)
    .order('due_at', { ascending: true })
  return (data ?? []) as { id: string; title: string; note: string | null; due_at: string }[]
}

export async function getUpcomingReminders(): Promise<{ id: string; title: string; note: string | null; due_at: string; deal_id: string | null }[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const now       = new Date()
  const lookahead = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2-hour lookahead window
  const { data } = await admin
    .from('sage_reminders')
    .select('id, title, note, due_at, deal_id')
    .eq('workspace_id', workspaceId)
    .eq('is_sent', false)
    .gte('due_at', now.toISOString())
    .lte('due_at', lookahead.toISOString())
    .order('due_at', { ascending: true })
  return (data ?? []) as { id: string; title: string; note: string | null; due_at: string; deal_id: string | null }[]
}

export async function markReminderSent(reminderId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  await admin
    .from('sage_reminders')
    .update({ is_sent: true, sent_at: new Date().toISOString() })
    .eq('id', reminderId)
    .eq('workspace_id', workspaceId)
}


export async function deleteDeal(dealId: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_deals')
    .delete()
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/sage/pipelines')
  return {}
}
