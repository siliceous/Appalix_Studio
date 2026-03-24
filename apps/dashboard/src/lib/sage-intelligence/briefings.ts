import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import type { SageAccessScope, SageBriefing, BriefingSection } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchBriefingData(scope: SageAccessScope, period: 'day' | 'week') {
  const admin = createAdminClient()
  const { workspaceId, assignedToFilter } = scope
  const now = new Date()
  const from = new Date(now)
  if (period === 'day') {
    from.setHours(0, 0, 0, 0)
  } else {
    from.setDate(from.getDate() - 7)
  }
  const fromISO = from.toISOString()

  const [dealsRes, contactsRes, ticketsRes, emailsRes, remindersRes] = await Promise.all([
    (() => {
      let q = admin
        .from('sage_deals')
        .select('id, title, status, value, stage_id, owner_id, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', fromISO)
      if (assignedToFilter) q = q.in('owner_id', assignedToFilter)
      return q
    })(),
    (() => {
      let q = admin
        .from('sage_contacts')
        .select('id, name, email, company_name, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', fromISO)
      if (assignedToFilter) q = q.in('assigned_to', assignedToFilter)
      return q
    })(),
    (() => {
      let q = admin
        .from('sage_tickets')
        .select('id, title, status, priority, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', fromISO)
      if (assignedToFilter) q = q.in('assigned_to', assignedToFilter)
      return q
    })(),
    (() => {
      let q = admin
        .from('sage_emails')
        .select('id, subject, from_address, ai_priority, received_at')
        .eq('workspace_id', workspaceId)
        .eq('direction', 'inbound')
        .eq('is_read', false)
      if (assignedToFilter) q = q.in('assigned_to', assignedToFilter)
      return q.limit(20)
    })(),
    (() => {
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      return admin
        .from('sage_reminders')
        .select('id, title, due_at, deal_id')
        .eq('workspace_id', workspaceId)
        .eq('is_sent', false)
        .lte('due_at', endOfDay.toISOString())
        .order('due_at', { ascending: true })
        .limit(10)
    })(),
  ])

  return {
    newDeals:     (dealsRes.data     ?? []) as Array<Record<string, unknown>>,
    newContacts:  (contactsRes.data  ?? []) as Array<Record<string, unknown>>,
    newTickets:   (ticketsRes.data   ?? []) as Array<Record<string, unknown>>,
    unreadEmails: (emailsRes.data    ?? []) as Array<Record<string, unknown>>,
    reminders:    (remindersRes.data ?? []) as Array<Record<string, unknown>>,
  }
}

export async function generateDailyBriefing(
  scope:    SageAccessScope,
  wsName:   string,
  userName: string,
): Promise<SageBriefing> {
  // Check cache
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data: cached } = await admin
    .from('sage_briefings')
    .select('*')
    .eq('workspace_id', scope.workspaceId)
    .eq('user_id', scope.userId)
    .eq('briefing_type', 'daily')
    .eq('briefing_date', today)
    .single()

  if (cached) {
    const c = cached as Record<string, unknown>
    return {
      type:        'daily',
      date:        today,
      content:     c.content     as string,
      sections:    c.sections    as BriefingSection[],
      stats:       c.stats       as Record<string, number | string>,
      generatedAt: c.generated_at as string,
    }
  }

  const data = await fetchBriefingData(scope, 'day')
  const stats: Record<string, number> = {
    newDeals:     data.newDeals.length,
    newContacts:  data.newContacts.length,
    openTickets:  data.newTickets.filter(t => t.status === 'open').length,
    unreadEmails: data.unreadEmails.length,
    reminders:    data.reminders.length,
  }

  const dataStr = `
New deals today: ${data.newDeals.length}
${data.newDeals.slice(0, 5).map((d) => `  - ${d.title} [${d.status}]`).join('\n')}

New contacts today: ${data.newContacts.length}
${data.newContacts.slice(0, 5).map((c) => `  - ${c.name} <${c.email ?? ''}>`).join('\n')}

New tickets: ${data.newTickets.length}
${data.newTickets.slice(0, 3).map((t) => `  - ${t.title} [${t.priority}]`).join('\n')}

Unread high-priority emails: ${data.unreadEmails.filter(e => e.ai_priority === 'high').length}

Upcoming reminders today (${data.reminders.length}):
${data.reminders.slice(0, 5).map((r) => `  - ${r.title} @ ${r.due_at}`).join('\n')}
`

  const prompt = `You are Sage, the AI copilot for ${wsName}. Generate a concise daily briefing for ${userName}.

Data for today:
${dataStr}

Write a short (150-200 word) daily briefing covering:
1. Key highlights (what happened)
2. What needs attention (tickets, emails)
3. What's coming up (reminders)

Be warm, concise, and action-oriented. Use bullet points.`

  let content = ''
  try {
    const r = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })
    content = r.content[0]?.type === 'text' ? r.content[0].text : ''
  } catch {
    content = `Good morning, ${userName}! Here's your daily summary:\n\n• ${data.newDeals.length} new deal(s) today\n• ${data.newContacts.length} new contact(s)\n• ${data.unreadEmails.length} unread email(s)\n• ${data.reminders.length} reminder(s) due today`
  }

  const sections: BriefingSection[] = [
    {
      title: "Today's Deals",
      items: data.newDeals.slice(0, 5).map(d => `${d.title} — ${d.status}`),
      icon:  'deal',
    },
    {
      title: 'New Contacts',
      items: data.newContacts.slice(0, 5).map(c => c.name as string),
      icon:  'contact',
    },
    {
      title: 'Open Tickets',
      items: data.newTickets
        .filter(t => t.status === 'open')
        .slice(0, 3)
        .map(t => `${t.title} [${t.priority}]`),
      icon: 'ticket',
    },
    {
      title: 'Reminders',
      items: data.reminders.slice(0, 5).map(r => `${r.title}`),
      icon:  'reminder',
    },
  ].filter(s => s.items.length > 0)

  await admin.from('sage_briefings').upsert(
    {
      workspace_id:  scope.workspaceId,
      user_id:       scope.userId,
      briefing_type: 'daily',
      briefing_date: today,
      content,
      sections,
      stats,
      generated_at:  new Date().toISOString(),
    },
    { onConflict: 'workspace_id,user_id,briefing_type,briefing_date' },
  )

  return {
    type:        'daily',
    date:        today,
    content,
    sections,
    stats,
    generatedAt: new Date().toISOString(),
  }
}

export async function generateWeeklyBriefing(
  scope:    SageAccessScope,
  wsName:   string,
  userName: string,
): Promise<SageBriefing> {
  const admin = createAdminClient()
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekDate = weekStart.toISOString().slice(0, 10)

  const { data: cached } = await admin
    .from('sage_briefings')
    .select('*')
    .eq('workspace_id', scope.workspaceId)
    .eq('user_id', scope.userId)
    .eq('briefing_type', 'weekly')
    .eq('briefing_date', weekDate)
    .single()

  if (cached) {
    const c = cached as Record<string, unknown>
    return {
      type:        'weekly',
      date:        weekDate,
      content:     c.content      as string,
      sections:    c.sections     as BriefingSection[],
      stats:       c.stats        as Record<string, number | string>,
      generatedAt: c.generated_at as string,
    }
  }

  const data = await fetchBriefingData(scope, 'week')
  const stats: Record<string, number> = {
    newDeals:        data.newDeals.length,
    wonDeals:        data.newDeals.filter(d => d.status === 'won').length,
    newContacts:     data.newContacts.length,
    resolvedTickets: data.newTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    unreadEmails:    data.unreadEmails.length,
  }

  let content = `Weekly summary for ${wsName}:\n\n• ${data.newDeals.length} deals this week (${stats.wonDeals} won)\n• ${data.newContacts.length} new contacts\n• ${stats.resolvedTickets} tickets resolved\n• ${data.unreadEmails.length} unread emails`

  try {
    const r = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role:    'user',
        content: `Generate a weekly briefing for ${userName} at ${wsName}.\n\nStats: ${JSON.stringify(stats)}\nDeals: ${data.newDeals.slice(0, 5).map(d => d.title).join(', ')}\n\nBe concise (150-200 words), highlight wins, flag risks, suggest priorities for next week.`,
      }],
    })
    content = r.content[0]?.type === 'text' ? r.content[0].text : content
  } catch { /* use fallback */ }

  const sections: BriefingSection[] = [
    {
      title: 'Deals This Week',
      items: data.newDeals.slice(0, 5).map(d => `${d.title} — ${d.status}`),
      icon:  'deal',
    },
    {
      title: 'New Contacts',
      items: data.newContacts.slice(0, 5).map(c => c.name as string),
      icon:  'contact',
    },
    {
      title: 'Tickets',
      items: data.newTickets
        .slice(0, 5)
        .map(t => `${t.title} [${t.priority} · ${t.status}]`),
      icon: 'ticket',
    },
  ].filter(s => s.items.length > 0)

  await admin.from('sage_briefings').upsert(
    {
      workspace_id:  scope.workspaceId,
      user_id:       scope.userId,
      briefing_type: 'weekly',
      briefing_date: weekDate,
      content,
      sections,
      stats,
      generated_at:  new Date().toISOString(),
    },
    { onConflict: 'workspace_id,user_id,briefing_type,briefing_date' },
  )

  return {
    type:        'weekly',
    date:        weekDate,
    content,
    sections,
    stats,
    generatedAt: new Date().toISOString(),
  }
}
