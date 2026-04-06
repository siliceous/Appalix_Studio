'use server'

/**
 * Automation service actions.
 *
 * All queries use the admin client (service role) because lead_automations
 * has RLS disabled, matching the platform pattern for internal CRM tables.
 *
 * Service contract summary:
 *   getActiveAutomations  → AutomationListItem[]   (all non-stopped/completed)
 *   getNeedsAttention     → AutomationListItem[]   (engaged/escalated, sorted by urgency)
 *   getAutomationDetail   → AutomationDetail | null
 *   createAutomation      → LeadAutomation
 *   pauseAutomation       → void
 *   resumeAutomation      → void
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect }                         from 'next/navigation'
import type {
  LeadAutomation,
  AutomationListItem,
  AutomationDetail,
  AutomationTimelineEvent,
  CreateAutomationInput,
} from '@/lib/types'

// ── Workspace helper (same pattern as ai-guidance.ts) ─────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute momentum from message_events for a contact. */
async function computeMomentum(
  admin:     ReturnType<typeof createAdminClient>,
  contactId: string | null,
  workspaceId: string,
): Promise<'increasing' | 'flat' | 'declining'> {
  if (!contactId) return 'declining'

  const now   = new Date()
  const h48   = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  const d5    = new Date(now.getTime() -  5 * 24 * 60 * 60 * 1000).toISOString()

  // Any reply in last 48h → increasing
  const { count: replyCount } = await admin
    .from('message_events')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .in('event_type', ['email_replied', 'sms_replied'])
    .gte('event_at', h48)

  if ((replyCount ?? 0) > 0) return 'increasing'

  // Any engagement event in last 5 days → flat
  const { count: engCount } = await admin
    .from('message_events')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .in('event_type', ['email_replied', 'sms_replied', 'email_opened', 'email_clicked'])
    .gte('event_at', d5)

  if ((engCount ?? 0) > 0) return 'flat'

  return 'declining'
}

/** Join contact + deal names onto raw automation rows. */
async function joinNames(
  admin: ReturnType<typeof createAdminClient>,
  rows:  LeadAutomation[],
): Promise<AutomationListItem[]> {
  const contactIds = [...new Set(rows.map(r => r.contact_id).filter(Boolean))] as string[]
  const dealIds    = [...new Set(rows.map(r => r.deal_id).filter(Boolean))]    as string[]

  const [contactsRes, dealsRes] = await Promise.all([
    contactIds.length > 0
      ? admin.from('sage_contacts').select('id, name, email, phone').in('id', contactIds)
      : { data: [] },
    dealIds.length > 0
      ? admin.from('sage_deals').select('id, title').in('id', dealIds)
      : { data: [] },
  ])

  const cMap = new Map((contactsRes.data ?? []).map((c: { id: string; name: string; email: string | null; phone: string | null }) => [c.id, c]))
  const dMap = new Map((dealsRes.data ?? []).map((d: { id: string; title: string }) => [d.id, d]))

  return rows.map(r => ({
    ...r,
    contact_name:  r.contact_id ? (cMap.get(r.contact_id)?.name  ?? null) : null,
    contact_email: r.contact_id ? (cMap.get(r.contact_id)?.email ?? null) : null,
    contact_phone: r.contact_id ? (cMap.get(r.contact_id)?.phone ?? null) : null,
    deal_title:    r.deal_id    ? (dMap.get(r.deal_id)?.title     ?? null) : null,
  }))
}

// ── 1. getActiveAutomations ───────────────────────────────────────────────────
/**
 * Returns all non-terminal automations for the workspace.
 * Terminal = stopped | completed.
 * Sorted: escalated/engaged first, then by updated_at desc.
 *
 * Output: AutomationListItem[]
 */
export async function getActiveAutomations(): Promise<AutomationListItem[]> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data, error } = await admin
    .from('lead_automations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '("stopped","completed")')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[automations] getActiveAutomations error:', error.message)
    return []
  }

  const rows = (data ?? []) as LeadAutomation[]
  const items = await joinNames(admin, rows)

  // Sort: escalated → engaged → running → waiting → paused
  const ORDER: Record<string, number> = {
    escalated: 0, engaged: 1, running: 2, waiting: 3, paused: 4,
  }
  items.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9))

  return items
}

// ── 2. getNeedsAttention ──────────────────────────────────────────────────────
/**
 * Returns automations requiring immediate human action.
 * Criteria: status IN ('engaged', 'escalated')
 * Sorted by: priority (high→low), then last_engagement_at desc.
 *
 * Output: AutomationListItem[]
 */
export async function getNeedsAttention(): Promise<AutomationListItem[]> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

  const { data, error } = await admin
    .from('lead_automations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['engaged', 'escalated'])
    .order('last_engagement_at', { ascending: false })

  if (error) {
    console.error('[automations] getNeedsAttention error:', error.message)
    return []
  }

  const rows  = (data ?? []) as LeadAutomation[]
  const items = await joinNames(admin, rows)

  items.sort((a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  )

  return items
}

// ── 3. getAutomationDetail ────────────────────────────────────────────────────
/**
 * Returns full automation detail including contact, deal, and timeline.
 * Timeline is sourced from unified_timeline filtered to the contact entity.
 *
 * Output: AutomationDetail | null
 */
export async function getAutomationDetail(
  automationId: string,
): Promise<AutomationDetail | null> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data: row, error } = await admin
    .from('lead_automations')
    .select('*')
    .eq('id', automationId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !row) return null
  const automation = row as LeadAutomation

  const [contactRes, dealRes, timelineRes] = await Promise.all([
    automation.contact_id
      ? admin
          .from('sage_contacts')
          .select('id, name, email, phone, company_name, email_deliverability')
          .eq('id', automation.contact_id)
          .single()
      : { data: null },
    automation.deal_id
      ? admin
          .from('sage_deals')
          .select('id, title, value, status, stage')
          .eq('id', automation.deal_id)
          .single()
      : { data: null },
    // Timeline: pull from unified_timeline for this contact, last 90 days
    automation.contact_id
      ? admin
          .from('unified_timeline')
          .select('id, source, event_type, actor_type, content, metadata, created_at')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', 'contact')
          .eq('entity_id', automation.contact_id)
          .order('created_at', { ascending: false })
          .limit(50)
      : { data: [] },
  ])

  const timeline: AutomationTimelineEvent[] = ((timelineRes.data ?? []) as {
    id: string; source: string; event_type: string; actor_type: string;
    content: string; metadata: Record<string, unknown> | null; created_at: string;
  }[]).map(e => ({
    id:         e.id,
    source:     e.source,
    event_type: e.event_type,
    actor_type: e.actor_type,
    content:    e.content,
    metadata:   e.metadata,
    event_at:   e.created_at,
  }))

  return {
    automation,
    contact:  contactRes.data as AutomationDetail['contact'] ?? null,
    deal:     dealRes.data    as AutomationDetail['deal']    ?? null,
    timeline,
  }
}

// ── 4. createAutomation ───────────────────────────────────────────────────────
/**
 * Creates a new automation from a manual trigger or Approach handoff.
 * Sets initial momentum via message_events lookup.
 *
 * Output: LeadAutomation (the created row)
 */
export async function createAutomation(
  input: CreateAutomationInput,
): Promise<LeadAutomation> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const momentum = await computeMomentum(admin, input.contact_id ?? null, workspaceId)

  const { data, error } = await admin
    .from('lead_automations')
    .insert({
      workspace_id:     workspaceId,
      contact_id:       input.contact_id       ?? null,
      deal_id:          input.deal_id           ?? null,
      source_type:      input.source_type,
      source_ref_id:    input.source_ref_id     ?? null,
      goal:             input.goal,
      primary_channel:  input.primary_channel,
      fallback_channel: input.fallback_channel  ?? null,
      priority:         input.priority          ?? 'medium',
      momentum,
      current_summary:  input.current_summary   ?? null,
      ai_strategy:      input.ai_strategy       ?? {},
      qualification:    input.qualification      ?? {},
      status:           'running',
      stage:            'initial_outreach',
    })
    .select('*')
    .single()

  if (error) throw new Error(`[automations] createAutomation: ${error.message}`)
  return data as LeadAutomation
}

// ── 5. pauseAutomation / resumeAutomation ─────────────────────────────────────
/**
 * Pauses a running/waiting/engaged automation.
 * Records paused_at and optional reason.
 */
export async function pauseAutomation(
  automationId: string,
  reason?:      string,
): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('lead_automations')
    .update({
      status:       'paused',
      paused_at:    new Date().toISOString(),
      paused_reason: reason ?? null,
    })
    .eq('id', automationId)
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '("stopped","completed")')

  if (error) throw new Error(`[automations] pauseAutomation: ${error.message}`)
}

/**
 * Resumes a paused automation back to 'running'.
 * Clears paused_at and paused_reason.
 */
export async function resumeAutomation(automationId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { error } = await admin
    .from('lead_automations')
    .update({
      status:        'running',
      paused_at:     null,
      paused_reason: null,
    })
    .eq('id', automationId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'paused')

  if (error) throw new Error(`[automations] resumeAutomation: ${error.message}`)
}

// ── 5b. escalateAutomationForOptOut ──────────────────────────────────────────
/**
 * Called when a contact replies STOP (SMS) or clicks Unsubscribe (email).
 * Finds all active (non-terminal) automations for the contact and marks them
 * 'escalated' so they surface in the Needs Attention strip.
 * Uses admin client — safe to call from webhook handlers without session.
 */
export async function escalateAutomationsForOptOut(
  contactId:   string,
  workspaceId: string,
  reason:      string,
): Promise<void> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('lead_automations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .not('status', 'in', '("stopped","completed","escalated")')

  if (!data || data.length === 0) return

  const ids = data.map((r: { id: string }) => r.id)

  await admin
    .from('lead_automations')
    .update({
      status:        'escalated',
      paused_reason: reason,
      paused_at:     new Date().toISOString(),
    })
    .in('id', ids)
}

// ── 6. getAutomationInsights ──────────────────────────────────────────────────
/**
 * Returns live counts for the insights strip.
 * Four numbers: active, engaged, completed, escalated.
 * Never cached — direct DB query on every page load.
 */
export async function getAutomationInsights(): Promise<{
  active:    number
  engaged:   number
  completed: number
  escalated: number
}> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  const { data } = await admin
    .from('lead_automations')
    .select('status')
    .eq('workspace_id', workspaceId)

  const rows = (data ?? []) as { status: string }[]
  const counts = { active: 0, engaged: 0, completed: 0, escalated: 0 }

  for (const r of rows) {
    if (r.status === 'completed')             counts.completed++
    else if (r.status === 'escalated')        counts.escalated++
    else if (r.status === 'engaged')          counts.engaged++
    else if (r.status !== 'stopped')          counts.active++
  }

  return counts
}

// ── 7. searchContactsForAutomation ───────────────────────────────────────────
/**
 * Contact typeahead for the New Automation modal.
 * Returns up to 10 matches by name or email prefix.
 */
export async function searchContactsForAutomation(
  query: string,
): Promise<{ id: string; name: string; email: string | null; phone: string | null; company_name: string | null }[]> {
  if (!query || query.trim().length < 2) return []
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()
  const q           = query.trim().toLowerCase()

  const { data } = await admin
    .from('sage_contacts')
    .select('id, name, email, phone, company_name')
    .eq('workspace_id', workspaceId)
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .order('name', { ascending: true })
    .limit(10)

  return (data ?? []) as { id: string; name: string; email: string | null; phone: string | null; company_name: string | null }[]
}

// ── 8. createAutomationFromProspect ──────────────────────────────────────────
/**
 * Called from the enrichment page when the user clicks "Start Automation".
 * Creates a contact from the prospect (if not already created) then creates
 * the automation. Returns the created automation id.
 */
export async function createAutomationFromProspect(opts: {
  prospectId:   string
  contactId?:   string   // pre-existing contact, skip creation
  goal:         CreateAutomationInput['goal']
  primaryChannel: CreateAutomationInput['primary_channel']
  summary?:     string
}): Promise<{ automationId: string; contactId: string }> {
  const workspaceId = await getWorkspaceId()
  const admin       = createAdminClient()

  // If no contact yet, create one from prospect data
  let contactId = opts.contactId ?? null
  if (!contactId) {
    const { data: prospect } = await admin
      .from('prospect_companies')
      .select('company_name, email_1, phone_1, domain')
      .eq('id', opts.prospectId)
      .single()

    if (prospect) {
      const { data: contact } = await admin
        .from('sage_contacts')
        .insert({
          workspace_id: workspaceId,
          name:         (prospect as { company_name?: string; domain?: string }).company_name ?? (prospect as { domain?: string }).domain ?? 'Unknown',
          email:        (prospect as { email_1?: string }).email_1 ?? null,
          phone:        (prospect as { phone_1?: string }).phone_1 ?? null,
          source:       'import',
        })
        .select('id')
        .single()
      contactId = contact?.id ?? null

      // Link contact back to prospect
      if (contactId) {
        await admin
          .from('prospect_companies')
          .update({ contact_id: contactId })
          .eq('id', opts.prospectId)
      }
    }
  }

  const automation = await createAutomation({
    contact_id:      contactId ?? undefined,
    source_type:     'prospect',
    source_ref_id:   opts.prospectId,
    goal:            opts.goal,
    primary_channel: opts.primaryChannel,
    current_summary: opts.summary ?? undefined,
  })

  return { automationId: automation.id, contactId: contactId ?? '' }
}
