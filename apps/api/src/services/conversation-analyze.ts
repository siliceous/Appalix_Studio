/**
 * Conversation AI Analysis — reads bot conversation messages and uses Claude
 * to assign priority, summary, insights, action, and entities.
 *
 * Mirrors the analyzeEmail / reanalyzePendingEmails pattern in sage-email-sync.ts.
 */
import { supabase }                                   from '../lib/supabase.js'
import { callClaude }                                 from './ai/claude.js'
import { getWorkspaceAutoSettings, isFullAutomation } from '../lib/auto-settings.js'
import { executeAutoAction }                          from './sage-auto-execute.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConvAnalysis {
  priority: 'high' | 'medium' | 'low'
  summary:  string | null
  insights: string[]
  action:   'create_lead' | 'create_ticket' | 'ignore'
  entities: {
    name?:             string
    email?:            string
    phone?:            string
    product_interest?: string
  }
}

// ---------------------------------------------------------------------------
// Single conversation analysis
// ---------------------------------------------------------------------------

async function analyzeConversation(conversationId: string): Promise<ConvAnalysis | null> {
  // Fetch last 30 user + assistant messages
  const { data: msgs } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(30)

  if (!msgs || msgs.length === 0) return null

  const transcript = (msgs as { role: string; content: string }[])
    .map(m => `[${m.role === 'user' ? 'Visitor' : 'Bot'}]: ${m.content}`)
    .join('\n')

  const prompt = `You are an AI assistant that analyses bot chat conversations for a business.

You will classify each conversation into priority tiers, extract a summary, key insights, and the best next action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH — visitor shared contact info (email/phone) OR asked about pricing/demo/proposal OR expressed strong buying intent OR reported an unresolved support issue
MEDIUM — genuine question, 4+ visitor messages, exploring but no contact info yet
LOW — 1–3 messages only, simple greeting or bot couldn't help, spam, test conversation

ACTION RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"create_lead"    — if HIGH or MEDIUM priority and visitor shows sales/inquiry intent
"create_ticket"  — if visitor is reporting a bug, issue, or support problem (any priority)
"ignore"         — if LOW priority or spam

EXTRACTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
name             — visitor's full name if mentioned
email            — any email address they provided
phone            — any phone number they provided
product_interest — specific product/service/feature they enquire about

SUMMARY — 1–2 sentences for all priorities. Be brief for Low (e.g. "Short greeting, no substantive request.").
INSIGHTS — 2–3 bullet points for all priorities. Keep Low insights concise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT — return ONLY this JSON, nothing else:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "priority": "high" | "medium" | "low",
  "summary": "string or null",
  "insights": ["insight 1", "insight 2"],
  "action": "create_lead" | "create_ticket" | "ignore",
  "entities": {
    "name": "string or omit",
    "email": "string or omit",
    "phone": "string or omit",
    "product_interest": "string or omit"
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION TO ANALYSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${transcript.slice(0, 3000)}`

  try {
    const result = await callClaude({
      model:        'claude-haiku-4-5-20251001',
      systemPrompt: 'You are a precise JSON generator. Output only the JSON object requested.',
      messages:     [{ role: 'user', content: prompt }],
      maxTokens:    600,
      temperature:  0.2,
    })

    const cleaned = result.content.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
    const json = JSON.parse(cleaned) as ConvAnalysis
    if (!json.priority || !json.action) return null
    return json
  } catch (err) {
    console.error('[conversation-analyze] parse error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Batch analysis — mirrors reanalyzePendingEmails
// ---------------------------------------------------------------------------

export async function analyzeConversationsForWorkspace(
  workspaceId:   string,
  batchSize    = 50,
  convIds?:     string[],
): Promise<number> {
  let query = supabase
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('last_activity_at', { ascending: false })
    .limit(batchSize)

  if (convIds && convIds.length > 0) {
    // Explicit list — re-analyse regardless of prior analysis
    query = query.in('id', convIds)
  } else {
    // Only un-analysed conversations
    query = query.is('ai_analyzed_at', null)
  }

  const { data: rows } = await query
  if (!rows || rows.length === 0) return 0

  let analysed = 0
  for (const row of rows as { id: string }[]) {
    const result = await analyzeConversation(row.id)
    if (!result) continue

    const { error } = await supabase
      .from('conversations')
      .update({
        ai_priority:    result.priority,
        ai_summary:     result.summary ?? null,
        ai_insights:    result.insights.length > 0 ? result.insights : null,
        ai_action:      result.action,
        ai_entities:    Object.keys(result.entities).length > 0 ? result.entities : null,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('workspace_id', workspaceId)

    if (!error) {
      analysed++
      // Fire auto-action if full automation is enabled for the bots channel
      if (result.action !== 'ignore') {
        try {
          const settings = await getWorkspaceAutoSettings(workspaceId)
          if (isFullAutomation(settings, 'bots')) {
            await executeAutoAction({
              workspaceId,
              channel:  'bots',
              action:   result.action,
              sourceId: row.id,
              entities:          result.entities,
              summary:           result.summary ?? null,
              priority:          result.priority ?? null,
              defaultPipelineId: settings.default_pipeline_id,
            })
          }
        } catch (autoErr) {
          console.error('[conversation-analyze] auto-execute error:', autoErr)
        }
      }
    }
  }

  return analysed
}
