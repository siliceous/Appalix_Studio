'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return (data as { workspace_id: string } | null)?.workspace_id ?? null
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

/**
 * Create a new contact + deal from an email triage card.
 * Called when user clicks "Create Lead" after reviewing the pre-filled modal.
 */
export async function triageCreateLead(data: {
  name:       string
  email:      string
  company?:   string
  dealTitle:  string
  notes?:     string
}): Promise<{ contactId?: string; dealId?: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  try {
    // 1. Upsert contact (match by email if possible)
    let contactId: string

    if (data.email) {
      const { data: existing } = await admin
        .from('sage_contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('email', data.email)
        .limit(1)
        .single()

      if (existing) {
        contactId = (existing as { id: string }).id
      } else {
        const { data: created, error: contactErr } = await admin
          .from('sage_contacts')
          .insert({
            workspace_id:  workspaceId,
            name:          data.name,
            email:         data.email.toLowerCase(),
            company_name:  data.company ?? null,
            notes:         data.notes ?? null,
            source:        'manual',
            contact_type:  'potential_customer',
            tags:          [],
          })
          .select('id')
          .single()
        if (contactErr || !created) return { error: contactErr?.message ?? 'Failed to create contact' }
        contactId = (created as { id: string }).id
      }
    } else {
      const { data: created, error: contactErr } = await admin
        .from('sage_contacts')
        .insert({
          workspace_id:  workspaceId,
          name:          data.name,
          company_name:  data.company ?? null,
          notes:         data.notes ?? null,
          source:        'manual',
          contact_type:  'potential_customer',
          tags:          [],
        })
        .select('id')
        .single()
      if (contactErr || !created) return { error: contactErr?.message ?? 'Failed to create contact' }
      contactId = (created as { id: string }).id
    }

    await logActivity(workspaceId, 'contact', contactId, 'contact_created', { source: 'email_triage' })

    // 2. Find first pipeline + first stage
    const { data: pipeline } = await admin
      .from('sage_pipelines')
      .select('id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const pipelineId = (pipeline as { id: string } | null)?.id ?? null

    let stageId: string | null = null
    if (pipelineId) {
      const { data: stage } = await admin
        .from('sage_pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true })
        .limit(1)
        .single()
      stageId = (stage as { id: string } | null)?.id ?? null
    }

    // 3. Create deal
    const { data: deal, error: dealErr } = await admin
      .from('sage_deals')
      .insert({
        workspace_id: workspaceId,
        pipeline_id:  pipelineId,
        stage_id:     stageId,
        contact_id:   contactId,
        title:        data.dealTitle,
        source:       'email',
        status:       'open',
        currency:     'USD',
        tags:         [],
        visibility:   'everyone',
        description:  data.notes ?? null,
      })
      .select('id')
      .single()

    if (dealErr || !deal) return { error: dealErr?.message ?? 'Failed to create deal' }
    const dealId = (deal as { id: string }).id

    await logActivity(workspaceId, 'deal', dealId, 'deal_created', {
      contact_id: contactId,
      source:     'email_triage',
    })

    revalidatePath('/dashboard')
    revalidatePath('/sage/pipelines')
    revalidatePath('/sage/contacts')

    return { contactId, dealId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return { error: msg }
  }
}

/**
 * Create a support ticket from an email triage card.
 */
export async function triageCreateTicket(data: {
  title:         string
  description:   string
  contactEmail:  string
  contactName:   string
  priority:      'low' | 'medium' | 'high' | 'urgent'
}): Promise<{ ticketId?: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  try {
    // Find or create contact
    let contactId: string | null = null

    if (data.contactEmail) {
      const { data: existing } = await admin
        .from('sage_contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('email', data.contactEmail)
        .limit(1)
        .single()

      if (existing) {
        contactId = (existing as { id: string }).id
      } else {
        const { data: created } = await admin
          .from('sage_contacts')
          .insert({
            workspace_id: workspaceId,
            name:         data.contactName,
            email:        data.contactEmail.toLowerCase(),
            source:       'manual',
            contact_type: 'potential_customer',
            tags:         [],
          })
          .select('id')
          .single()
        contactId = (created as { id: string } | null)?.id ?? null
      }
    }

    const { data: ticket, error: ticketErr } = await admin
      .from('sage_tickets')
      .insert({
        workspace_id:   workspaceId,
        contact_id:     contactId,
        title:          data.title,
        description:    data.description,
        status:         'open',
        priority:       data.priority,
        contact_method: 'email',
      })
      .select('id')
      .single()

    if (ticketErr || !ticket) return { error: ticketErr?.message ?? 'Failed to create ticket' }
    const ticketId = (ticket as { id: string }).id

    if (contactId) {
      await logActivity(workspaceId, 'contact', contactId, 'ticket_created', { ticket_id: ticketId })
    }

    revalidatePath('/dashboard')
    revalidatePath('/sage/tickets')

    return { ticketId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return { error: msg }
  }
}

/**
 * Log a note on an existing deal (for the "Update Deal" triage action).
 */
export async function triageAddDealNote(
  dealId: string,
  note: string,
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  try {
    const admin = createAdminClient()
    // Write to sage_deal_activities so it appears in the deal slide-over Follow ups section
    await admin.from('sage_deal_activities').insert({
      workspace_id: workspaceId,
      deal_id:      dealId,
      type:         'note',
      title:        'Note from email triage',
      body:         note,
    })
    // Also log to general activity log
    await logActivity(workspaceId, 'deal', dealId, 'note_added', { note })
    // Do NOT revalidatePath('/dashboard') — that forces a router refresh which would
    // unmount the triage card and kill the confirmation UI before the user sees it.
    revalidatePath('/sage/pipelines')
    return {}
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return { error: msg }
  }
}
