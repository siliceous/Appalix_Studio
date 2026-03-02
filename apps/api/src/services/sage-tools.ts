/**
 * Sage CRM Agent Tools
 *
 * Implementations for the 7 Sage tools that let the AI bot read
 * and write the live CRM data on behalf of the workspace subscriber.
 *
 * All functions return plain strings — these become the tool_result
 * passed back to Claude in the agentic loop.
 */
import { supabase } from '../lib/supabase.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface DealRow {
  id:         string
  title:      string
  pipeline_id: string | null
  stage_id:   string | null
  status:     string
  value:      number | null
  currency:   string
  priority:   string | null
  close_date: string | null
  company_name: string | null
}

async function findDeal(workspaceId: string, hint: string): Promise<DealRow | string> {
  const { data } = await supabase
    .from('sage_deals')
    .select('id, title, pipeline_id, stage_id, status, value, currency, priority, close_date, company_name')
    .eq('workspace_id', workspaceId)
    .ilike('title', `%${hint}%`)
    .limit(3)

  if (!data || data.length === 0) {
    return `No deal found matching "${hint}". Try using a more specific name.`
  }
  return data[0] as DealRow
}

async function findStageInPipeline(pipelineId: string, hint: string): Promise<{ id: string; name: string } | string> {
  const { data } = await supabase
    .from('sage_pipeline_stages')
    .select('id, name')
    .eq('pipeline_id', pipelineId)
    .ilike('name', `%${hint}%`)
    .limit(1)

  if (!data || data.length === 0) {
    // Return all stage names so Claude can suggest the right one
    const { data: allStages } = await supabase
      .from('sage_pipeline_stages')
      .select('name')
      .eq('pipeline_id', pipelineId)
      .order('position')
    const names = (allStages ?? []).map(s => s.name).join(', ')
    return `Stage "${hint}" not found. Available stages: ${names}`
  }
  return data[0] as { id: string; name: string }
}

/**
 * Parse a natural-language date string into a Date object.
 * Handles: ISO dates, day-of-week names ("Friday", "next Monday"), "tomorrow".
 */
function parseDueDate(str: string): Date | null {
  const s = str.trim()

  // ISO / standard date
  const direct = new Date(s)
  if (!isNaN(direct.getTime())) return direct

  const now = new Date()
  const today = now.getDay() // 0=Sun

  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const lower = s.toLowerCase().replace(/^next\s+/, '')

  if (lower === 'tomorrow') {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  }

  const targetIdx = dayNames.indexOf(lower)
  if (targetIdx !== -1) {
    const diff = (targetIdx - today + 7) % 7 || 7  // always future
    const d = new Date(now)
    d.setDate(d.getDate() + diff)
    d.setHours(9, 0, 0, 0)
    return d
  }

  return null
}

function formatDeal(d: DealRow): string {
  const parts: string[] = [`"${d.title}"`]
  if (d.status)     parts.push(`status: ${d.status}`)
  if (d.priority)   parts.push(`priority: ${d.priority}`)
  if (d.value)      parts.push(`value: ${d.value} ${d.currency}`)
  if (d.close_date) parts.push(`closes: ${d.close_date}`)
  if (d.company_name) parts.push(`company: ${d.company_name}`)
  return parts.join(' | ')
}

// ---------------------------------------------------------------------------
// 1. sage_get_overview
// ---------------------------------------------------------------------------

export async function sageGetOverview(workspaceId: string): Promise<string> {
  const now  = new Date()
  const today = now.toISOString().split('T')[0]
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const [
    { data: highPriority },
    { data: closingSoon },
    { data: reminders },
  ] = await Promise.all([
    supabase
      .from('sage_deals')
      .select('id, title, stage_id, status, value, currency, priority, close_date, company_name, pipeline_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .eq('priority', 'high')
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('sage_deals')
      .select('id, title, stage_id, status, value, currency, priority, close_date, company_name, pipeline_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .lte('close_date', weekEndStr)
      .gte('close_date', today)
      .order('close_date')
      .limit(10),

    supabase
      .from('sage_reminders')
      .select('id, title, note, due_at, deal_id')
      .eq('workspace_id', workspaceId)
      .eq('is_sent', false)
      .lte('due_at', weekEnd.toISOString())
      .order('due_at')
      .limit(10),
  ])

  const lines: string[] = []

  if (reminders && reminders.length > 0) {
    lines.push('📅 **Reminders due soon:**')
    for (const r of reminders) {
      const dueDate = new Date(r.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const overdue = new Date(r.due_at) < now ? ' ⚠️ OVERDUE' : ''
      lines.push(`  - ${r.title} (due ${dueDate}${overdue})${r.note ? ': ' + r.note : ''}`)
    }
  }

  if (closingSoon && closingSoon.length > 0) {
    lines.push('⏰ **Deals closing this week:**')
    for (const d of closingSoon as DealRow[]) {
      lines.push(`  - ${formatDeal(d)}`)
    }
  }

  if (highPriority && highPriority.length > 0) {
    lines.push('🔴 **High-priority open deals:**')
    for (const d of highPriority as DealRow[]) {
      lines.push(`  - ${formatDeal(d)}`)
    }
  }

  if (lines.length === 0) {
    return 'No high-priority deals, upcoming close dates, or pending reminders found. Your pipeline is looking clear!'
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// 2. sage_search_deals
// ---------------------------------------------------------------------------

export async function sageSearchDeals(
  workspaceId: string,
  query?:    string,
  stage?:    string,
  status?:   string,
  priority?: string,
): Promise<string> {
  let q = supabase
    .from('sage_deals')
    .select('id, title, stage_id, status, value, currency, priority, close_date, company_name, pipeline_id, stage:sage_pipeline_stages(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (query?.trim())    q = q.ilike('title', `%${query.trim()}%`)
  if (status?.trim())   q = q.eq('status', status.trim())
  if (priority?.trim()) q = q.eq('priority', priority.trim())

  const { data, error } = await q

  if (error) return `Error searching deals: ${error.message}`
  if (!data || data.length === 0) return `No deals found${query ? ` matching "${query}"` : ''}.`

  let rows = data as (DealRow & { stage: { name: string } | null })[]

  // Stage filter — done in JS since it's a join
  if (stage?.trim()) {
    const stageLower = stage.trim().toLowerCase()
    rows = rows.filter(d => d.stage?.name?.toLowerCase().includes(stageLower))
    if (rows.length === 0) return `No deals found in stage "${stage}".`
  }

  return rows.map(d => {
    const stageName = d.stage?.name ?? 'Unknown stage'
    return `• "${d.title}" — stage: ${stageName} | ${d.status} | priority: ${d.priority ?? 'none'} | value: ${d.value ? d.value + ' ' + d.currency : 'none'} | close: ${d.close_date ?? 'not set'}`
  }).join('\n')
}

// ---------------------------------------------------------------------------
// 3. sage_move_deal
// ---------------------------------------------------------------------------

export async function sageMoveDeal(
  workspaceId: string,
  dealTitle:   string,
  toStage:     string,
): Promise<string> {
  const deal = await findDeal(workspaceId, dealTitle)
  if (typeof deal === 'string') return deal

  if (!deal.pipeline_id) return `Deal "${deal.title}" is not attached to a pipeline.`

  const stage = await findStageInPipeline(deal.pipeline_id, toStage)
  if (typeof stage === 'string') return stage

  const { error } = await supabase
    .from('sage_deals')
    .update({ stage_id: stage.id, updated_at: new Date().toISOString() })
    .eq('id', deal.id)
    .eq('workspace_id', workspaceId)

  if (error) return `Failed to move deal: ${error.message}`

  await supabase.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'deal',
    entity_id:    deal.id,
    event_type:   'stage_changed',
    payload:      { from_stage_id: deal.stage_id, to_stage: stage.name, title: deal.title },
    user_id:      null,
  })

  return `✅ Moved "${deal.title}" to stage "${stage.name}". The kanban board is updated.`
}

// ---------------------------------------------------------------------------
// 4. sage_update_deal
// ---------------------------------------------------------------------------

export async function sageUpdateDeal(
  workspaceId: string,
  dealTitle:   string,
  patch: {
    status?:         string
    close_date?:     string
    priority?:       string
    win_percentage?: number
    description?:    string
  },
): Promise<string> {
  const deal = await findDeal(workspaceId, dealTitle)
  if (typeof deal === 'string') return deal

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const changes: string[] = []

  if (patch.status) {
    update.status = patch.status
    changes.push(`status → ${patch.status}`)
  }
  if (patch.close_date) {
    const parsed = parseDueDate(patch.close_date)
    if (!parsed) return `Could not parse date "${patch.close_date}". Try a format like "2026-03-14" or "Friday".`
    update.close_date = parsed.toISOString().split('T')[0]
    changes.push(`close date → ${update.close_date}`)
  }
  if (patch.priority) {
    update.priority = patch.priority
    changes.push(`priority → ${patch.priority}`)
  }
  if (patch.win_percentage !== undefined) {
    update.win_percentage = patch.win_percentage
    changes.push(`win % → ${patch.win_percentage}%`)
  }
  if (patch.description) {
    update.description = patch.description
    changes.push(`description updated`)
  }

  if (changes.length === 0) return 'No changes specified.'

  const { error } = await supabase
    .from('sage_deals')
    .update(update)
    .eq('id', deal.id)
    .eq('workspace_id', workspaceId)

  if (error) return `Failed to update deal: ${error.message}`

  await supabase.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'deal',
    entity_id:    deal.id,
    event_type:   'deal_updated',
    payload:      { title: deal.title, changes: update },
    user_id:      null,
  })

  return `✅ Updated "${deal.title}": ${changes.join(', ')}.`
}

// ---------------------------------------------------------------------------
// 5. sage_log_note
// ---------------------------------------------------------------------------

export async function sageLogNote(
  workspaceId: string,
  dealTitle:   string,
  note:        string,
): Promise<string> {
  const deal = await findDeal(workspaceId, dealTitle)
  if (typeof deal === 'string') return deal

  const { error } = await supabase.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'deal',
    entity_id:    deal.id,
    event_type:   'note_added',
    payload:      { title: deal.title, note },
    user_id:      null,
  })

  if (error) return `Failed to log note: ${error.message}`
  return `✅ Note logged on "${deal.title}": "${note}"`
}

// ---------------------------------------------------------------------------
// 6. sage_set_reminder
// ---------------------------------------------------------------------------

export async function sageSetReminder(
  workspaceId: string,
  title:       string,
  dueDateStr:  string,
  dealTitle?:  string,
): Promise<string> {
  const dueDate = parseDueDate(dueDateStr)
  if (!dueDate) {
    return `Could not parse due date "${dueDateStr}". Try "Friday", "next Monday", or "2026-03-14".`
  }

  let dealId: string | null = null

  if (dealTitle?.trim()) {
    const deal = await findDeal(workspaceId, dealTitle)
    if (typeof deal !== 'string') dealId = deal.id
  }

  const { error } = await supabase.from('sage_reminders').insert({
    workspace_id: workspaceId,
    deal_id:      dealId,
    title,
    due_at:       dueDate.toISOString(),
  })

  if (error) return `Failed to set reminder: ${error.message}`

  const readableDate = dueDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return `✅ Reminder set: "${title}" on ${readableDate}.${dealId ? ` Linked to deal.` : ''}`
}

// ---------------------------------------------------------------------------
// 7. sage_search_contacts
// ---------------------------------------------------------------------------

export async function sageSearchContacts(
  workspaceId: string,
  query:       string,
): Promise<string> {
  const { data, error } = await supabase
    .from('sage_contacts')
    .select('id, name, email, phone, company_name, source, tags')
    .eq('workspace_id', workspaceId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name')
    .limit(10)

  if (error) return `Error searching contacts: ${error.message}`
  if (!data || data.length === 0) return `No contacts found matching "${query}".`

  return (data as { name: string; email: string | null; phone: string | null; company_name: string | null; source: string; tags: string[] }[])
    .map(c => {
      const parts = [`• ${c.name}`]
      if (c.email)        parts.push(c.email)
      if (c.phone)        parts.push(c.phone)
      if (c.company_name) parts.push(c.company_name)
      if (c.source !== 'manual') parts.push(`via ${c.source}`)
      return parts.join(' | ')
    })
    .join('\n')
}
