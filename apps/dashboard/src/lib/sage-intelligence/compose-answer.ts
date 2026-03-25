import Anthropic from '@anthropic-ai/sdk'
import type { RetrievedContext, SageQueryClassification } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function formatContext(ctx: RetrievedContext): string {
  const parts: string[] = []

  if (ctx.stats) {
    const { noEntriesForPeriod, ...otherStats } = ctx.stats
    if (noEntriesForPeriod) {
      parts.push('## Note\nNo entries found for the requested period. Showing most recent records instead.')
    }
    if (Object.keys(otherStats).length > 0) {
      parts.push('## Stats\n' + JSON.stringify(otherStats, null, 2))
    }
  }
  if (ctx.contacts?.length) {
    parts.push(
      '## Contacts (' + ctx.contacts.length + ')\n' +
      ctx.contacts
        .map(c => `- ${c.label}${c.summary ? ': ' + c.summary : ''}`)
        .join('\n'),
    )
  }
  if (ctx.deals?.length) {
    parts.push(
      '## Deals (' + ctx.deals.length + ')\n' +
      ctx.deals
        .map(d => {
          const m = d.metadata as Record<string, unknown>
          return `- ${d.label} [${m.status ?? ''}${m.priority ? ' · ' + m.priority : ''}${m.value ? ' · $' + m.value : ''}]`
        })
        .join('\n'),
    )
  }
  if (ctx.tickets?.length) {
    parts.push(
      '## Tickets (' + ctx.tickets.length + ')\n' +
      ctx.tickets
        .map(t => {
          const m = t.metadata as Record<string, unknown>
          return `- ${t.label} [${m.status ?? ''} · ${m.priority ?? ''}]${t.summary ? ': ' + t.summary : ''}`
        })
        .join('\n'),
    )
  }
  if (ctx.emails?.length) {
    parts.push(
      '## Emails (' + ctx.emails.length + ')\n' +
      ctx.emails
        .map(e => {
          const m = e.metadata as Record<string, unknown>
          return `- ${e.label} [${m.ai_priority ?? ''}]${e.summary ? ': ' + e.summary : ''}`
        })
        .join('\n'),
    )
  }
  if (ctx.forms?.length) {
    parts.push(
      '## Form Submissions (' + ctx.forms.length + ')\n' +
      ctx.forms
        .map(f => {
          const m = f.metadata as Record<string, unknown>
          return `- ${f.label} [${m.ai_priority ?? ''}${m.actioned_at ? ' · actioned' : ' · new'}]${f.summary ? ': ' + f.summary : ''}`
        })
        .join('\n'),
    )
  }
  if (ctx.conversations?.length) {
    parts.push(
      '## Conversations (' + ctx.conversations.length + ')\n' +
      ctx.conversations
        .map(c => `- ${c.label}${c.summary ? ': ' + c.summary : ''}`)
        .join('\n'),
    )
  }
  if (ctx.reminders?.length) {
    parts.push(
      '## Reminders\n' +
      ctx.reminders
        .map(r => {
          const m = r.metadata as Record<string, unknown>
          return `- ${r.label} — due ${m.due_at}`
        })
        .join('\n'),
    )
  }
  if (ctx.semanticHits?.length) {
    parts.push(
      '## Related Records (semantic)\n' +
      ctx.semanticHits
        .map(h => `- [${h.entityType}] ${h.content.slice(0, 150)}`)
        .join('\n'),
    )
  }

  return parts.join('\n\n') || '(no data retrieved)'
}

export async function composeSageAnswer(
  query:         string,
  classification: SageQueryClassification,
  context:       RetrievedContext,
  pageContext:   string,
  workspaceName: string,
  userName:      string,
): Promise<{ reply: string; followUps: string[] }> {
  const dataStr = formatContext(context)

  const system = `You are Sage, an AI copilot for ${workspaceName}. You are helping ${userName}.
Be concise, friendly, and actionable. Format with short bullets when listing items.
Always be specific — use names, numbers, statuses from the data. Never make up data not provided.
If data is empty or a "noEntriesForPeriod" stat is present, acknowledge no new entries for the requested period, then show the most recent records from the data as a helpful activity overview (do NOT say there is no data if records are present).
Opening context: when you have data for forms/emails/bots/tickets, you are already opening that section for the user — say "Opening your [section] — " before summarising.
Today: ${new Date().toISOString().slice(0, 10)}`

  const userMsg = `User is on: ${pageContext}
User query: ${query}

Retrieved data:
${dataStr}`

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: userMsg }],
    })

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : 'No response.'
    const followUps = generateFollowUps(classification, context)

    return { reply, followUps }
  } catch {
    return {
      reply:    'I had trouble retrieving that data. Please try again.',
      followUps: [],
    }
  }
}

function generateFollowUps(cls: SageQueryClassification, context?: RetrievedContext): string[] {
  // Build item-specific follow-ups from actual context records.
  // These align with the numbered list the AI will render, so "1" → details on item 1.
  const itemFollowUps = buildItemFollowUps(cls.category, context)
  if (itemFollowUps.length >= 2) return itemFollowUps.slice(0, 9)

  // Fallback generic suggestions when there aren't enough items
  const map: Record<string, string[]> = {
    contacts:      ['Show high-priority contacts', 'Find contacts without a deal', 'Show recently added contacts'],
    deals:         ['Show deals closing this week', 'Show stale deals', 'Which deals are high priority?'],
    tickets:       ['Show open urgent tickets', 'Show unassigned tickets', 'How many tickets were resolved this week?'],
    emails:        ['Show high-priority emails', 'Which emails need a reply?', 'Show emails from this week'],
    analytics:     ['How many deals were won this month?', 'Show pipeline breakdown', 'How is my team performing?'],
    pipeline:      ['Show deals by stage', 'Which pipeline has the most value?', 'Show won deals this month'],
    reminders:     ['Show overdue reminders', 'What is due today?', 'Show all upcoming tasks'],
    activities:    ['Show overdue reminders', 'Show open tickets', 'What did I work on this week?'],
    general:       ['Show my open deals', 'Show overdue reminders', 'How many contacts do I have?'],
    conversations: ['Show unanalysed conversations', 'Which conversations have hot leads?'],
    forms:         ['Show new form submissions', 'Show high-priority form entries', 'Show actioned form submissions'],
  }
  return map[cls.category] ?? ['Show my open deals', 'Show overdue reminders', "What's new this week?"]
}

/**
 * Build numbered follow-up queries that correspond 1:1 with the items Sage
 * will list in its reply. Typing "1" will query details on the first record.
 */
function buildItemFollowUps(category: string, context?: RetrievedContext): string[] {
  if (!context) return []

  // Pick the primary collection for this category
  type Rec = { label: string; metadata: Record<string, unknown> }
  let records: Rec[] = []

  if (category === 'contacts' || (category === 'general' && context.contacts?.length)) {
    records = (context.contacts ?? []) as Rec[]
    return records.slice(0, 9).map(r => `Tell me about ${r.label.split(' <')[0]}`)
  }
  if (category === 'deals' || category === 'pipeline') {
    records = (context.deals ?? []) as Rec[]
    return records.slice(0, 9).map(r => `Show me the ${r.label} deal`)
  }
  if (category === 'tickets' || category === 'activities') {
    const tickets = (context.tickets ?? []) as Rec[]
    const reminders = (context.reminders ?? []) as Rec[]
    // Interleave tickets and reminders in display order
    records = [...tickets, ...reminders]
    return records.slice(0, 9).map(r =>
      r.metadata?.overdue
        ? `What is the reminder "${r.label}"?`
        : `Tell me about ticket "${r.label}"`
    )
  }
  if (category === 'reminders') {
    records = (context.reminders ?? []) as Rec[]
    return records.slice(0, 9).map(r => `What is the reminder "${r.label}"?`)
  }
  if (category === 'emails') {
    records = (context.emails ?? []) as Rec[]
    return records.slice(0, 9).map(r => {
      const subject = r.label.split(' — from ')[0]
      return `Tell me about the email "${subject}"`
    })
  }
  if (category === 'conversations') {
    records = (context.conversations ?? []) as Rec[]
    return records.slice(0, 9).map(r => `Summarise the conversation "${r.label}"`)
  }
  if (category === 'forms') {
    records = (context.forms ?? []) as Rec[]
    return records.slice(0, 9).map(r => {
      const name = r.label.split(' <')[0]
      return `Tell me about the form entry from ${name}`
    })
  }
  return []
}
