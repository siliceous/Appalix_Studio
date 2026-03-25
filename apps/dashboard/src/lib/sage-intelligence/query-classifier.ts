import Anthropic from '@anthropic-ai/sdk'
import type { SageQueryClassification } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CLASSIFY_SYSTEM = `You are a query classifier for Sage, an AI workspace intelligence layer.
Classify the user's query and return ONLY a JSON object with no markdown.

Categories:
- contacts: questions about people, clients, leads, customers
- deals: questions about deals, opportunities, sales
- pipeline: pipeline overview, stages, deal counts
- tickets: support tickets, issues, tasks
- emails: email inbox, messages, threads
- conversations: bot conversations, chat history
- activities: pending work, tasks, what to do, workload ("pending", "my tasks", "what should I do")
- reminders: reminders, follow-ups, due dates, overdue items
- team: team members, roles, who is on the team
- analytics: stats, counts, performance, how many
- briefing: briefing, summary, overview ("briefing", "summary of today/week")
- alerts: alerts, stale deals, overdue, at-risk items
- general: name/company searches, anything else — ALWAYS use "structured" retrieval for general, never "none"

IMPORTANT retrieval rules:
- Use "structured" when querying specific records, counts, or by name/status/date
- Use "semantic" only for fuzzy questions like "who mentioned pricing" or "what happened with..."
- Use "hybrid" for broad account questions like "summarise the Acme account"
- NEVER use "none" for general — always use "structured" so the workspace overview is shown
- "none" is only valid for pure greetings or meta-questions about Sage itself

Action types (only when user clearly wants to DO something):
create_reminder, create_task, create_ticket, create_deal, convert_to_deal, assign_deal, assign_ticket, move_deal_stage, save_note, draft_reply

For overdue/pending queries: set status="overdue" in filters.

Return JSON:
{
  "category": "<category>",
  "retrieval": "<mode>",
  "actionIntent": "<action_type or null>",
  "filters": {
    "assignee": "<name or 'me' or null>",
    "priority": "<high|medium|low or null>",
    "status": "<status or null>",
    "dateRange": { "from": "<ISO or null>", "to": "<ISO or null>" },
    "entity": { "type": "<type or null>", "name": "<name or null>" },
    "limit": <number or null>
  },
  "confidence": <0.0-1.0>
}`

export async function classifySageQuery(
  query: string,
  pageContext: string,
): Promise<SageQueryClassification> {
  const fallback: SageQueryClassification = {
    category:   'general',
    retrieval:  'structured',
    filters:    {},
    confidence: 0.5,
  }

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:     CLASSIFY_SYSTEM,
      messages: [{
        role:    'user',
        content: `Query: "${query}"\nCurrent page: ${pageContext}\nToday: ${new Date().toISOString().slice(0, 10)}`,
      }],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    const parsed = JSON.parse(raw) as SageQueryClassification
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}
