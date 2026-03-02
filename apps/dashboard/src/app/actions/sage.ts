'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SageContact, SageTicketStatus, SageTicketPriority, SageDealStatus, SageContactType, SageContactVisibility } from '@/lib/types'

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

  const { data, error } = await admin
    .from('sage_contacts')
    .insert({ workspace_id: workspaceId, name, email, phone, title, contact_type, company_name, website_url, business_goal, street, city, state, zip, country, visibility, notes, tags, source: 'manual' })
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

  const { error } = await admin
    .from('sage_contacts')
    .update({ name, email, phone, title, contact_type, company_name, website_url, business_goal, street, city, state, zip, country, visibility, notes, tags, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'contact', id, 'contact_updated', { name })
  revalidatePath('/sage/contacts')
  revalidatePath(`/sage/contacts/${id}`)
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

  const templateKey = (formData.get('template') as string | null) || 'custom'
  const customName  = (formData.get('name') as string | null)?.trim()
  const template    = PIPELINE_TEMPLATES[templateKey]

  const name         = customName || template?.name || 'New Pipeline'
  const templateType = templateKey === 'custom' ? null : templateKey

  const { data: pipeline, error } = await admin
    .from('sage_pipelines')
    .insert({ workspace_id: workspaceId, name, template_type: templateType, is_default: false })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const pipelineId = (pipeline as { id: string }).id

  // Create default stages
  const stages = template?.stages ?? [
    { name: 'To Do', color: '#6b7280' },
    { name: 'In Progress', color: '#3b82f6' },
    { name: 'Done', color: '#10b981' },
  ]

  await admin.from('sage_pipeline_stages').insert(
    stages.map((s, i) => ({
      pipeline_id: pipelineId,
      name:        s.name,
      position:    i,
      color:       s.color,
    }))
  )

  revalidatePath('/sage/pipelines')
  redirect(`/sage/pipelines/${pipelineId}`)
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

  const title      = (formData.get('title') as string).trim()
  const pipelineId = (formData.get('pipeline_id') as string | null) || null
  const stageId    = (formData.get('stage_id') as string | null) || null
  const contactId  = (formData.get('contact_id') as string | null) || null
  const valueRaw   = (formData.get('value') as string | null)?.trim()
  const value      = valueRaw ? parseFloat(valueRaw) : null
  const currency   = (formData.get('currency') as string | null) || 'USD'

  const { data, error } = await admin
    .from('sage_deals')
    .insert({ workspace_id: workspaceId, title, pipeline_id: pipelineId, stage_id: stageId, contact_id: contactId, value, currency, status: 'open' })
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

export async function updateDealStatus(dealId: string, status: SageDealStatus) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_deals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'deal', dealId, 'status_changed', { status })
  revalidatePath('/sage/pipelines')
}

// ---------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------

export async function createTicket(formData: FormData) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const title          = (formData.get('title') as string).trim()
  const description    = (formData.get('description') as string | null)?.trim() || null
  const priority       = (formData.get('priority') as SageTicketPriority | null) || 'medium'
  const contactId      = (formData.get('contact_id') as string | null) || null
  const dealId         = (formData.get('deal_id') as string | null) || null
  const contact_method = (formData.get('contact_method') as 'email' | 'phone' | null) || null
  const related_url    = (formData.get('related_url') as string | null)?.trim() || null

  const { data, error } = await admin
    .from('sage_tickets')
    .insert({ workspace_id: workspaceId, title, description, priority, contact_id: contactId, deal_id: dealId, contact_method, related_url, status: 'open' })
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
