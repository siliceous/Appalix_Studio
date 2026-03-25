'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SageContact, SageTicketStatus, SageTicketPriority, SageDealStatus, SageContactType, SageContactVisibility, SageDealActivity } from '@/lib/types'
import { syncContactOutbound } from '@/lib/server/marketing-sync'
import Anthropic from '@anthropic-ai/sdk'
import { upsertEntityEmbedding, buildContactEmbedContent, buildDealEmbedContent } from '@/lib/sage-intelligence/embeddings'
import { generateRecordSummary } from '@/lib/sage-intelligence/record-summary'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  const assigned_to   = (formData.get('assigned_to') as string | null)?.trim() || null

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
    .insert({ workspace_id: workspaceId, name, email, phone, title, contact_type, company_name, website_url, business_goal, street, city, state, zip, country, visibility, notes, tags, source, value, assigned_to })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const contact = data as SageContact
  await logActivity(workspaceId, 'contact', contact.id, 'contact_created', { name })
  void syncContactOutbound(workspaceId, { email: contact.email, name: contact.name, phone: contact.phone, company: contact.company_name })
  // Fire-and-forget: generate embedding + summary (never blocks or throws to caller)
  void upsertEntityEmbedding(workspaceId, 'contact', contact.id, buildContactEmbedContent(contact)).catch(() => {})
  void generateRecordSummary(workspaceId, 'contact', contact.id).catch(() => {})
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
  const assigned_to   = (formData.get('assigned_to') as string | null)?.trim() || null

  const { data, error } = await admin
    .from('sage_contacts')
    .update({ name, email, phone, title, contact_type, company_name, website_url, business_goal, street, city, state, zip, country, visibility, notes, tags, source, value, assigned_to, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'contact', id, 'contact_updated', { name })
  void syncContactOutbound(workspaceId, { email: (data as SageContact).email, name: (data as SageContact).name, phone: (data as SageContact).phone, company: (data as SageContact).company_name })
  void upsertEntityEmbedding(workspaceId, 'contact', id, buildContactEmbedContent(data as SageContact)).catch(() => {})
  void generateRecordSummary(workspaceId, 'contact', id).catch(() => {})
  revalidatePath('/sage/contacts')
  revalidatePath(`/sage/contacts/${id}`)
  return data as SageContact
}

export async function deleteContact(id: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Check if this contact is linked to a Mailchimp sync
  const { data: contact } = await admin
    .from('sage_contacts')
    .select('mailchimp_member_id, source, name')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  const isMailchimpContact = contact?.mailchimp_member_id || contact?.source === 'mailchimp'

  if (isMailchimpContact) {
    // Soft delete — 5-min grace period before propagating to Mailchimp
    const { error } = await admin
      .from('sage_contacts')
      .update({ sync_deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await admin
      .from('sage_contacts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
    if (error) throw new Error(error.message)
  }

  await logActivity(workspaceId, 'contact', id, 'contact_deleted', { name: (contact as { name?: string } | null)?.name ?? null, source: 'manual' })
  revalidatePath('/sage/contacts')
  return { softDeleted: !!isMailchimpContact, id }
}

export async function undoDeleteContact(id: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_contacts')
    .update({ sync_deleted_at: null })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  if (error) throw new Error(error.message)
  revalidatePath('/sage/contacts')
}

export async function deleteContacts(ids: string[]) {
  if (!ids.length) return
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Separate Mailchimp-linked contacts from plain ones
  const { data: contacts } = await admin
    .from('sage_contacts')
    .select('id, name, mailchimp_member_id, source')
    .in('id', ids)
    .eq('workspace_id', workspaceId)

  const mailchimpIds = (contacts ?? [])
    .filter((c: { mailchimp_member_id: string | null; source: string }) => c.mailchimp_member_id || c.source === 'mailchimp')
    .map((c: { id: string }) => c.id)
  const hardDeleteIds = ids.filter(id => !mailchimpIds.includes(id))

  if (mailchimpIds.length) {
    await admin
      .from('sage_contacts')
      .update({ sync_deleted_at: new Date().toISOString() })
      .in('id', mailchimpIds)
      .eq('workspace_id', workspaceId)
  }
  if (hardDeleteIds.length) {
    await admin
      .from('sage_contacts')
      .delete()
      .in('id', hardDeleteIds)
      .eq('workspace_id', workspaceId)
  }

  const names = (contacts ?? []).map((c: { name?: string }) => c.name).filter(Boolean)
  await logActivity(workspaceId, 'contact', ids[0], 'contact_deleted', { names, count: ids.length, source: 'manual' })
  revalidatePath('/sage/contacts')
  return { softDeleted: mailchimpIds, hardDeleted: hardDeleteIds }
}

export async function analyzeContact(id: string): Promise<{ summary: string } | { error: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { data: raw } = await admin
    .from('sage_contacts')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!raw) return { error: 'Contact not found' }
  const c = raw as SageContact

  const lines = [
    `Name: ${c.name}`,
    c.email        ? `Email: ${c.email}`               : null,
    c.phone        ? `Phone: ${c.phone}`               : null,
    c.company_name ? `Company: ${c.company_name}`      : null,
    c.title        ? `Job Title: ${c.title}`           : null,
    c.website_url  ? `Website: ${c.website_url}`       : null,
    c.contact_type ? `Type: ${c.contact_type}`         : null,
    c.source       ? `Source: ${c.source}`             : null,
    c.city || c.country ? `Location: ${[c.city, c.country].filter(Boolean).join(', ')}` : null,
    c.tags.length  ? `Tags: ${c.tags.join(', ')}`      : null,
    c.notes        ? `Notes: ${c.notes}`               : null,
    c.business_goal ? `Business Goal: ${c.business_goal}` : null,
  ].filter(Boolean).join('\n')

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{
        role:    'user',
        content: `You are a CRM analyst. Based on the contact details below, write a brief 3–5 sentence AI analysis covering:
1. Who this person is and what they likely want
2. How they were acquired (source)
3. Recommended next action for the sales team

Contact details:
${lines}

Be concise and actionable. No headings, no bullet points — just a short paragraph.`,
      }],
    })

    const summary = (response.content[0] as { type: string; text: string }).text?.trim() ?? ''

    await admin.from('sage_contacts').update({
      ai_summary:     summary,
      ai_analyzed_at: new Date().toISOString(),
    }).eq('id', id).eq('workspace_id', workspaceId)

    revalidatePath(`/sage/contacts/${id}`)
    return { summary }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI analysis failed' }
  }
}

export async function assignContact(
  contactId: string,
  userId: string | null,
): Promise<{ error?: string; success?: boolean }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_contacts')
    .update({ assigned_to: userId, updated_at: new Date().toISOString() })
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  // Cascade assignment to all open deals for this contact
  await admin
    .from('sage_deals')
    .update({ owner_id: userId, updated_at: new Date().toISOString() })
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)

  await logActivity(workspaceId, 'contact', contactId, 'contact_assigned', { assigned_to: userId })
  revalidatePath('/sage/contacts')
  revalidatePath('/sage/pipelines')
  return { success: true }
}

export async function assignTicket(
  ticketId: string,
  userId: string | null,
): Promise<{ error?: string; success?: boolean }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_tickets')
    .update({ owner_id: userId, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/sage/tickets')
  return { success: true }
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
      { name: 'Active Client',  color: '#15A4AE' },
    ],
  },
  consulting: {
    name: 'Consulting Sales',
    stages: [
      { name: 'Discovery',      color: '#6b7280' },
      { name: 'Proposal',       color: '#3b82f6' },
      { name: 'Scoping',        color: '#8b5cf6' },
      { name: 'Approved',       color: '#f59e0b' },
      { name: 'In Progress',    color: '#15A4AE' },
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
      { name: 'Go-Live',        color: '#15A4AE' },
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
  const fallbackColors = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec732e', '#10b981', '#ef4444', '#15A4AE']
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
  const fallbackColors = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec732e', '#10b981', '#ef4444', '#15A4AE']

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
  const supabase = await createClient()
  const { data: { user: dealUser } } = await supabase.auth.getUser()
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
      owner_id:       dealUser?.id ?? null,
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
  void upsertEntityEmbedding(workspaceId, 'deal', dealId, buildDealEmbedContent({ title, value, currency, status, company_name: companyName, priority })).catch(() => {})
  void generateRecordSummary(workspaceId, 'deal', dealId).catch(() => {})

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const title          = (formData.get('title') as string).trim()
  const name           = (formData.get('name') as string | null)?.trim() || null
  const email          = (formData.get('email') as string | null)?.trim() || null
  const phone          = (formData.get('phone') as string | null)?.trim() || null
  const occurred_at    = new Date().toISOString()
  const description    = (formData.get('description') as string | null)?.trim() || null
  const priority       = (formData.get('priority') as SageTicketPriority | null) || 'medium'
  const contactId      = (formData.get('contact_id') as string | null) || null
  const dealId         = (formData.get('deal_id') as string | null) || null
  const contact_method = (formData.get('contact_method') as 'email' | 'phone' | null) || null
  const related_url    = (formData.get('related_url') as string | null)?.trim() || null

  const { data, error } = await admin
    .from('sage_tickets')
    .insert({ workspace_id: workspaceId, title, name, email, phone, occurred_at, description, priority, contact_id: contactId, deal_id: dealId, contact_method, related_url, status: 'open', owner_id: user?.id ?? null })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const ticketId = (data as { id: string }).id
  await logActivity(workspaceId, 'ticket', ticketId, 'ticket_created', { title, priority })
  void upsertEntityEmbedding(workspaceId, 'ticket', ticketId,
    [title, description ? `Description: ${description}` : '', priority ? `Priority: ${priority}` : ''].filter(Boolean).join('\n')
  ).catch(() => {})
  void generateRecordSummary(workspaceId, 'ticket', ticketId).catch(() => {})

  revalidatePath('/sage/tickets')
}

export async function updateTicketContactInfo(
  id: string,
  fields: { name?: string | null; email?: string | null; phone?: string | null; occurred_at?: string | null },
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_tickets')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/sage/tickets')
  return {}
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

export async function updateTicketPriority(id: string, priority: SageTicketPriority) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { data: ticketRow } = await admin
    .from('sage_tickets')
    .select('title, priority')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()
  const ticketTitle   = (ticketRow as { title?: string | null; priority?: string | null } | null)?.title ?? null
  const oldPriority   = (ticketRow as { title?: string | null; priority?: string | null } | null)?.priority ?? null

  const { error } = await admin
    .from('sage_tickets')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  await logActivity(workspaceId, 'ticket', id, 'priority_changed', { from: oldPriority, to: priority, name: ticketTitle })
  revalidatePath('/sage/tickets')
  revalidatePath('/dashboard/tickets')
}

export async function updateTicketDetails(
  id: string,
  fields: { title?: string; description?: string | null },
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_tickets')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/sage/tickets')
  revalidatePath('/dashboard/tickets')
  return {}
}

export async function mergeTickets(primaryId: string, duplicateIds: string[]): Promise<{ error?: string }> {
  if (duplicateIds.length === 0) return {}
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Fetch duplicate tickets to fold their content into the primary
  const { data: dupes } = await admin
    .from('sage_tickets')
    .select('id, title, description')
    .in('id', duplicateIds)
    .eq('workspace_id', workspaceId)

  const { data: primary } = await admin
    .from('sage_tickets')
    .select('description')
    .eq('id', primaryId)
    .eq('workspace_id', workspaceId)
    .single()

  const appendedNotes = (dupes ?? [])
    .map(d => `[Merged] ${d.title}${d.description ? '\n' + d.description : ''}`)
    .join('\n\n')
  const newDescription = [primary?.description, appendedNotes].filter(Boolean).join('\n\n---\n\n')

  const { error: updateErr } = await admin
    .from('sage_tickets')
    .update({ description: newDescription, updated_at: new Date().toISOString() })
    .eq('id', primaryId)
    .eq('workspace_id', workspaceId)
  if (updateErr) return { error: updateErr.message }

  const { error: closeErr } = await admin
    .from('sage_tickets')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .in('id', duplicateIds)
    .eq('workspace_id', workspaceId)
  if (closeErr) return { error: closeErr.message }

  revalidatePath('/sage/tickets')
  revalidatePath('/dashboard/tickets')
  return {}
}

export async function deleteTicket(id: string) {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Fetch contact email before deleting so we can reset source records
  const { data: ticketRow } = await admin
    .from('sage_tickets')
    .select('contact_id, title, name')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()
  const contactId   = (ticketRow as { contact_id: string | null; title?: string; name?: string | null } | null)?.contact_id
  const ticketTitle = (ticketRow as { title?: string } | null)?.title ?? null
  const ticketName  = (ticketRow as { name?: string | null } | null)?.name ?? null

  const { error } = await admin
    .from('sage_tickets')
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)
  await logActivity(workspaceId, 'ticket', id, 'ticket_deleted', { title: ticketTitle, name: ticketName, source: 'ticket' })

  // Reset action_type on form submissions that were actioned as tickets
  if (contactId) {
    const { data: contact } = await admin
      .from('sage_contacts')
      .select('email')
      .eq('id', contactId)
      .single()
    const email = (contact as { email: string | null } | null)?.email
    if (email) {
      try {
        await admin.from('sage_form_submissions')
          .update({ action_type: null, actioned_at: null })
          .eq('workspace_id', workspaceId)
          .eq('action_type', 'ticket')
          .or(`fields->>email.ilike.${email},ai_entities->>email.ilike.${email}`)
      } catch { /* non-critical */ }
    }
  }

  revalidatePath('/sage/tickets')
  revalidatePath('/dashboard/forms')
  revalidatePath('/dashboard/bots')
}

export async function deleteTickets(ids: string[]) {
  if (!ids.length) return
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Fetch ticket titles + contact IDs before deleting
  const { data: ticketRows } = await admin
    .from('sage_tickets')
    .select('contact_id, title')
    .in('id', ids)
    .eq('workspace_id', workspaceId)
  const contactIds = [...new Set((ticketRows ?? []).map((r: { contact_id: string | null }) => r.contact_id).filter(Boolean))] as string[]
  const ticketTitles = (ticketRows ?? []).map((r: { title?: string }) => r.title).filter(Boolean)

  const { error } = await admin
    .from('sage_tickets')
    .update({ deleted_at: new Date().toISOString() } as never)
    .in('id', ids)
    .eq('workspace_id', workspaceId)
  if (error) throw new Error(error.message)
  await logActivity(workspaceId, 'ticket', ids[0], 'ticket_deleted', { titles: ticketTitles, count: ids.length, source: 'ticket' })

  if (contactIds.length > 0) {
    const { data: contacts } = await admin
      .from('sage_contacts')
      .select('email')
      .in('id', contactIds)
    const emails = (contacts ?? []).map((c: { email: string | null }) => c.email).filter(Boolean) as string[]
    for (const email of emails) {
      try {
        await admin.from('sage_form_submissions')
          .update({ action_type: null, actioned_at: null })
          .eq('workspace_id', workspaceId)
          .eq('action_type', 'ticket')
          .or(`fields->>email.ilike.${email},ai_entities->>email.ilike.${email}`)
      } catch { /* non-critical */ }
    }
  }

  revalidatePath('/sage/tickets')
  revalidatePath('/dashboard/forms')
  revalidatePath('/dashboard/bots')
}

export async function renameTicket(id: string, title: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_tickets')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tickets')
  revalidatePath('/sage/tickets')
  return {}
}

export async function addContactFromTicket(
  ticketId: string,
  contact: { name: string | null; email: string | null; phone: string | null },
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  if (!contact.name && !contact.email && !contact.phone) return { error: 'No contact info on this ticket' }

  // Check for existing contact by email or phone
  let existing: { id: string } | null = null
  if (contact.email) {
    const { data } = await admin.from('sage_contacts').select('id').eq('workspace_id', workspaceId).ilike('email', contact.email).limit(1).maybeSingle()
    existing = data as { id: string } | null
  }
  if (!existing && contact.phone) {
    const { data } = await admin.from('sage_contacts').select('id').eq('workspace_id', workspaceId).ilike('phone', contact.phone).limit(1).maybeSingle()
    existing = data as { id: string } | null
  }

  if (existing) {
    // Link ticket to existing contact
    await admin.from('sage_tickets').update({ contact_id: existing.id }).eq('id', ticketId).eq('workspace_id', workspaceId)
    revalidatePath('/dashboard/tickets')
    return {}
  }

  // Create new contact
  const { data: newContact, error } = await admin.from('sage_contacts').insert({
    workspace_id:  workspaceId,
    name:          contact.name ?? contact.email ?? 'Unknown',
    email:         contact.email,
    phone:         contact.phone,
    source:        'ticket',
    contact_type:  'potential_customer',
  }).select('id').single()
  if (error) return { error: error.message }

  // Link ticket to new contact
  await admin.from('sage_tickets').update({ contact_id: (newContact as { id: string }).id }).eq('id', ticketId).eq('workspace_id', workspaceId)
  revalidatePath('/dashboard/tickets')
  revalidatePath('/sage/contacts')
  return {}
}

// ---------------------------------------------------------------
// Sage Integrations
// ---------------------------------------------------------------

export async function saveSageIntegration(provider: string, config: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_integrations')
    .upsert(
      { workspace_id: workspaceId, user_id: user.id, provider, config, status: 'connected', updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id,user_id,provider' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/sage/integrations')
}

/**
 * Insert a test submission directly into the DB for a form integration.
 * Bypasses the HTTP webhook layer — no network self-call needed.
 */
export async function sendTestFormWebhook(
  provider: 'gravity_forms' | 'wpforms' | 'typeform' | 'fluent_forms',
): Promise<{ ok?: boolean; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const { data: integ } = await a
    .from('sage_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .eq('status', 'connected')
    .maybeSingle()

  if (!integ) return { error: 'Integration not connected' }

  // Resolve created_by — use workspace owner
  const { data: ownerRow } = await a
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  const createdBy: string | null = ownerRow?.user_id ?? null

  const FORM_TITLE: Record<string, string> = {
    gravity_forms: 'Test Form (Gravity Forms)',
    wpforms:       'Test Form (WPForms)',
    typeform:      'Test Form (Typeform)',
    fluent_forms:  'Test Form (Fluent Forms)',
  }
  const TEST_FIELDS: Record<string, Record<string, string>> = {
    gravity_forms: { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555-0100', company: 'Acme Corp', message: 'Interested in your product' },
    wpforms:       { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555-0100', company: 'Acme Corp', message: 'Interested in your product' },
    typeform:      { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555-0100', company: 'Acme Corp', message: 'Interested in your product' },
    fluent_forms:  { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555-0100', company: 'Acme Corp', message: 'Interested in your product' },
  }

  const formTitle = FORM_TITLE[provider]
  const fields    = TEST_FIELDS[provider]

  // Find or create the sage_form
  let { data: form } = await a
    .from('sage_forms')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('name', formTitle)
    .maybeSingle()

  if (!form) {
    const { data: newForm, error: formErr } = await a
      .from('sage_forms')
      .insert({ workspace_id: workspaceId, name: formTitle, is_active: true, created_by: createdBy })
      .select('id')
      .single()
    if (formErr) return { error: `Could not create form: ${formErr.message}` }
    form = newForm
  }

  if (!form?.id) return { error: 'Could not resolve form id' }

  const { error: subErr } = await a
    .from('sage_form_submissions')
    .insert({ workspace_id: workspaceId, form_id: form.id, source_platform: provider, fields })

  if (subErr) return { error: `Could not insert submission: ${subErr.message}` }

  revalidatePath('/dashboard/forms')
  return { ok: true }
}

/**
 * Connect a form integration provider (gravity_forms, wpforms, typeform).
 * Saves config and — for Typeform — auto-registers the webhook via the Typeform API.
 * Returns { webhookUrl } so the client can display it for manual webhook setup (GF / WPForms).
 */
export async function connectFormIntegration(
  provider: 'gravity_forms' | 'wpforms' | 'typeform' | 'fluent_forms',
  config: Record<string, string>,
): Promise<{ webhookUrl?: string; formsRegistered?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Save / upsert the integration record
  const { error: saveError } = await admin
    .from('sage_integrations')
    .upsert(
      { workspace_id: workspaceId, user_id: user.id, provider, config, status: 'connected', updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id,user_id,provider' },
    )
  if (saveError) return { error: saveError.message }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.appalix.ai'
  const SLUG: Record<string, string> = { gravity_forms: 'gravity-forms', fluent_forms: 'fluent-forms' }
  const basePath  = `${appUrl}/api/webhooks/${SLUG[provider] ?? provider}/${workspaceId}`
  // For GF/WPForms/Fluent Forms: embed the secret in the URL so no custom header is needed
  const secret     = config.webhook_secret ?? ''
  const embedSecret = provider === 'gravity_forms' || provider === 'wpforms' || provider === 'fluent_forms'
  const webhookUrl = embedSecret && secret
    ? `${basePath}?secret=${encodeURIComponent(secret)}`
    : basePath

  // Typeform: auto-register our webhook via Typeform API
  if (provider === 'typeform') {
    const accessToken = config.access_token ?? ''
    if (!accessToken) {
      revalidatePath('/sage/integrations')
      return { webhookUrl }
    }

    try {
      // List all forms (or use the specific form_id if provided)
      const formIds: string[] = []
      if (config.form_id) {
        formIds.push(config.form_id)
      } else {
        const listRes = await fetch('https://api.typeform.com/forms?page_size=200', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (listRes.ok) {
          const listData = await listRes.json() as { items?: Array<{ id: string }> }
          formIds.push(...(listData.items ?? []).map(f => f.id))
        }
      }

      // Register webhook for each form
      let registered = 0
      for (const formId of formIds) {
        const res = await fetch(`https://api.typeform.com/forms/${formId}/webhooks/sage_webhook`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled:    true,
            url:        webhookUrl,
            secret:     accessToken,
            verify_ssl: true,
          }),
        })
        if (res.ok) registered++
      }

      revalidatePath('/sage/integrations')
      return { webhookUrl, formsRegistered: registered }
    } catch (err) {
      // Webhook registration failed — integration is still saved, just show the URL
      revalidatePath('/sage/integrations')
      return { webhookUrl, error: `Integration saved but webhook registration failed: ${err instanceof Error ? err.message : 'unknown error'}` }
    }
  }

  revalidatePath('/sage/integrations')
  return { webhookUrl }
}

/**
 * Disconnect a form integration and clean up remote webhooks (Typeform only).
 */
export async function disconnectFormIntegration(
  provider: 'gravity_forms' | 'wpforms' | 'typeform' | 'fluent_forms',
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // For Typeform: de-register our webhook before clearing config
  if (provider === 'typeform') {
    const { data: integ } = await admin
      .from('sage_integrations')
      .select('config')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'typeform')
      .maybeSingle()

    const accessToken = (integ as { config?: Record<string, string> } | null)?.config?.access_token ?? ''
    if (accessToken) {
      try {
        const listRes = await fetch('https://api.typeform.com/forms?page_size=200', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (listRes.ok) {
          const listData = await listRes.json() as { items?: Array<{ id: string }> }
          for (const form of listData.items ?? []) {
            await fetch(`https://api.typeform.com/forms/${form.id}/webhooks/sage_webhook`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            }).catch(() => { /* best-effort */ })
          }
        }
      } catch { /* best-effort cleanup */ }
    }
  }

  await admin
    .from('sage_integrations')
    .update({ status: 'disconnected', config: {}, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)

  revalidatePath('/sage/integrations')
}

export async function disconnectSageIntegration(provider: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()

  // Try matching by user_id first; fall back to workspace-wide disconnect
  // in case the stored user_id differs from the current session (e.g. OAuth popup edge case)
  const { error, count } = await admin
    .from('sage_integrations')
    .update({ status: 'disconnected', config: {}, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('provider', provider)
    .select()

  if (error) throw new Error(error.message)

  if (!count || count === 0) {
    // Fallback: disconnect any row for this provider in the workspace
    const { error: fallbackError } = await admin
      .from('sage_integrations')
      .update({ status: 'disconnected', config: {}, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
    if (fallbackError) throw new Error(fallbackError.message)
  }

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
  const { data: dealRow } = await admin.from('sage_deals').select('title').eq('id', dealId).eq('workspace_id', workspaceId).single()
  const dealTitle = (dealRow as { title?: string } | null)?.title ?? null
  const { error } = await admin
    .from('sage_deals')
    .delete()
    .eq('id', dealId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  await logActivity(workspaceId, 'deal', dealId, 'deal_deleted', { title: dealTitle, name: dealTitle, source: 'manual' })
  revalidatePath('/sage/pipelines')
  return {}
}
