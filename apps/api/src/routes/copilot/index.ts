import type { FastifyInstance } from 'fastify'
import type Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from '../../config.js'
import { callClaude } from '../../services/ai/claude.js'
import { BUILT_IN_TOOLS, executeTool, type ToolExecutionContext } from '../../services/agent/tools.js'

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)

// Tools available to the internal copilot — Sage CRM tools + RAG.
// Excludes widget-only tools (http_request, get_conversation_history,
// create_support_ticket, verify_identity) and Pro automation tools
// (send_email, generate_document, export_csv, request_approval).
const COPILOT_TOOL_NAMES = new Set([
  'rag_search',
  'sage_get_overview',
  'sage_search_deals',
  'sage_move_deal',
  'sage_update_deal',
  'sage_log_note',
  'sage_set_reminder',
  'sage_search_contacts',
  'sage_search_emails',
  'sage_draft_reply',
  'sage_get_guide',
  'sage_check_feature_status',
])

const COPILOT_TOOLS = BUILT_IN_TOOLS.filter(t => COPILOT_TOOL_NAMES.has(t.name))

const MAX_STEPS = 12

interface CopilotBody {
  workspace_id:    string
  messages:        { role: 'user' | 'assistant'; content: string }[]
  user_name?:      string
  workspace_name?: string
  context?:        string
}

function buildInternalSystemPrompt(workspaceName: string, userName: string, context?: string): string {
  return `You are Sage, the internal AI copilot for ${workspaceName}. You are talking with ${userName}, a verified team member.

You have two roles:
1. **CRM assistant** — live access to deals, contacts, pipeline, emails, and reminders.
2. **Setup guide** — step-by-step guidance for every Appalix feature, with real-time verification.

## CRM Tools
- sage_get_overview: today's high-priority deals, deals closing this week, pending reminders
- sage_search_deals: find deals by name, stage, status, or priority
- sage_move_deal: move a deal to a different pipeline stage
- sage_update_deal: update status, close date, priority, win %, or description
- sage_log_note: log a call note or activity against a deal
- sage_set_reminder: set a follow-up reminder
- sage_search_contacts: find contacts by name or email
- sage_search_emails: search the email inbox by sender, subject, or priority
- sage_draft_reply: retrieve AI reply drafts for an email
- rag_search: search workspace knowledge base

## Setup & Guide Tools
- sage_get_guide(topic): get complete step-by-step setup instructions for any feature. Topics:
  - Email: gmail, microsoft
  - Invoicing: stripe
  - Chat channels: slack, whatsapp, facebook, telegram, google-chat, widget, wordpress, custom-api
  - Knowledge base: knowledge-base (covers all 11 source types: url, sitemap, file, text, notion, google_drive, dropbox, onedrive, sharepoint, confluence, gitbook)
  - CRM (built-in): pipeline, contacts, deals, tickets, attachments, ai-rewrite, sage
  - External CRM lead routing: hubspot, salesforce, zoho, monday, intercom, freshdesk, zendesk, zapier
  - Bot setup: bot
  - Team management: assign-leads (manual contact assignment), round-robin (auto lead distribution), permissions (role-based access control), team-onboarding (7-step workspace setup checklist)
- sage_check_feature_status(feature): query the live database to verify whether a feature is configured. Features: gmail, microsoft, stripe, slack, whatsapp, facebook, telegram, google-chat, zapier, hubspot, salesforce, monday, intercom, zoho, freshdesk, zendesk, has_pipelines, has_contacts, has_deals, has_bots, has_sources, has_widget, has_assigned_contacts, rr_enabled.

## Guided Setup Protocol — MANDATORY
Any time the user mentions connecting, setting up, configuring, or using a feature (e.g. "connect gmail", "set up stripe", "add a pipeline", "how do I use the widget"), you MUST follow this exact protocol. Do NOT skip it, even if you think you know the answer.

**Step A — Fetch the guide:**
Call sage_get_guide(topic) immediately. Do not answer from memory.

**Step B — Check current status:**
Call sage_check_feature_status(feature) to find out what is already done.

**Step C — Present ONLY Step 1 (or the first incomplete step):**
- NEVER list all steps at once. Show ONE step only.
- Format it clearly: "**Step X: [title]**" followed by the instruction.
- End with: "Let me know when you've done this and I'll check if it worked ✓"

**Step D — After user confirms:**
Call sage_check_feature_status again to verify the step completed successfully.
- If ✅ verified: say "Great, that's confirmed! Here's the next step:" then show Step X+1 only.
- If ⏳ not yet: say "It doesn't look like that's connected yet — [diagnose the issue]. Try again and let me know."

**Step E — Repeat until done:**
Continue one step at a time until all steps are ✅. Then celebrate: "🎉 You're all set! [brief summary of what was configured]."

CRITICAL RULES:
- Show only ONE step per message during guided setup.
- Always call sage_check_feature_status to verify — never trust the user's word alone for database-backed steps.
- Never skip the tool calls and answer from training data.

## General guidelines
- Be concise and action-oriented. One step at a time during guided setup.
- For CRM questions, always fetch live data first — never guess numbers.
- When you make a change (move deal, log note, set reminder), confirm it clearly.
- If the user asks a general "what can you do?" question, list both your CRM capabilities and the setup guidance you can provide.${context ? `\n\n## Current context\n${context}` : ''}`
}

export async function copilotRoutes(fastify: FastifyInstance) {
  /**
   * POST /copilot
   * Internal copilot endpoint — server-to-server only.
   * Authenticated via X-Service-Key matching SUPABASE_SERVICE_ROLE_KEY.
   *
   * Runs a multi-step agentic loop with Sage CRM tools + RAG enabled.
   */
  fastify.post<{ Body: CopilotBody }>(
    '/',
    async (request, reply) => {
      // Auth: service key only
      const serviceKey = request.headers['x-service-key']
      if (serviceKey !== config.SUPABASE_SERVICE_ROLE_KEY) {
        return reply.status(401).send({ error: 'Unauthorised' })
      }

      const {
        workspace_id,
        messages,
        user_name      = 'Team member',
        workspace_name = 'your workspace',
        context,
      } = request.body

      if (!workspace_id || !messages?.length) {
        return reply.status(400).send({ error: 'workspace_id and messages are required' })
      }

      // Load workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id, name, plan')
        .eq('id', workspace_id)
        .single()

      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' })
      }

      // Plan gate: Pro+ only
      const allowedPlans = ['pro', 'scale', 'enterprise']
      if (!allowedPlans.includes(workspace.plan)) {
        return reply.status(403).send({ error: 'Internal Copilot requires a Pro plan or above' })
      }

      // Load primary bot for model settings
      const { data: bot } = await supabase
        .from('bots')
        .select('id, model, max_tokens, temperature')
        .eq('workspace_id', workspace_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const model       = bot?.model      ?? 'claude-sonnet-4-6'
      const maxTokens   = bot?.max_tokens ?? 2048
      const temperature = bot?.temperature ?? 0.7

      const wName       = workspace.name ?? workspace_name
      const systemPrompt = buildInternalSystemPrompt(wName, user_name, context)

      // Tool execution context — copilot has no persisted conversation row
      const toolCtx: ToolExecutionContext = {
        workspaceId:    workspace_id,
        conversationId: '',          // copilot sessions are ephemeral
        botId:          bot?.id ?? '',
        workspacePlan:  workspace.plan,
      }

      // Agentic loop — same pattern as runner.ts but without DB tracking
      const workingMessages: Anthropic.MessageParam[] = messages.map(m => ({
        role:    m.role,
        content: m.content,
      }))

      let steps      = 0
      let finalReply = ''

      try {
        while (steps < MAX_STEPS) {
          steps++

          const result = await callClaude({
            model,
            systemPrompt,
            messages: workingMessages as never,
            maxTokens,
            temperature,
            tools: COPILOT_TOOLS,
          })

          if (result.stopReason === 'end_turn' || !result.toolUses?.length) {
            finalReply = result.content
            break
          }

          // Append assistant turn (may contain tool_use blocks)
          workingMessages.push({
            role:    'assistant',
            content: [
              ...(result.content ? [{ type: 'text' as const, text: result.content }] : []),
              ...(result.toolUses ?? []),
            ],
          })

          // Execute tools and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const toolUse of result.toolUses ?? []) {
            let toolOutput: string
            try {
              toolOutput = await executeTool(toolUse.name, toolUse.input as never, toolCtx)
            } catch (err) {
              toolOutput = `Tool error: ${err instanceof Error ? err.message : String(err)}`
            }
            toolResults.push({
              type:        'tool_result',
              tool_use_id: toolUse.id,
              content:     toolOutput,
            })
          }

          workingMessages.push({ role: 'user', content: toolResults })
        }

        if (!finalReply) {
          finalReply = 'I was unable to complete this request. Please try rephrasing.'
        }

        return reply.send({ reply: finalReply })
      } catch (err) {
        fastify.log.error({ err, workspace_id }, 'Copilot agent loop failed')
        return reply.status(500).send({ error: 'AI call failed' })
      }
    },
  )
}
