/**
 * Sage Live Tool Router
 *
 * Routes Gemini tool calls to existing Sage services.
 * All write operations enforce permissions and log to sage_activity_log.
 */
import { supabase } from '../lib/supabase.js'
import {
  sageSetReminder,
  sageMoveDeal,
  sageCreateLead,
} from '../services/sage-tools.js'

export interface ToolContext {
  workspaceId: string
  userId:      string
  role:        string
  userName:    string
}

// ── Permission guard ────────────────────────────────────────────────────────

function requireManagerOrAbove(ctx: ToolContext, action: string): string | null {
  if (ctx.role === 'viewer' || ctx.role === 'employee') {
    return `You need manager or admin access to ${action}.`
  }
  return null
}

// ── assign_deal ─────────────────────────────────────────────────────────────

async function assignDeal(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'assign deals')
  if (denied) return denied

  const dealName     = String(args.deal_name ?? '').trim()
  const assigneeName = String(args.assignee_name ?? '').trim()
  if (!dealName || !assigneeName) return 'Please provide both a deal name and an assignee name.'

  // 1. Find deal
  const { data: deals } = await supabase
    .from('sage_deals')
    .select('id, title, owner_id')
    .eq('workspace_id', ctx.workspaceId)
    .ilike('title', `%${dealName}%`)
    .limit(3)

  if (!deals || deals.length === 0) {
    return `No deal found matching "${dealName}". Check the name and try again.`
  }
  const deal = deals[0] as { id: string; title: string; owner_id: string | null }

  // 2. Find workspace member by name
  type MemberRow = {
    user_id:       string
    user_profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
  }
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id, user_profiles(first_name, last_name)')
    .eq('workspace_id', ctx.workspaceId)
    .not('accepted_at', 'is', null)

  if (!members || members.length === 0) return 'No team members found.'

  // Supabase returns joined rows as array or object depending on relationship type
  function profileName(p: MemberRow['user_profiles']): string {
    const row = Array.isArray(p) ? p[0] : p
    return [row?.first_name, row?.last_name].filter(Boolean).join(' ')
  }

  const nameLower = assigneeName.toLowerCase()
  const matched   = (members as unknown as MemberRow[]).find(m =>
    profileName(m.user_profiles).toLowerCase().includes(nameLower),
  )

  if (!matched) {
    const names = (members as unknown as MemberRow[])
      .map(m => profileName(m.user_profiles))
      .filter(Boolean)
      .join(', ')
    return `No team member found matching "${assigneeName}". Team: ${names}`
  }

  // 3. Assign
  const { error } = await supabase
    .from('sage_deals')
    .update({ owner_id: matched.user_id, updated_at: new Date().toISOString() })
    .eq('id', deal.id)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to assign deal: ${error.message}`

  // 4. Log activity (non-blocking — failure must not crash the voice session)
  const assigneeFull = profileName(matched.user_profiles)
  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId,
    entity_type:  'deal',
    entity_id:    deal.id,
    event_type:   'assigned',
    payload:      { title: deal.title, assignee: assigneeFull, by: ctx.userName, source: 'voice' },
    user_id:      ctx.userId,
  })

  return `✅ Assigned "${deal.title}" to ${assigneeFull}.`
}

// ── create_ticket ───────────────────────────────────────────────────────────

async function createTicket(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const title       = String(args.title ?? '').trim()
  const description = args.description ? String(args.description) : null
  const priority    = ['low', 'medium', 'high'].includes(String(args.priority))
    ? String(args.priority) : 'medium'

  if (!title) return 'Please provide a ticket title.'

  const { data, error } = await supabase
    .from('sage_tickets')
    .insert({
      workspace_id: ctx.workspaceId,
      title,
      description,
      priority,
      status:      'open',
      assigned_to: ctx.userId,
    })
    .select('id')
    .single()

  if (error || !data) return `Failed to create ticket: ${error?.message ?? 'unknown error'}`

  const ticketId = (data as { id: string }).id
  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId,
    entity_type:  'ticket',
    entity_id:    ticketId,
    event_type:   'ticket_created',
    payload:      { title, priority, source: 'voice' },
    user_id:      ctx.userId,
  })

  return `✅ Ticket "${title}" created (${priority} priority) — it's in your open tickets.`
}

// ── create_project_from_won_deal ─────────────────────────────────────────────

async function createProjectFromWonDeal(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'create projects')
  if (denied) return denied

  const dealName = String(args.deal_name ?? '').trim()
  if (!dealName) return 'Please provide the deal name.'

  type DealRow = {
    id: string; title: string; contact_id: string | null; owner_id: string | null
    value: number | null; currency: string; status: string
  }

  const { data: deals } = await supabase
    .from('sage_deals')
    .select('id, title, contact_id, owner_id, value, currency, status')
    .eq('workspace_id', ctx.workspaceId)
    .ilike('title', `%${dealName}%`)
    .limit(3)

  if (!deals || deals.length === 0) return `No deal found matching "${dealName}".`
  const deal = deals[0] as DealRow

  if (deal.status !== 'won') {
    return `"${deal.title}" is not won yet (status: ${deal.status}). Mark it as won first.`
  }

  // Check for existing project
  const { data: existing } = await supabase
    .from('sage_projects')
    .select('id, name')
    .eq('workspace_id', ctx.workspaceId)
    .eq('deal_id', deal.id)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return `A project already exists for "${deal.title}": "${(existing as { name: string }).name}".`
  }

  const { data: project, error } = await supabase
    .from('sage_projects')
    .insert({
      workspace_id: ctx.workspaceId,
      deal_id:      deal.id,
      contact_id:   deal.contact_id,
      owner_id:     deal.owner_id ?? ctx.userId,
      name:         deal.title,
      status:       'onboarding',
      priority:     'medium',
      value:        deal.value,
      currency:     deal.currency ?? 'USD',
    })
    .select('id')
    .single()

  if (error || !project) return `Failed to create project: ${error?.message ?? 'unknown error'}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId,
    entity_type:  'project',
    entity_id:    (project as { id: string }).id,
    event_type:   'project_created',
    payload:      { name: deal.title, deal_id: deal.id, source: 'voice' },
    user_id:      ctx.userId,
  })

  return `✅ Project "${deal.title}" created in onboarding status. The team can now track milestones and deliverables.`
}

// ── list_deals ──────────────────────────────────────────────────────────────

async function getWorkspaceStats(ctx: ToolContext): Promise<string> {
  const [
    deals, contacts, tickets, forms, bots, convs,
    emailsTotal, emailsHigh, emailsMed,
    ticketsHigh, ticketsMed,
    convOpen,
  ] = await Promise.all([
    supabase.from('sage_deals').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId),
    supabase.from('sage_contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId),
    supabase.from('sage_tickets').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('status', 'open'),
    supabase.from('form_submissions').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId),
    supabase.from('bots').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId),
    // Email counts
    supabase.from('sage_emails').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('direction', 'inbound').eq('is_trashed', false),
    supabase.from('sage_emails').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('direction', 'inbound').eq('is_trashed', false).eq('ai_priority', 'high'),
    supabase.from('sage_emails').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('direction', 'inbound').eq('is_trashed', false).eq('ai_priority', 'medium'),
    // Ticket priority breakdown
    supabase.from('sage_tickets').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('status', 'open').eq('priority', 'high'),
    supabase.from('sage_tickets').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('status', 'open').eq('priority', 'medium'),
    // Open conversations
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('status', 'open'),
  ])

  const emailLine = emailsTotal.count
    ? `• Emails: ${emailsTotal.count ?? 0} (High: ${emailsHigh.count ?? 0}, Medium: ${emailsMed.count ?? 0})`
    : `• Emails: 0`

  const ticketLine = `• Tickets (open): ${tickets.count ?? 0} (High: ${ticketsHigh.count ?? 0}, Medium: ${ticketsMed.count ?? 0})`
  const convLine   = `• Conversations: ${convs.count ?? 0} (${convOpen.count ?? 0} open)`

  return [
    `Workspace stats:`,
    `• Deals: ${deals.count ?? 0}`,
    `• Contacts: ${contacts.count ?? 0}`,
    ticketLine,
    `• Form submissions: ${forms.count ?? 0}`,
    `• Bots: ${bots.count ?? 0}`,
    convLine,
    emailLine,
  ].join('\n')
}

async function listDeals(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const status = args.status ? String(args.status) : null
  const limit  = Math.min(parseInt(String(args.limit ?? '10'), 10) || 10, 20)

  type DealRow = { id: string; title: string; status: string; value: number | null; currency: string; stage?: { name: string } | null }

  let query = supabase
    .from('sage_deals')
    .select('id, title, status, value, currency, pipeline_stages(name)')
    .eq('workspace_id', ctx.workspaceId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error || !data || data.length === 0) return 'No deals found.'

  const lines = (data as unknown as DealRow[]).map(d => {
    const stage = (d as any).pipeline_stages?.name ?? ''
    const val   = d.value ? ` — ${d.currency} ${d.value.toLocaleString()}` : ''
    return `• ${d.title} [${d.status}${stage ? ` / ${stage}` : ''}${val}]`
  })
  return `Found ${data.length} deal(s):\n${lines.join('\n')}`
}

// ── list_tickets ─────────────────────────────────────────────────────────────

async function listTickets(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const status   = args.status   ? String(args.status)   : 'open'
  const priority = args.priority ? String(args.priority) : null

  type TicketRow = { id: string; title: string; status: string; priority: string }

  let query = supabase
    .from('sage_tickets')
    .select('id, title, status, priority')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
    .limit(15)

  if (status !== 'all') query = query.eq('status', status)
  if (priority)         query = query.eq('priority', priority)

  const { data, error } = await query
  if (error || !data || data.length === 0) return 'No tickets found.'

  const lines = (data as unknown as TicketRow[]).map(t =>
    `• [${t.priority.toUpperCase()}] ${t.title} (${t.status})`
  )
  return `${data.length} ticket(s):\n${lines.join('\n')}`
}

// ── list_projects ─────────────────────────────────────────────────────────────

async function listProjects(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const status = args.status ? String(args.status) : null

  type ProjectRow = { id: string; name: string; status: string; priority: string; value: number | null; currency: string }

  let query = supabase
    .from('sage_projects')
    .select('id, name, status, priority, value, currency')
    .eq('workspace_id', ctx.workspaceId)
    .order('updated_at', { ascending: false })
    .limit(15)

  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.not('status', 'eq', 'completed')
  }

  const { data, error } = await query
  if (error || !data || data.length === 0) return 'No projects found.'

  const lines = (data as unknown as ProjectRow[]).map(p => {
    const val = p.value ? ` — ${p.currency} ${p.value.toLocaleString()}` : ''
    return `• ${p.name} [${p.status} / ${p.priority} priority${val}]`
  })
  return `${data.length} project(s):\n${lines.join('\n')}`
}

// ── find_contact (voice — richer search) ────────────────────────────────────

async function findContactVoice(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  type ContactRow = {
    id: string; name: string; email: string | null; phone: string | null
    company_name: string | null; source: string | null; tags: string[] | null
  }

  // If focusedEntity gave us an id, fetch directly
  if (args.contact_id) {
    const { data } = await supabase
      .from('sage_contacts')
      .select('id, name, email, phone, company_name, source, tags')
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', String(args.contact_id))
      .limit(1)
    if (data?.[0]) {
      const c = data[0] as ContactRow
      return formatContact(c)
    }
  }

  const query = String(args.query ?? '').trim()
  if (!query) return 'Please provide a name, email, or company to search for.'

  // Search name, email, and company_name in one query
  const { data, error } = await supabase
    .from('sage_contacts')
    .select('id, name, email, phone, company_name, source, tags')
    .eq('workspace_id', ctx.workspaceId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`)
    .order('name')
    .limit(8)

  if (error) return `Error searching contacts: ${error.message}`
  if (!data || data.length === 0) return `No contacts found matching "${query}". Try a partial name, email, or company.`

  return (data as ContactRow[]).map(formatContact).join('\n\n')
}

function formatContact(c: { name: string; email: string | null; phone: string | null; company_name: string | null; source: string | null; tags: string[] | null }): string {
  const parts = [`• ${c.name}`]
  if (c.email)        parts.push(c.email)
  if (c.phone)        parts.push(c.phone)
  if (c.company_name) parts.push(c.company_name)
  if (c.source)       parts.push(`source: ${c.source}`)
  if (c.tags?.length) parts.push(`tags: ${c.tags.join(', ')}`)
  return parts.join(' · ')
}

// ── get_today_plate (enhanced) ───────────────────────────────────────────────

async function getEnhancedOverview(ctx: ToolContext): Promise<string> {
  const now            = new Date()
  const fourteenAgo    = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAhead = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000)

  const [overdueR, highTickets, staleDeals, unassigned, closingSoon] = await Promise.all([
    supabase.from('sage_reminders')
      .select('title, due_at, note')
      .eq('workspace_id', ctx.workspaceId)
      .eq('is_sent', false)
      .lt('due_at', now.toISOString())
      .order('due_at').limit(5),

    supabase.from('sage_tickets')
      .select('title, priority, status')
      .eq('workspace_id', ctx.workspaceId)
      .eq('status', 'open').eq('priority', 'high')
      .order('created_at', { ascending: false }).limit(5),

    supabase.from('sage_deals')
      .select('title, value, currency')
      .eq('workspace_id', ctx.workspaceId)
      .eq('status', 'open')
      .lt('updated_at', fourteenAgo.toISOString())
      .order('updated_at').limit(5),

    supabase.from('sage_deals')
      .select('title, value, currency')
      .eq('workspace_id', ctx.workspaceId)
      .eq('status', 'open')
      .is('owner_id', null)
      .order('created_at', { ascending: false }).limit(5),

    supabase.from('sage_deals')
      .select('title, close_date, value, currency')
      .eq('workspace_id', ctx.workspaceId)
      .eq('status', 'open')
      .gte('close_date', now.toISOString().slice(0, 10))
      .lte('close_date', sevenDaysAhead.toISOString().slice(0, 10))
      .order('close_date').limit(5),
  ])

  const sections: string[] = [
    `Your plate for ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}:`,
  ]

  if (overdueR.data?.length) {
    sections.push('\n⚠️ Overdue reminders:')
    for (const r of overdueR.data as { title: string; due_at: string; note: string | null }[]) {
      const days = Math.floor((now.getTime() - new Date(r.due_at).getTime()) / 86400000)
      sections.push(`  • ${r.title} — ${days === 0 ? 'due today' : `${days}d overdue`}`)
    }
  }

  if (highTickets.data?.length) {
    sections.push('\n🔴 High-priority open tickets:')
    for (const t of highTickets.data as { title: string }[]) sections.push(`  • ${t.title}`)
  }

  if (staleDeals.data?.length) {
    sections.push('\n📭 Stale deals (14+ days no activity):')
    for (const d of staleDeals.data as { title: string; value: number | null; currency: string }[]) {
      const val = d.value ? ` — ${d.currency} ${d.value.toLocaleString()}` : ''
      sections.push(`  • ${d.title}${val}`)
    }
  }

  if (unassigned.data?.length) {
    sections.push('\n👤 Unassigned open deals:')
    for (const d of unassigned.data as { title: string }[]) sections.push(`  • ${d.title}`)
  }

  if (closingSoon.data?.length) {
    sections.push('\n⏰ Closing this week:')
    for (const d of closingSoon.data as { title: string; close_date: string; value: number | null; currency: string }[]) {
      const date = new Date(d.close_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const val  = d.value ? ` — ${d.currency} ${d.value.toLocaleString()}` : ''
      sections.push(`  • ${d.title}${val} (closes ${date})`)
    }
  }

  if (sections.length === 1) return 'Nothing urgent — pipeline is clear and no overdue reminders.'
  return sections.join('\n')
}

// ── update_contact ───────────────────────────────────────────────────────────

async function updateContact(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'update contacts')
  if (denied) return denied

  const field  = String(args.field  ?? '').trim()
  const value  = String(args.value  ?? '').trim()
  const allowed = ['email', 'phone', 'company_name', 'notes']
  if (!allowed.includes(field)) return `Field must be one of: ${allowed.join(', ')}.`
  if (!value) return 'Please provide the new value.'

  // Resolve contact
  let contactId = args.contact_id ? String(args.contact_id) : null
  let contactLabel = contactId ?? ''

  if (!contactId) {
    const name = String(args.contact_name ?? '').trim()
    if (!name) return 'Please provide a contact name or contact_id.'
    const { data } = await supabase
      .from('sage_contacts')
      .select('id, name')
      .eq('workspace_id', ctx.workspaceId)
      .ilike('name', `%${name}%`)
      .limit(1)
    const c = data?.[0] as { id: string; name: string } | undefined
    if (!c) return `No contact found matching "${name}".`
    contactId    = c.id
    contactLabel = c.name
  }

  const { error } = await supabase
    .from('sage_contacts')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', contactId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to update contact: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'contact', entity_id: contactId,
    event_type: 'updated', payload: { field, value, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Updated ${contactLabel}'s ${field} to "${value}".`
}

// ── update_ticket ────────────────────────────────────────────────────────────

async function updateTicket(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'update tickets')
  if (denied) return denied

  // Resolve ticket
  let ticketId = args.ticket_id ? String(args.ticket_id) : null
  let ticketLabel = ticketId ?? ''

  if (!ticketId) {
    const title = String(args.ticket_title ?? '').trim()
    if (!title) return 'Please provide a ticket title or ticket_id.'
    const { data } = await supabase
      .from('sage_tickets')
      .select('id, title')
      .eq('workspace_id', ctx.workspaceId)
      .ilike('title', `%${title}%`)
      .limit(1)
    const t = data?.[0] as { id: string; title: string } | undefined
    if (!t) return `No ticket found matching "${title}".`
    ticketId    = t.id
    ticketLabel = t.title
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (args.status)   updates.status   = String(args.status)
  if (args.priority) updates.priority = String(args.priority)

  if (args.assignee_name) {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, user_profiles(first_name, last_name)')
      .eq('workspace_id', ctx.workspaceId)
      .not('accepted_at', 'is', null)
    const nameLow = String(args.assignee_name).toLowerCase()
    const match = (members as unknown as { user_id: string; user_profiles: { first_name: string | null; last_name: string | null } | null }[])
      ?.find(m => {
        const p = m.user_profiles
        return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.toLowerCase().includes(nameLow)
      })
    if (!match) return `No team member found matching "${String(args.assignee_name)}".`
    updates.assigned_to = match.user_id
  }

  if (Object.keys(updates).length === 1) return 'Please specify status, priority, or assignee_name to update.'

  const { error } = await supabase
    .from('sage_tickets')
    .update(updates)
    .eq('id', ticketId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to update ticket: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'ticket', entity_id: ticketId,
    event_type: 'updated', payload: { ...updates, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Ticket "${ticketLabel}" updated.`
}

// ── add_note ─────────────────────────────────────────────────────────────────

async function addNote(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const entityType = String(args.entity_type ?? '').trim()
  const note       = String(args.note       ?? '').trim()
  if (!note) return 'Please provide the note text.'

  const tableMap: Record<string, string> = { deal: 'sage_deals', contact: 'sage_contacts', ticket: 'sage_tickets' }
  const table = tableMap[entityType]
  if (!table) return 'entity_type must be deal, contact, or ticket.'

  let entityId = args.entity_id ? String(args.entity_id) : null
  let entityLabel = entityId ?? ''

  if (!entityId) {
    const name = String(args.entity_name ?? '').trim()
    if (!name) return `Please provide the ${entityType} name or entity_id.`
    const titleCol = entityType === 'contact' ? 'first_name' : 'title'
    const { data } = await supabase
      .from(table)
      .select(`id, ${titleCol}`)
      .eq('workspace_id', ctx.workspaceId)
      .ilike(titleCol, `%${name}%`)
      .limit(1)
    const row = data?.[0] as Record<string, string> | undefined
    if (!row) return `No ${entityType} found matching "${name}".`
    entityId    = row.id
    entityLabel = row[titleCol] ?? entityId
  }

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: entityType, entity_id: entityId,
    event_type: 'note', payload: { note, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Note added to "${entityLabel}".`
}

// ── list_reminders ───────────────────────────────────────────────────────────

async function listReminders(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const overdueOnly = String(args.include_overdue ?? '') === 'true'
  const now = new Date()

  let query = supabase
    .from('sage_reminders')
    .select('title, note, due_at')
    .eq('workspace_id', ctx.workspaceId)
    .eq('is_sent', false)
    .order('due_at')
    .limit(15)

  if (overdueOnly) query = query.lt('due_at', now.toISOString())

  const { data, error } = await query
  if (error || !data || data.length === 0) return 'No reminders found.'

  const lines = (data as { title: string; due_at: string; note: string | null }[]).map(r => {
    const date    = new Date(r.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const overdue = new Date(r.due_at) < now ? ' ⚠️ OVERDUE' : ''
    return `• ${r.title} — ${date}${overdue}${r.note ? ` (${r.note})` : ''}`
  })
  return `${data.length} reminder(s):\n${lines.join('\n')}`
}

// ── snooze_reminder ───────────────────────────────────────────────────────────

async function snoozeReminder(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const title      = String(args.reminder_title ?? '').trim()
  const snoozeUntil = String(args.snooze_until  ?? '').trim()
  if (!title || !snoozeUntil) return 'Please provide the reminder title and new date.'

  const { data } = await supabase
    .from('sage_reminders')
    .select('id, title')
    .eq('workspace_id', ctx.workspaceId)
    .ilike('title', `%${title}%`)
    .eq('is_sent', false)
    .limit(1)

  const r = data?.[0] as { id: string; title: string } | undefined
  if (!r) return `No active reminder found matching "${title}".`

  // Parse natural language date (reuse pattern from sage-tools)
  let newDue: Date | null = null
  const lower = snoozeUntil.toLowerCase().trim()
  const today = new Date(); today.setHours(9, 0, 0, 0)
  if (lower === 'tomorrow') { newDue = new Date(today); newDue.setDate(newDue.getDate() + 1) }
  else if (lower === 'next week' || lower === 'next monday') { newDue = new Date(today); newDue.setDate(newDue.getDate() + 7) }
  else if (/^\d{4}-\d{2}-\d{2}$/.test(snoozeUntil)) { newDue = new Date(snoozeUntil + 'T09:00:00') }
  else {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const dayIdx = days.indexOf(lower)
    if (dayIdx >= 0) {
      newDue = new Date(today)
      const diff = (dayIdx - newDue.getDay() + 7) % 7 || 7
      newDue.setDate(newDue.getDate() + diff)
    }
  }
  if (!newDue) return `Couldn't parse date "${snoozeUntil}". Try "tomorrow", "next Monday", or "2026-04-15".`

  const { error } = await supabase
    .from('sage_reminders')
    .update({ due_at: newDue.toISOString(), is_sent: false })
    .eq('id', r.id)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to snooze reminder: ${error.message}`
  const dateStr = newDue.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `✅ Reminder "${r.title}" snoozed to ${dateStr}.`
}

// ── Email helpers ────────────────────────────────────────────────────────────

type EmailRow = {
  id: string
  from_name: string | null
  from_address: string
  subject: string
  body_text: string | null
  ai_summary: string | null
  ai_priority: string | null
  received_at: string
  is_read: boolean
  assigned_to: string | null
}

function parseDateFilter(filter: string): { gte?: string; lte?: string } | null {
  const now   = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const lower = filter.toLowerCase().trim()
  if (lower === 'today') {
    return { gte: today.toISOString(), lte: new Date().toISOString() }
  }
  if (lower === 'yesterday') {
    const start = new Date(today); start.setDate(start.getDate() - 1)
    return { gte: start.toISOString(), lte: today.toISOString() }
  }
  if (lower === 'this week' || lower === 'week') {
    const start = new Date(today); start.setDate(start.getDate() - 7)
    return { gte: start.toISOString() }
  }
  return null
}

// ── list_emails ──────────────────────────────────────────────────────────────

async function listEmails(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const senderName = args.sender_name ? String(args.sender_name).trim() : null
  const dateFilter = args.date_filter ? String(args.date_filter).trim() : null
  const priority   = args.priority    ? String(args.priority).trim()    : null
  const limit      = Math.min(parseInt(String(args.limit ?? '10'), 10) || 10, 20)

  let query = supabase
    .from('sage_emails')
    .select('id, from_name, from_address, subject, ai_priority, received_at, is_read')
    .eq('workspace_id', ctx.workspaceId)
    .eq('direction', 'inbound')
    .eq('is_trashed', false)
    .order('received_at', { ascending: false })
    .limit(limit)

  if (senderName) {
    query = query.or(`from_name.ilike.%${senderName}%,from_address.ilike.%${senderName}%`)
  }
  if (priority) {
    query = query.eq('ai_priority', priority)
  }
  if (dateFilter) {
    const range = parseDateFilter(dateFilter)
    if (range?.gte) query = query.gte('received_at', range.gte)
    if (range?.lte) query = query.lte('received_at', range.lte)
  }

  const { data, error } = await query
  if (error) return `Error fetching emails: ${error.message}`
  if (!data || data.length === 0) return 'No emails found matching your criteria.'

  const lines = (data as unknown as EmailRow[]).map(e => {
    const sender = e.from_name ?? e.from_address
    const unread = e.is_read ? '' : ' [UNREAD]'
    const pri    = e.ai_priority ? ` [${e.ai_priority.toUpperCase()}]` : ''
    const date   = new Date(e.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `• ${sender} — "${e.subject}"${pri}${unread} (${date}) [id:${e.id}]`
  })
  return `${data.length} email(s):\n${lines.join('\n')}`
}

// ── read_email ───────────────────────────────────────────────────────────────

async function readEmail(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  let email: EmailRow | null = null

  if (args.email_id) {
    const { data } = await supabase
      .from('sage_emails')
      .select('id, from_name, from_address, subject, body_text, ai_summary, ai_priority, received_at, is_read, assigned_to')
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', String(args.email_id))
      .limit(1)
    email = (data?.[0] as EmailRow) ?? null
  } else if (args.sender_name) {
    const { data } = await supabase
      .from('sage_emails')
      .select('id, from_name, from_address, subject, body_text, ai_summary, ai_priority, received_at, is_read, assigned_to')
      .eq('workspace_id', ctx.workspaceId)
      .eq('direction', 'inbound')
      .eq('is_trashed', false)
      .or(`from_name.ilike.%${String(args.sender_name)}%,from_address.ilike.%${String(args.sender_name)}%`)
      .order('received_at', { ascending: false })
      .limit(1)
    email = (data?.[0] as EmailRow) ?? null
  }

  if (!email) return 'Email not found. Try listing emails first to get the email ID.'

  // Mark as read (non-blocking)
  void supabase.from('sage_emails').update({ is_read: true }).eq('id', email.id).eq('workspace_id', ctx.workspaceId)

  const sender  = email.from_name ?? email.from_address
  const date    = new Date(email.received_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const summary = email.ai_summary ?? (email.body_text?.slice(0, 300) ?? 'No content')
  const pri     = email.ai_priority ? ` | Priority: ${email.ai_priority}` : ''

  return [
    `From: ${sender}  |  Subject: "${email.subject}"  |  Date: ${date}${pri}`,
    `Summary: ${summary}`,
    `Email ID: ${email.id}`,
  ].join('\n')
}

// ── reply_to_email ───────────────────────────────────────────────────────────

async function replyToEmail(args: Record<string, unknown>, ctx: ToolContext): Promise<string & { _emailId?: string }> {
  const emailId   = args.email_id ? String(args.email_id) : null
  const replyBody = args.reply_body ? String(args.reply_body).trim() : null

  if (!emailId) return 'Please provide the email ID. List emails first to get the ID.'

  // Verify email exists in workspace
  const { data } = await supabase
    .from('sage_emails')
    .select('id, from_address, from_name, subject')
    .eq('workspace_id', ctx.workspaceId)
    .eq('id', emailId)
    .limit(1)

  const email = data?.[0] as { id: string; from_address: string; from_name: string | null; subject: string } | undefined
  if (!email) return `Email not found with ID "${emailId}".`

  const sender = email.from_name ?? email.from_address
  const result = replyBody
    ? `Opening reply to ${sender} with your message pre-filled. [email_action:reply:${emailId}:${replyBody.slice(0, 100)}]`
    : `Opening email reply to ${sender} — "${email.subject}". [email_action:reply:${emailId}]`

  return result
}

// ── ignore_email ─────────────────────────────────────────────────────────────

async function ignoreEmail(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const emailId = args.email_id ? String(args.email_id) : null
  if (!emailId) return 'Please provide the email ID.'

  const { error } = await supabase
    .from('sage_emails')
    .update({ is_trashed: true, is_read: true })
    .eq('id', emailId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to ignore email: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'email', entity_id: emailId,
    event_type: 'ignored', payload: { by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Email ignored and removed from inbox.`
}

// ── set_email_priority ───────────────────────────────────────────────────────

async function setEmailPriority(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const emailId = args.email_id ? String(args.email_id) : null
  const priority = String(args.priority ?? '').trim().toLowerCase()

  if (!emailId) return 'Please provide the email ID.'
  if (!['high', 'medium', 'low'].includes(priority)) return 'Priority must be high, medium, or low.'

  const { error } = await supabase
    .from('sage_emails')
    .update({ ai_priority: priority })
    .eq('id', emailId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to update priority: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'email', entity_id: emailId,
    event_type: 'priority_set', payload: { priority, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Email priority set to ${priority}.`
}

// ── assign_email ─────────────────────────────────────────────────────────────

async function assignEmail(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'assign emails')
  if (denied) return denied

  const emailId      = args.email_id ? String(args.email_id) : null
  const assigneeName = String(args.assignee_name ?? '').trim()

  if (!emailId)      return 'Please provide the email ID.'
  if (!assigneeName) return 'Please provide the assignee name.'

  // Resolve team member
  type MemberRow = { user_id: string; user_profiles: { first_name: string | null; last_name: string | null } | null }
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id, user_profiles(first_name, last_name)')
    .eq('workspace_id', ctx.workspaceId)
    .not('accepted_at', 'is', null)

  const nameLow = assigneeName.toLowerCase()
  const match = (members as unknown as MemberRow[])?.find(m => {
    const p = m.user_profiles
    return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.toLowerCase().includes(nameLow)
  })

  if (!match) {
    const names = (members as unknown as MemberRow[])
      .map(m => `${m.user_profiles?.first_name ?? ''} ${m.user_profiles?.last_name ?? ''}`.trim())
      .filter(Boolean).join(', ')
    return `No team member found matching "${assigneeName}". Team: ${names}`
  }

  const { error } = await supabase
    .from('sage_emails')
    .update({ assigned_to: match.user_id })
    .eq('id', emailId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to assign email: ${error.message}`

  const assigneeFull = `${match.user_profiles?.first_name ?? ''} ${match.user_profiles?.last_name ?? ''}`.trim()
  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'email', entity_id: emailId,
    event_type: 'assigned', payload: { assignee: assigneeFull, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Email assigned to ${assigneeFull}.`
}

// ── delete_email ─────────────────────────────────────────────────────────────

async function deleteEmail(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const emailId = args.email_id ? String(args.email_id) : null
  if (!emailId) return 'Please provide the email ID.'

  const { error } = await supabase
    .from('sage_emails')
    .update({ is_trashed: true })
    .eq('id', emailId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to delete email: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'email', entity_id: emailId,
    event_type: 'deleted', payload: { by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Email deleted.`
}

// ── open_pipeline ────────────────────────────────────────────────────────────

async function openPipeline(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const pipelineName = String(args.pipeline_name ?? '').trim()
  if (!pipelineName) return 'Please provide the pipeline name.'

  const { data } = await supabase
    .from('sage_pipelines')
    .select('id, name')
    .eq('workspace_id', ctx.workspaceId)
    .ilike('name', `%${pipelineName}%`)
    .limit(1)

  const pipeline = data?.[0] as { id: string; name: string } | undefined
  if (!pipeline) return `No pipeline found matching "${pipelineName}". Check the name and try again.`

  // Navigation is handled in session-manager before this call
  return `Opening "${pipeline.name}" pipeline board.`
}

// ── list_tasks ────────────────────────────────────────────────────────────────

async function listTasks(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const statusFilter = args.status ? String(args.status) : null
  const entityType   = args.entity_type ? String(args.entity_type) : null

  const statuses = statusFilter ? [statusFilter] : ['pending', 'in_progress']

  const results: string[] = []

  // Deal tasks (from sage_deal_activities where type = 'task')
  if (!entityType || entityType === 'deal') {
    let q = supabase
      .from('sage_deal_activities')
      .select('id, title, due_at, completed_at, sage_deals(title)')
      .eq('workspace_id', ctx.workspaceId)
      .eq('type', 'task')
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(10)

    if (statusFilter === 'completed') {
      q = q.not('completed_at', 'is', null)
    } else {
      q = q.is('completed_at', null)
    }

    const { data } = await q
    if (data?.length) {
      const lines = (data as unknown as { id: string; title: string; due_at: string | null; completed_at: string | null; sage_deals: { title: string } | null }[])
        .map(t => {
          const deal = (t as any).sage_deals?.title ?? 'unknown deal'
          const due  = t.due_at ? ` — due ${new Date(t.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''
          const done = t.completed_at ? ' ✅' : ''
          return `• ${t.title ?? '(untitled)'} [deal: ${deal}]${due}${done} (id:${t.id})`
        })
      results.push(`Deal tasks:\n${lines.join('\n')}`)
    }
  }

  // Project tasks (from sage_project_tasks)
  if (!entityType || entityType === 'project') {
    let q = supabase
      .from('sage_project_tasks')
      .select('id, title, status, due_date, sage_projects(name)')
      .eq('workspace_id', ctx.workspaceId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10)

    if (statusFilter) {
      q = q.eq('status', statusFilter)
    } else {
      q = q.in('status', statuses)
    }

    const { data } = await q
    if (data?.length) {
      const lines = (data as unknown as { id: string; title: string; status: string; due_date: string | null; sage_projects: { name: string } | null }[])
        .map(t => {
          const project = (t as any).sage_projects?.name ?? 'unknown project'
          const due     = t.due_date ? ` — due ${new Date(t.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''
          return `• ${t.title} [project: ${project}] [${t.status}]${due} (id:${t.id})`
        })
      results.push(`Project tasks:\n${lines.join('\n')}`)
    }
  }

  if (results.length === 0) return 'No tasks found.'
  return results.join('\n\n')
}

// ── complete_task ─────────────────────────────────────────────────────────────

async function completeTask(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const taskTitle = args.task_title ? String(args.task_title).trim() : null
  const taskId    = args.task_id    ? String(args.task_id).trim()    : null

  const now = new Date().toISOString()

  // Try deal activities first
  let dealActivityId: string | null = null
  let dealActivityTitle: string | null = null

  if (taskId) {
    const { data } = await supabase
      .from('sage_deal_activities')
      .select('id, title')
      .eq('workspace_id', ctx.workspaceId)
      .eq('type', 'task')
      .eq('id', taskId)
      .limit(1)
    const row = data?.[0] as { id: string; title: string } | undefined
    if (row) { dealActivityId = row.id; dealActivityTitle = row.title }
  } else if (taskTitle) {
    const { data } = await supabase
      .from('sage_deal_activities')
      .select('id, title')
      .eq('workspace_id', ctx.workspaceId)
      .eq('type', 'task')
      .is('completed_at', null)
      .ilike('title', `%${taskTitle}%`)
      .limit(1)
    const row = data?.[0] as { id: string; title: string } | undefined
    if (row) { dealActivityId = row.id; dealActivityTitle = row.title }
  }

  if (dealActivityId) {
    const { error } = await supabase
      .from('sage_deal_activities')
      .update({ completed_at: now })
      .eq('id', dealActivityId)
      .eq('workspace_id', ctx.workspaceId)

    if (error) return `Failed to complete task: ${error.message}`

    void supabase.from('sage_activity_log').insert({
      workspace_id: ctx.workspaceId, entity_type: 'deal', entity_id: dealActivityId,
      event_type: 'task_completed', payload: { title: dealActivityTitle, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
    })
    return `✅ Task "${dealActivityTitle}" marked as complete.`
  }

  // Try project tasks
  let projectTaskId: string | null = null
  let projectTaskTitle: string | null = null

  if (taskId) {
    const { data } = await supabase
      .from('sage_project_tasks')
      .select('id, title')
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', taskId)
      .limit(1)
    const row = data?.[0] as { id: string; title: string } | undefined
    if (row) { projectTaskId = row.id; projectTaskTitle = row.title }
  } else if (taskTitle) {
    const { data } = await supabase
      .from('sage_project_tasks')
      .select('id, title')
      .eq('workspace_id', ctx.workspaceId)
      .not('status', 'eq', 'completed')
      .ilike('title', `%${taskTitle}%`)
      .limit(1)
    const row = data?.[0] as { id: string; title: string } | undefined
    if (row) { projectTaskId = row.id; projectTaskTitle = row.title }
  }

  if (projectTaskId) {
    const { error } = await supabase
      .from('sage_project_tasks')
      .update({ status: 'completed', completed_at: now })
      .eq('id', projectTaskId)
      .eq('workspace_id', ctx.workspaceId)

    if (error) return `Failed to complete task: ${error.message}`

    void supabase.from('sage_activity_log').insert({
      workspace_id: ctx.workspaceId, entity_type: 'project', entity_id: projectTaskId,
      event_type: 'task_completed', payload: { title: projectTaskTitle, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
    })
    return `✅ Task "${projectTaskTitle}" marked as complete.`
  }

  const label = taskTitle ?? taskId ?? '(unknown)'
  return `No pending task found matching "${label}". Try listing your tasks first.`
}

// ── add_deal_task ─────────────────────────────────────────────────────────────

async function addDealTask(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const taskTitle = String(args.task_title ?? '').trim()
  if (!taskTitle) return 'Please provide a task title.'

  // Resolve deal
  let dealId: string | null = args.deal_id ? String(args.deal_id) : null
  let dealLabel = dealId ?? ''

  if (!dealId) {
    const dealName = String(args.deal_name ?? '').trim()
    if (!dealName) return 'Please provide a deal name or deal_id.'
    const { data } = await supabase
      .from('sage_deals')
      .select('id, title')
      .eq('workspace_id', ctx.workspaceId)
      .ilike('title', `%${dealName}%`)
      .limit(1)
    const d = data?.[0] as { id: string; title: string } | undefined
    if (!d) return `No deal found matching "${dealName}".`
    dealId    = d.id
    dealLabel = d.title
  }

  // Parse due date if provided
  let dueDate: string | null = null
  if (args.due_date) {
    const lower = String(args.due_date).toLowerCase().trim()
    const today = new Date(); today.setHours(9, 0, 0, 0)
    if (lower === 'tomorrow') { const d = new Date(today); d.setDate(d.getDate() + 1); dueDate = d.toISOString() }
    else if (/^\d{4}-\d{2}-\d{2}$/.test(String(args.due_date))) { dueDate = String(args.due_date) + 'T09:00:00.000Z' }
    else {
      const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
      const idx  = days.indexOf(lower.replace('next ', ''))
      if (idx >= 0) {
        const d = new Date(today)
        const diff = (idx - d.getDay() + 7) % 7 || 7
        d.setDate(d.getDate() + diff)
        dueDate = d.toISOString()
      }
    }
  }

  const { data, error } = await supabase
    .from('sage_deal_activities')
    .insert({
      workspace_id: ctx.workspaceId,
      deal_id:      dealId,
      type:         'task',
      title:        taskTitle,
      due_at:       dueDate,
      created_by:   ctx.userId,
    })
    .select('id')
    .single()

  if (error || !data) return `Failed to add task: ${error?.message ?? 'unknown error'}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'deal', entity_id: dealId,
    event_type: 'task_created', payload: { title: taskTitle, deal: dealLabel, due_at: dueDate, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Task "${taskTitle}" added to deal "${dealLabel}"${dueDate ? ` — due ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}.`
}

// ── rename_conversation ───────────────────────────────────────────────────────

async function renameConversation(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const newTitle = String(args.new_title ?? '').trim()
  if (!newTitle) return 'Please provide the new conversation title.'

  let convId: string | null = args.conversation_id ? String(args.conversation_id) : null
  let oldTitle = convId ?? ''

  if (!convId) {
    const searchTitle = String(args.conversation_title ?? '').trim()

    // Check if user is asking about an untitled/no-title conversation
    const isUntitled = !searchTitle || /^(no\s*title|untitled|\(no\s*title\)|null|none|-)$/i.test(searchTitle)

    let q = supabase
      .from('conversations')
      .select('id, title')
      .eq('workspace_id', ctx.workspaceId)
      .is('deleted_at', null)
      .order('last_activity_at', { ascending: false })
      .limit(1)

    if (isUntitled) {
      // Find most recent conversation with NULL or empty title
      q = q.or('title.is.null,title.eq.')
    } else {
      q = q.ilike('title', `%${searchTitle}%`)
    }

    const { data } = await q
    const c = data?.[0] as { id: string; title: string | null } | undefined
    if (!c) {
      if (isUntitled) return 'No untitled conversations found.'
      return `No conversation found matching "${searchTitle}".`
    }
    convId   = c.id
    oldTitle = c.title ?? '(no title)'
  }

  const { error } = await supabase
    .from('conversations')
    .update({ title: newTitle })
    .eq('id', convId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to rename conversation: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'conversation', entity_id: convId,
    event_type: 'conversation_renamed', payload: { old_title: oldTitle, new_title: newTitle, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Conversation renamed to "${newTitle}".`
}

// ── update_lead ───────────────────────────────────────────────────────────────

async function updateLead(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const phone   = args.phone   ? String(args.phone).trim()   : null
  const company = args.company ? String(args.company).trim() : null
  const name    = args.name    ? String(args.name).trim()    : null
  const email   = args.email   ? String(args.email).trim()   : null

  if (!phone && !company && !name && !email) return 'Please specify at least one field to update (phone, company, name, or email).'

  // Resolve lead
  let leadId: string | null = args.lead_id ? String(args.lead_id) : null
  if (!leadId) {
    const query = String(args.lead_query ?? '').trim()
    if (!query) return 'Please provide the lead name/email to search for, or the lead_id.'
    const { data } = await supabase
      .from('sage_form_submissions')
      .select('id, fields')
      .eq('workspace_id', ctx.workspaceId)
      .or(`fields->>name.ilike.%${query}%,fields->>email.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(1)
    const lead = data?.[0] as { id: string; fields: Record<string, string> } | undefined
    if (!lead) return `No lead found matching "${query}".`
    leadId = lead.id
  }

  // Fetch current fields
  const { data: current } = await supabase
    .from('sage_form_submissions')
    .select('fields')
    .eq('id', leadId)
    .eq('workspace_id', ctx.workspaceId)
    .single()

  const currentFields = (current as { fields: Record<string, string> } | null)?.fields ?? {}
  const updatedFields = { ...currentFields }
  const changes: string[] = []

  if (phone)   { updatedFields.phone   = phone;   changes.push(`phone → ${phone}`) }
  if (company) { updatedFields.company = company; changes.push(`company → ${company}`) }
  if (name)    { updatedFields.name    = name;    changes.push(`name → ${name}`) }
  if (email)   { updatedFields.email   = email;   changes.push(`email → ${email}`) }

  const { error } = await supabase
    .from('sage_form_submissions')
    .update({ fields: updatedFields })
    .eq('id', leadId)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to update lead: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'lead', entity_id: leadId,
    event_type: 'lead_updated', payload: { changes, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Lead updated: ${changes.join(', ')}.`
}

// ── Lead helpers ─────────────────────────────────────────────────────────────

type FormSubmission = {
  id: string
  fields: Record<string, string>
  ai_priority: string | null
  ai_summary: string | null
  source_platform: string | null
}

async function resolveLeadId(args: Record<string, unknown>, ctx: ToolContext): Promise<{ lead?: FormSubmission; error?: string }> {
  if (args.lead_id) {
    const { data } = await supabase
      .from('sage_form_submissions')
      .select('id, fields, ai_priority, ai_summary, source_platform')
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', String(args.lead_id))
      .limit(1)
    const row = data?.[0] as FormSubmission | undefined
    if (row) return { lead: row }
    return { error: `No lead found with ID "${String(args.lead_id)}".` }
  }

  const query = String(args.lead_query ?? '').trim()
  if (!query) return { error: 'Please provide a lead ID or a name/email to search for.' }

  const { data } = await supabase
    .from('sage_form_submissions')
    .select('id, fields, ai_priority, ai_summary, source_platform')
    .eq('workspace_id', ctx.workspaceId)
    .or(`fields->>name.ilike.%${query}%,fields->>email.ilike.%${query}%,fields->>full_name.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  const row = data?.[0] as FormSubmission | undefined
  if (row) return { lead: row }
  return { error: `No lead found matching "${query}".` }
}

// ── assign_lead ───────────────────────────────────────────────────────────────

async function assignLead(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'assign leads')
  if (denied) return denied

  const assigneeName = String(args.assignee_name ?? '').trim()
  if (!assigneeName) return 'Please provide the assignee name.'

  const resolved = await resolveLeadId(args, ctx)
  if (resolved.error) return resolved.error
  const lead = resolved.lead!

  // Resolve team member
  type MemberRow = { user_id: string; user_profiles: { first_name: string | null; last_name: string | null } | null }
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id, user_profiles(first_name, last_name)')
    .eq('workspace_id', ctx.workspaceId)
    .not('accepted_at', 'is', null)

  const nameLow = assigneeName.toLowerCase()
  const match = (members as unknown as MemberRow[])?.find(m => {
    const p = m.user_profiles
    return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.toLowerCase().includes(nameLow)
  })

  if (!match) {
    const names = (members as unknown as MemberRow[])
      .map(m => `${m.user_profiles?.first_name ?? ''} ${m.user_profiles?.last_name ?? ''}`.trim())
      .filter(Boolean).join(', ')
    return `No team member found matching "${assigneeName}". Team: ${names}`
  }

  const { error } = await supabase
    .from('sage_form_submissions')
    .update({ assigned_to: match.user_id })
    .eq('id', lead.id)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to assign lead: ${error.message}`

  const assigneeFull = `${(match.user_profiles as any)?.first_name ?? ''} ${(match.user_profiles as any)?.last_name ?? ''}`.trim()
  const leadName = lead.fields.name ?? lead.fields.full_name ?? lead.id

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'form', entity_id: lead.id,
    event_type: 'lead_assigned', payload: { lead: leadName, assignee: assigneeFull, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Lead "${leadName}" assigned to ${assigneeFull}.`
}

// ── set_lead_priority ─────────────────────────────────────────────────────────

async function setLeadPriority(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const priority = String(args.priority ?? '').trim().toLowerCase()
  if (!['high', 'medium', 'low'].includes(priority)) return 'Priority must be high, medium, or low.'

  const resolved = await resolveLeadId(args, ctx)
  if (resolved.error) return resolved.error
  const lead = resolved.lead!

  const { error } = await supabase
    .from('sage_form_submissions')
    .update({ ai_priority: priority })
    .eq('id', lead.id)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to update priority: ${error.message}`

  const leadName = lead.fields.name ?? lead.fields.full_name ?? lead.id
  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'form', entity_id: lead.id,
    event_type: 'lead_priority_set', payload: { lead: leadName, priority, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Lead "${leadName}" priority set to ${priority}.`
}

// ── create_ticket_from_lead ───────────────────────────────────────────────────

async function createTicketFromLead(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const resolved = await resolveLeadId(args, ctx)
  if (resolved.error) return resolved.error
  const lead = resolved.lead!

  const f        = lead.fields
  const name     = f.name ?? f.full_name ?? f.first_name ?? 'Unknown'
  const email    = f.email ?? null
  const phone    = f.phone ?? null
  const priority = args.priority ? String(args.priority) : (lead.ai_priority ?? 'medium')
  const title    = args.title ? String(args.title).trim()
    : (lead.ai_summary ? lead.ai_summary.slice(0, 80) : `Enquiry from ${name}`)

  const { data: ticket, error } = await supabase
    .from('sage_tickets')
    .insert({
      workspace_id:  ctx.workspaceId,
      title,
      description:   lead.ai_summary ?? null,
      priority,
      status:        'open',
      name,
      email,
      phone,
      assigned_to:   ctx.userId,
    })
    .select('id')
    .single()

  if (error || !ticket) return `Failed to create ticket: ${error?.message ?? 'unknown error'}`

  // Mark form submission as actioned
  void supabase.from('sage_form_submissions')
    .update({ action_type: 'ticket', actioned_at: new Date().toISOString() })
    .eq('id', lead.id).eq('workspace_id', ctx.workspaceId)

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'ticket', entity_id: (ticket as { id: string }).id,
    event_type: 'ticket_created', payload: { title, from_lead: lead.id, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Ticket "${title}" created from the lead (${priority} priority).`
}

// ── create_deal_from_lead ─────────────────────────────────────────────────────

async function createDealFromLead(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'create deals')
  if (denied) return denied

  const resolved = await resolveLeadId(args, ctx)
  if (resolved.error) return resolved.error
  const lead = resolved.lead!

  const f       = lead.fields
  const name    = f.name ?? f.full_name ?? f.first_name ?? 'Unknown'
  const email   = f.email?.toLowerCase() ?? null
  const phone   = f.phone ?? null
  const company = f.company ?? f.company_name ?? null

  // Get first available pipeline
  const { data: pipelines } = await supabase
    .from('sage_pipelines')
    .select('id, name')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at')
    .limit(1)

  const pipeline = pipelines?.[0] as { id: string; name: string } | undefined
  if (!pipeline) return 'No pipeline found in this workspace. Please create a pipeline first.'

  // Get first stage of that pipeline
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name')
    .eq('pipeline_id', pipeline.id)
    .order('order_index')
    .limit(1)

  const stage = stages?.[0] as { id: string; name: string } | undefined

  // Find or create contact
  let contactId: string | null = null
  if (email) {
    const { data: existing } = await supabase.from('sage_contacts').select('id')
      .eq('workspace_id', ctx.workspaceId).ilike('email', email).limit(1).maybeSingle()
    if (existing) contactId = (existing as { id: string }).id
  }
  if (!contactId) {
    const { data: existing } = await supabase.from('sage_contacts').select('id')
      .eq('workspace_id', ctx.workspaceId).ilike('name', name).limit(1).maybeSingle()
    if (existing) contactId = (existing as { id: string }).id
  }
  if (!contactId) {
    const { data: created, error: cErr } = await supabase.from('sage_contacts').insert({
      workspace_id: ctx.workspaceId, name, email, phone, company_name: company,
      source: 'form', contact_type: 'potential_customer', tags: [],
    }).select('id').single()
    if (cErr || !created) return `Failed to create contact: ${cErr?.message ?? 'unknown error'}`
    contactId = (created as { id: string }).id
  }

  // Create deal
  const { data: deal, error: dErr } = await supabase.from('sage_deals').insert({
    workspace_id:     ctx.workspaceId,
    title:            name,
    contact_id:       contactId,
    pipeline_id:      pipeline.id,
    stage_id:         stage?.id ?? null,
    status:           'open',
    owner_id:         ctx.userId,
  }).select('id').single()

  if (dErr || !deal) return `Failed to create deal: ${dErr?.message ?? 'unknown error'}`

  // Mark form submission as actioned
  void supabase.from('sage_form_submissions')
    .update({ action_type: 'lead', actioned_at: new Date().toISOString() })
    .eq('id', lead.id).eq('workspace_id', ctx.workspaceId)

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'deal', entity_id: (deal as { id: string }).id,
    event_type: 'deal_created', payload: { title: name, pipeline: pipeline.name, from_lead: lead.id, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Contact and deal created for "${name}" in the "${pipeline.name}" pipeline.`
}

// ── delete_lead ───────────────────────────────────────────────────────────────

async function deleteLead(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const denied = requireManagerOrAbove(ctx, 'delete leads')
  if (denied) return denied

  const resolved = await resolveLeadId(args, ctx)
  if (resolved.error) return resolved.error
  const lead = resolved.lead!

  const leadName = lead.fields.name ?? lead.fields.full_name ?? lead.id

  const { error } = await supabase
    .from('sage_form_submissions')
    .update({ action_type: 'ignored', actioned_at: new Date().toISOString() })
    .eq('id', lead.id)
    .eq('workspace_id', ctx.workspaceId)

  if (error) return `Failed to delete lead: ${error.message}`

  void supabase.from('sage_activity_log').insert({
    workspace_id: ctx.workspaceId, entity_type: 'form', entity_id: lead.id,
    event_type: 'lead_deleted', payload: { lead: leadName, by: ctx.userName, source: 'voice' }, user_id: ctx.userId,
  })
  return `✅ Lead "${leadName}" removed.`
}

// ── Main router ─────────────────────────────────────────────────────────────

export async function routeToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx:  ToolContext,
): Promise<string> {
  try {
    switch (name) {
      case 'get_today_plate':
        return await getEnhancedOverview(ctx)

      case 'get_workspace_stats':
        return await getWorkspaceStats(ctx)

      case 'navigate_to':
        return `Navigating to ${String(args.path ?? '/')}.`

      case 'list_deals':
        return await listDeals(args, ctx)

      case 'list_tickets':
        return await listTickets(args, ctx)

      case 'list_projects':
        return await listProjects(args, ctx)

      case 'list_reminders':
        return await listReminders(args, ctx)

      case 'find_contact':
        return await findContactVoice(args, ctx)

      case 'create_reminder':
        return await sageSetReminder(
          ctx.workspaceId,
          String(args.title ?? ''),
          String(args.due_date ?? ''),
          args.deal_title ? String(args.deal_title) : undefined,
        )

      case 'snooze_reminder':
        return await snoozeReminder(args, ctx)

      case 'assign_deal':
        // Support entity_id from focusedEntity context (skip name search)
        if (args.deal_id && !args.deal_name) args = { ...args, deal_name: `id:${String(args.deal_id)}` }
        return await assignDeal(args, ctx)

      case 'move_deal_stage':
        // Support entity_id from focusedEntity context
        if (args.deal_id && !args.deal_name) {
          return await sageMoveDeal(ctx.workspaceId, `id:${String(args.deal_id)}`, String(args.stage_name ?? ''))
        }
        return await sageMoveDeal(
          ctx.workspaceId,
          String(args.deal_name ?? ''),
          String(args.stage_name ?? ''),
        )

      case 'update_contact':
        return await updateContact(args, ctx)

      case 'update_ticket':
        return await updateTicket(args, ctx)

      case 'add_note':
        return await addNote(args, ctx)

      case 'create_ticket':
        return await createTicket(args, ctx)

      case 'create_deal':
        return await sageCreateLead(ctx.workspaceId, {
          name:      String(args.name ?? ''),
          email:     args.email      ? String(args.email)      : null,
          phone:     args.phone      ? String(args.phone)      : null,
          company:   args.company    ? String(args.company)    : null,
          dealTitle: args.deal_title ? String(args.deal_title) : null,
          notes:     args.notes      ? String(args.notes)      : null,
          source:    'voice',
        })

      case 'open_deal':
        // Navigation handled in session-manager; just confirm here
        return `Opening deal "${String(args.deal_name ?? String(args.deal_id ?? ''))}" on the pipeline board.`

      case 'create_project_from_won_deal':
        return await createProjectFromWonDeal(args, ctx)

      case 'list_emails':
        return await listEmails(args, ctx)

      case 'read_email':
        return await readEmail(args, ctx)

      case 'reply_to_email':
        return await replyToEmail(args, ctx)

      case 'ignore_email':
        return await ignoreEmail(args, ctx)

      case 'set_email_priority':
        return await setEmailPriority(args, ctx)

      case 'assign_email':
        return await assignEmail(args, ctx)

      case 'delete_email':
        return await deleteEmail(args, ctx)

      case 'open_email':
        // Navigation handled in session-manager
        return `Opening email "${String(args.email_id ?? '')}".`

      case 'open_feed_item':
        // Navigation/popup handled in session-manager before this call
        return `Opening ${String(args.kind ?? 'item')} "${String(args.query ?? args.item_id ?? '')}".`

      case 'open_pipeline':
        return await openPipeline(args, ctx)

      case 'list_tasks':
        return await listTasks(args, ctx)

      case 'complete_task':
        return await completeTask(args, ctx)

      case 'add_deal_task':
        return await addDealTask(args, ctx)

      case 'rename_conversation':
        return await renameConversation(args, ctx)

      case 'filter_activity_feed':
        // Navigation handled in session-manager
        return `Filtering activity feed to show ${String(args.filter ?? 'all')}.`

      case 'update_lead':
        return await updateLead(args, ctx)

      case 'assign_lead':
        return await assignLead(args, ctx)

      case 'set_lead_priority':
        return await setLeadPriority(args, ctx)

      case 'create_ticket_from_lead':
        return await createTicketFromLead(args, ctx)

      case 'create_deal_from_lead':
        return await createDealFromLead(args, ctx)

      case 'delete_lead':
        return await deleteLead(args, ctx)

      default:
        return `Unknown tool: ${name}`
    }
  } catch (err) {
    console.error(`[tool-router] ${name} error:`, err)
    return `An error occurred while executing ${name}. Please try again.`
  }
}
