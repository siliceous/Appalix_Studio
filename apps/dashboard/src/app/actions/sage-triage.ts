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
    .order('created_at', { ascending: true })
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
  name:            string
  email:           string
  phone?:          string
  company?:        string
  dealTitle:       string
  notes?:          string
  conversationId?: string
  source?:         'email' | 'chat'
  productInterest?: string
}): Promise<{ contactId?: string; dealId?: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  try {
    // 1. Find or create contact: email → name (phone not available in email triage)
    type CR = { id: string }
    let contactId: string
    let isNew = false

    let existing: CR | null = null
    if (data.email) {
      const { data: byEmail } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('email', data.email).limit(1).maybeSingle()
      if (byEmail) existing = byEmail as CR
    }
    if (!existing) {
      const { data: byName } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('name', data.name.trim()).limit(1).maybeSingle()
      if (byName) existing = byName as CR
    }

    if (existing) {
      contactId = existing.id
      const upd: Record<string, string> = {}
      if (data.email)   upd.email        = data.email.toLowerCase()
      if (data.name)    upd.name         = data.name
      if (data.phone)   upd.phone        = data.phone
      if (data.company) upd.company_name = data.company
      if (data.notes)   upd.notes        = data.notes
      if (Object.keys(upd).length > 0) await admin.from('sage_contacts').update(upd).eq('id', contactId)
    } else {
      isNew = true
      const { data: created, error: contactErr } = await admin
        .from('sage_contacts')
        .insert({
          workspace_id:  workspaceId,
          name:          data.name,
          email:         data.email?.toLowerCase() ?? null,
          phone:         data.phone ?? null,
          company_name:  data.company ?? null,
          notes:         data.notes ?? null,
          source:        data.source ?? 'email',
          contact_type:  'potential_customer',
          tags:          [],
        })
        .select('id')
        .single()
      if (contactErr || !created) return { error: contactErr?.message ?? 'Failed to create contact' }
      contactId = (created as CR).id
    }

    if (isNew) await logActivity(workspaceId, 'contact', contactId, 'contact_created', { source: 'email_triage' })

    // 2. Check for existing open deal — if found, link conversation and return (no duplicate)
    const { data: openDeal } = await admin
      .from('sage_deals')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle()

    if (openDeal) {
      const dealId = (openDeal as { id: string }).id
      if (data.conversationId) {
        await admin.from('sage_deals')
          .update({ source_conversation_id: data.conversationId })
          .eq('id', dealId)
          .is('source_conversation_id', null)
      }
      revalidatePath('/dashboard')
      revalidatePath('/sage/pipelines')
      revalidatePath('/sage/contacts')
      return { contactId, dealId }
    }

    // 3. Find first pipeline + first stage
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
        source:                  data.source ?? 'email',
        source_conversation_id:  data.conversationId ?? null,
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
    // Find or create contact: email → name
    type CR = { id: string }
    let contactId: string | null = null

    let existing: CR | null = null
    if (data.contactEmail) {
      const { data: byEmail } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('email', data.contactEmail).limit(1).maybeSingle()
      if (byEmail) existing = byEmail as CR
    }
    if (!existing && data.contactName) {
      const { data: byName } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('name', data.contactName.trim()).limit(1).maybeSingle()
      if (byName) existing = byName as CR
    }

    if (existing) {
      contactId = existing.id
      const upd: Record<string, string> = {}
      if (data.contactEmail) upd.email = data.contactEmail.toLowerCase()
      if (Object.keys(upd).length > 0) await admin.from('sage_contacts').update(upd).eq('id', contactId)
    } else if (data.contactEmail || data.contactName) {
      const { data: created } = await admin
        .from('sage_contacts')
        .insert({
          workspace_id: workspaceId,
          name:         data.contactName,
          email:        data.contactEmail?.toLowerCase() ?? null,
          source:       'email',
          contact_type: 'potential_customer',
          tags:         [],
        })
        .select('id')
        .single()
      contactId = (created as CR | null)?.id ?? null
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

/** Return all pipelines for the current workspace (for the pipeline picker UI). */
export async function getWorkspacePipelines(): Promise<{ pipelines: { id: string; name: string }[] }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { pipelines: [] }
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_pipelines')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  return { pipelines: (data ?? []) as { id: string; name: string }[] }
}

/**
 * Dashboard "Add Lead" action.
 * Dedup (hardcoded): email → name → phone.
 * – Existing contact + open deal  → log "Received a {source}" activity on that deal.
 * – Existing contact + no open deal → create deal in first stage of chosen pipeline.
 * – New contact                   → create contact + deal.
 */
export async function dashboardAddLead(opts: {
  name:            string
  email?:          string | null
  phone?:          string | null
  company?:        string | null
  interest?:       string | null
  source:          'email' | 'bot' | 'form'
  conversationId?: string | null
  pipelineId:      string
}): Promise<{ contactId?: string; dealId?: string; isExisting?: boolean; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }
  const admin = createAdminClient()

  try {
    type CR = { id: string }
    let contactId: string
    let isNew = true

    // 1. Dedup: email → name → phone
    let existing: CR | null = null
    if (opts.email) {
      const { data: r } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('email', opts.email).limit(1).maybeSingle()
      if (r) existing = r as CR
    }
    if (!existing && opts.name) {
      const { data: r } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('name', opts.name.trim()).limit(1).maybeSingle()
      if (r) existing = r as CR
    }
    if (!existing && opts.phone) {
      const { data: r } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).eq('phone', opts.phone).limit(1).maybeSingle()
      if (r) existing = r as CR
    }

    if (existing) {
      isNew = false
      contactId = existing.id
      const upd: Record<string, string> = {}
      if (opts.email)   upd.email        = opts.email.toLowerCase()
      if (opts.phone)   upd.phone        = opts.phone
      if (opts.company) upd.company_name = opts.company
      if (Object.keys(upd).length > 0)
        await admin.from('sage_contacts').update(upd).eq('id', contactId)
    } else {
      const { data: created, error: contactErr } = await admin
        .from('sage_contacts')
        .insert({
          workspace_id: workspaceId,
          name:         opts.name,
          email:        opts.email?.toLowerCase() ?? null,
          phone:        opts.phone ?? null,
          company_name: opts.company ?? null,
          source:       opts.source,
          contact_type: 'potential_customer',
          tags:         [],
        })
        .select('id').single()
      if (contactErr || !created) return { error: contactErr?.message ?? 'Failed to create contact' }
      contactId = (created as CR).id
      await logActivity(workspaceId, 'contact', contactId, 'contact_created', { source: `${opts.source}_triage` })
    }

    // 2. Check for existing open deal
    const { data: openDeal } = await admin.from('sage_deals').select('id')
      .eq('workspace_id', workspaceId).eq('contact_id', contactId).eq('status', 'open')
      .limit(1).maybeSingle()

    if (openDeal) {
      const dealId = (openDeal as { id: string }).id
      const activityTitle =
        opts.source === 'email' ? 'Received an email'
        : opts.source === 'bot' ? 'Received a bot conversation'
        : 'Received a form submission'
      await admin.from('sage_deal_activities').insert({
        workspace_id: workspaceId,
        deal_id:      dealId,
        type:         'note',
        title:        activityTitle,
        body:         opts.interest ? `Interest: ${opts.interest}` : null,
      })
      await logActivity(workspaceId, 'deal', dealId, 'activity_added', { source: opts.source, title: activityTitle })
      revalidatePath('/sage/pipelines')
      return { contactId, dealId, isExisting: true }
    }

    // 3. First stage of chosen pipeline
    const { data: stage } = await admin.from('sage_pipeline_stages').select('id')
      .eq('pipeline_id', opts.pipelineId).order('position', { ascending: true }).limit(1).single()
    const stageId = (stage as { id: string } | null)?.id ?? null

    // 4. Deal title: Name - Company - Interest
    const parts = [opts.name]
    if (opts.company)  parts.push(opts.company)
    if (opts.interest) parts.push(opts.interest)
    const dealTitle = parts.join(' - ')

    // 5. Create deal
    const { data: deal, error: dealErr } = await admin.from('sage_deals')
      .insert({
        workspace_id:           workspaceId,
        pipeline_id:            opts.pipelineId,
        stage_id:               stageId,
        contact_id:             contactId,
        title:                  dealTitle,
        source:                 opts.source,
        source_conversation_id: opts.conversationId ?? null,
        status:                 'open',
        currency:               'USD',
        tags:                   [],
        visibility:             'everyone',
      })
      .select('id').single()

    if (dealErr || !deal) return { error: dealErr?.message ?? 'Failed to create deal' }
    const dealId = (deal as { id: string }).id

    void isNew
    await logActivity(workspaceId, 'deal', dealId, 'deal_created', { source: `${opts.source}_triage` })
    revalidatePath('/dashboard')
    revalidatePath('/sage/pipelines')
    revalidatePath('/sage/contacts')
    return { contactId, dealId, isExisting: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    return { error: msg }
  }
}

// ── Hard-coded dedup: add ticket from dashboard ──────────────────────────────
// Dedup priority: email → name → phone (cannot be overwritten)
// If existing open ticket found for contact → log activity, no duplicate
export async function dashboardAddTicket(opts: {
  name: string
  email?: string | null
  phone?: string | null
  title: string
  description?: string | null
  priority?: string
  source: 'email' | 'bot' | 'form' | 'ticket'
}): Promise<{ ticketId?: string; isExisting?: boolean; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  type Row = { id: string }

  try {
    // 1. Find contact: email → name → phone (hardcoded priority)
    let contactId: string | null = null

    if (opts.email) {
      const { data: c } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('email', opts.email).limit(1).maybeSingle()
      if (c) contactId = (c as Row).id
    }
    if (!contactId && opts.name) {
      const { data: c } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).ilike('name', opts.name.trim()).limit(1).maybeSingle()
      if (c) contactId = (c as Row).id
    }
    if (!contactId && opts.phone) {
      const { data: c } = await admin.from('sage_contacts').select('id')
        .eq('workspace_id', workspaceId).eq('phone', opts.phone).limit(1).maybeSingle()
      if (c) contactId = (c as Row).id
    }

    // 2. Check for existing open ticket for this contact
    if (contactId) {
      const { data: existing } = await admin.from('sage_tickets').select('id')
        .eq('workspace_id', workspaceId).eq('contact_id', contactId).eq('status', 'open')
        .limit(1).maybeSingle()

      if (existing) {
        const ticketId = (existing as Row).id
        const actTitle =
          opts.source === 'email' ? 'Received an email'
          : opts.source === 'bot' ? 'Received a bot conversation'
          : opts.source === 'form' ? 'Received a form submission'
          : 'Received a ticket update'
        await (admin as any).from('sage_ticket_activities').insert({
          workspace_id: workspaceId,
          ticket_id:    ticketId,
          type:         'note',
          title:        actTitle,
          body:         opts.description ?? null,
        })
        revalidatePath('/sage/tickets')
        return { ticketId, isExisting: true }
      }
    }

    // 3. Create new ticket (linked to contact if found)
    const { data: created, error } = await admin.from('sage_tickets')
      .insert({
        workspace_id: workspaceId,
        title:        opts.title,
        description:  opts.description ?? null,
        priority:     opts.priority ?? 'medium',
        status:       'open',
        ...(contactId ? { contact_id: contactId } : {}),
      })
      .select('id').single()

    if (error || !created) return { error: error?.message ?? 'Failed to create ticket' }
    const ticketId = (created as Row).id
    revalidatePath('/sage/tickets')
    return { ticketId, isExisting: false }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
