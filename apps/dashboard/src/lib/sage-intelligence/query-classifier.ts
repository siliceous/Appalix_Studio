import Anthropic from '@anthropic-ai/sdk'
import type { SageQueryClassification } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CLASSIFY_SYSTEM = `You are a query classifier for Sage, an AI workspace intelligence layer.
Classify the user's query and return ONLY a JSON object with no markdown.

Categories: contacts, deals, tickets, emails, conversations, companies, activities, reminders, team, pipeline, analytics, briefing, alerts, action, general

Retrieval modes: structured (exact DB query), semantic (fuzzy/history search), hybrid (both), none (no data needed)

Action types (only when user clearly wants to DO something):
create_reminder, create_task, create_ticket, create_deal, convert_to_deal, assign_deal, assign_ticket, move_deal_stage, save_note, draft_reply

convert_to_deal: use when user says "convert this lead/contact/submission/conversation into a deal", "add to pipeline", "create deal from this [contact/lead/form/conversation]"

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
    retrieval:  'none',
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
