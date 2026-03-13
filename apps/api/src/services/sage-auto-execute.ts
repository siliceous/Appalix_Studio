/**
 * Sage Auto Execute — runs the AI-recommended action when full automation is enabled.
 *
 * Full automation (global ON + channel ON):
 *   create_lead   → find/create contact → find/create deal
 *   create_ticket → create sage_ticket
 *   ignore        → no-op
 *
 * Assist mode (global OFF, or channel OFF):
 *   AI sets ai_action field only — user acts manually in the dashboard.
 *   This function is NOT called in assist mode.
 */
import { supabase } from '../lib/supabase.js'
import { findMatchingRule } from '../lib/rules-engine.js'

export interface AutoExecuteInput {
  workspaceId:       string
  channel:           'email' | 'bots' | 'forms' | 'tickets'
  action:            'create_lead' | 'create_ticket' | 'ignore'
  sourceId:          string   // email id, conversation id, or form submission id
  entities: {
    name?:             string
    email?:            string
    phone?:            string
    company?:          string
    product_interest?: string
  }
  senderName?:       string | null   // email: from_name fallback
  senderEmail?:      string | null   // email: from_address fallback
  summary?:          string | null
  priority?:         string | null
  defaultPipelineId?: string | null  // from workspace settings; null = oldest pipeline
}

export async function executeAutoAction(input: AutoExecuteInput): Promise<void> {
  // Check if a workspace rule overrides the default action / pipeline
  const rule = await findMatchingRule(supabase, input.workspaceId, {
    channel:  input.channel,
    priority: input.priority,
    content:  input.summary,
  })

  if (rule) {
    console.log(`[sage-auto] Rule matched: "${rule.name}" (id=${rule.id}) — overriding action=${rule.action_type} pipeline=${rule.pipeline_id ?? 'default'}`)
    input = {
      ...input,
      action:            rule.action_type,
      defaultPipelineId: rule.pipeline_id ?? input.defaultPipelineId,
    }

    if (rule.notify_owner) {
      // Fire-and-forget owner notification (non-blocking)
      notifyOwner(input.workspaceId, rule.name, input.channel, input.summary).catch(() => {})
    }
  }

  const { action } = input
  if (action === 'create_lead')   await autoCreateLead(input)
  if (action === 'create_ticket') await autoCreateTicket(input)
  // 'ignore' → no-op
}

async function notifyOwner(
  workspaceId: string,
  ruleName:    string,
  channel:     string,
  summary:     string | null | undefined,
): Promise<void> {
  // Fetch workspace owner email
  const { data: owner } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (!owner) return

  // Log notification — full email delivery can be wired to Resend in a later pass
  console.log(
    `[sage-auto] Rule "${ruleName}" fired on ${channel}` +
    (summary ? ` — "${summary.slice(0, 80)}"` : '') +
    ` | owner_user_id=${(owner as { user_id: string }).user_id}`
  )
}

// ---------------------------------------------------------------------------
// Create lead: find/create contact → find/create deal
// ---------------------------------------------------------------------------

async function autoCreateLead(input: AutoExecuteInput): Promise<void> {
  const { workspaceId, channel, sourceId, entities, senderName, senderEmail, summary, priority } = input

  // Resolve contact fields — prefer AI-extracted entities, fall back to sender info (email channel)
  const name    = entities.name    ?? senderName   ?? entities.email ?? senderEmail ?? 'Unknown'
  const email   = entities.email   ?? senderEmail  ?? null
  const phone   = entities.phone   ?? null
  const company = entities.company ?? null

  // Need at least a name or email to create a meaningful contact
  if (!name || name === 'Unknown') {
    if (!email && !phone) {
      console.log(`[sage-auto] Skipping create_lead — no identifiable contact info (channel=${channel}, source=${sourceId})`)
      return
    }
  }

  // ── 1. Find or create contact ──────────────────────────────────────────────
  type ContactRow = { id: string }
  let contactId: string | null = null

  if (email) {
    const { data } = await supabase
      .from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('email', email.trim())
      .limit(1).maybeSingle()
    if (data) contactId = (data as ContactRow).id
  }

  if (!contactId && name && name !== 'Unknown') {
    const { data } = await supabase
      .from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('name', name.trim())
      .limit(1).maybeSingle()
    if (data) contactId = (data as ContactRow).id
  }

  if (!contactId && phone) {
    const { data } = await supabase
      .from('sage_contacts').select('id')
      .eq('workspace_id', workspaceId).ilike('phone', phone.trim())
      .limit(1).maybeSingle()
    if (data) contactId = (data as ContactRow).id
  }

  if (contactId) {
    // Update existing contact with any new info
    const updates: Record<string, string> = {}
    if (email)   updates.email        = email
    if (phone)   updates.phone        = phone
    if (company) updates.company_name = company
    if (Object.keys(updates).length > 0) {
      await supabase.from('sage_contacts').update(updates).eq('id', contactId)
    }
  } else {
    // Create new contact
    const insertPayload: Record<string, unknown> = {
      workspace_id:           workspaceId,
      name:                   name,
      email:                  email   ?? null,
      phone:                  phone   ?? null,
      company_name:           company ?? null,
      source:                 channel,
      tags:                   [],
    }
    // Link source conversation for bots channel
    if (channel === 'bots') insertPayload.source_conversation_id = sourceId

    const { data: newContact, error } = await supabase
      .from('sage_contacts')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      console.error('[sage-auto] Failed to create contact:', error.message)
      return
    }
    contactId = (newContact as ContactRow).id
  }

  // ── 2. Dedup: check if a deal was already created from this exact source ──
  if (channel === 'email') {
    const { data: existingByEmail } = await supabase
      .from('sage_deals').select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_email_id', sourceId)
      .limit(1).maybeSingle()
    if (existingByEmail) {
      console.log(`[sage-auto] Deal already exists for email ${sourceId} — skipping`)
      return
    }
  }

  if (channel === 'bots') {
    const { data: existingByConv } = await supabase
      .from('sage_deals').select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_conversation_id', sourceId)
      .limit(1).maybeSingle()
    if (existingByConv) {
      console.log(`[sage-auto] Deal already exists for conversation ${sourceId} — skipping`)
      return
    }
  }

  if (channel === 'forms') {
    const { data: existingByForm } = await supabase
      .from('sage_deals').select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_form_id', sourceId)
      .limit(1).maybeSingle()
    if (existingByForm) {
      console.log(`[sage-auto] Deal already exists for form ${sourceId} — skipping`)
      return
    }
  }

  // Secondary dedup: contact already has an open deal (regardless of source)
  const { data: existingDeal } = await supabase
    .from('sage_deals').select('id')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('status', 'open')
    .limit(1).maybeSingle()

  if (existingDeal) {
    console.log(`[sage-auto] Contact ${contactId} already has open deal — skipping`)
    return
  }

  // ── 3. Resolve pipeline ────────────────────────────────────────────────────
  let pipelineId: string
  if (input.defaultPipelineId) {
    pipelineId = input.defaultPipelineId
  } else {
    const { data: pipeline } = await supabase
      .from('sage_pipelines').select('id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1).maybeSingle()
    if (!pipeline) return  // No pipeline configured — skip silently
    pipelineId = (pipeline as { id: string }).id
  }

  const { data: stage } = await supabase
    .from('sage_pipeline_stages').select('id')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1).maybeSingle()

  const stageId = stage ? (stage as { id: string }).id : null

  // ── 4. Create deal ────────────────────────────────────────────────────────
  const dealInsert: Record<string, unknown> = {
    workspace_id:           workspaceId,
    pipeline_id:            pipelineId,
    stage_id:               stageId,
    contact_id:             contactId,
    title:                  name !== 'Unknown' ? name : (email ?? 'New Lead'),
    description:            summary ?? null,
    source:                 channel,
    status:                 'open',
    visibility:             'everyone',
    currency:               'USD',
    priority:               priority ?? null,
    tags:                   [],
  }

  if (channel === 'email') dealInsert.source_email_id        = sourceId
  if (channel === 'bots')  dealInsert.source_conversation_id = sourceId
  if (channel === 'forms') dealInsert.source_form_id         = sourceId

  const { data: deal, error: dealError } = await supabase
    .from('sage_deals')
    .insert(dealInsert)
    .select('id')
    .single()

  if (dealError) {
    console.error('[sage-auto] Failed to create deal:', dealError.message)
    return
  }

  const dealId = (deal as { id: string }).id

  // ── 5. Log activity ───────────────────────────────────────────────────────
  await supabase.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'deal',
    entity_id:    dealId,
    event_type:   'deal_created',
    payload:      { title: name, source: channel, sourceId, auto: true },
    user_id:      null,
  })

  console.log(`[sage-auto] Full automation: contact=${contactId} deal=${dealId} channel=${channel} source=${sourceId}`)
}

// ---------------------------------------------------------------------------
// Create ticket
// ---------------------------------------------------------------------------

async function autoCreateTicket(input: AutoExecuteInput): Promise<void> {
  const { workspaceId, channel, sourceId, entities, senderName, senderEmail, summary, priority } = input

  const name  = entities.name  ?? senderName  ?? entities.email ?? senderEmail ?? 'Unknown'
  const email = entities.email ?? senderEmail ?? null
  const phone = entities.phone ?? null

  const contactMethod =
    channel === 'email'   ? 'email' :
    channel === 'bots'    ? 'chat'  :
    channel === 'forms'   ? 'form'  : 'other'

  // Dedup: if a ticket already came from this exact source, skip
  const { data: existingTicket } = await supabase
    .from('sage_tickets').select('id')
    .eq('workspace_id', workspaceId)
    .eq('external_id', sourceId)
    .eq('external_provider', channel)
    .limit(1).maybeSingle()

  if (existingTicket) return

  const { data: ticket, error } = await supabase
    .from('sage_tickets')
    .insert({
      workspace_id:      workspaceId,
      title:             summary ?? `Support request from ${name}`,
      name:              name !== 'Unknown' ? name : null,
      email:             email,
      phone:             phone,
      description:       summary ?? null,
      status:            'open',
      priority:          priority ?? 'medium',
      contact_method:    contactMethod,
      external_provider: channel,
      external_id:       sourceId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[sage-auto] Failed to create ticket:', error.message)
    return
  }

  console.log(`[sage-auto] Full automation: ticket=${(ticket as { id: string }).id} channel=${channel} source=${sourceId}`)
}
