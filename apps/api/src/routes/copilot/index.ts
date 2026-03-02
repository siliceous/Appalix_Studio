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
])

const COPILOT_TOOLS = BUILT_IN_TOOLS.filter(t => COPILOT_TOOL_NAMES.has(t.name))

const MAX_STEPS = 6

interface CopilotBody {
  workspace_id:    string
  messages:        { role: 'user' | 'assistant'; content: string }[]
  user_name?:      string
  workspace_name?: string
  context?:        string
}

function buildInternalSystemPrompt(workspaceName: string, userName: string, context?: string): string {
  return `You are Sage, the internal AI copilot for ${workspaceName}. You are talking with ${userName}, a verified team member.

You have full, real-time access to the live CRM data for this workspace via tools. Always call a tool to get live data before answering questions about deals, contacts, pipeline, or reminders — never guess or make up numbers.

Your CRM capabilities:
- sage_get_overview: today's high-priority deals, deals closing this week, pending reminders
- sage_search_deals: find deals by name, stage, status, or priority
- sage_move_deal: move a deal to a different pipeline stage
- sage_update_deal: update status (open/won/lost), close date, priority, win %, or description
- sage_log_note: log a call note or update against a deal
- sage_set_reminder: set a follow-up reminder for a future date
- sage_search_contacts: find contacts by name or email
- sage_search_emails: search the email inbox by sender, subject, or priority (high/medium/low)
- sage_draft_reply: retrieve AI-generated reply drafts for a specific email
- rag_search: search the workspace knowledge base for policies, docs, or product info

Guidelines:
- Be concise and action-oriented
- For CRM questions, always fetch live data first
- When you make a change (move deal, update status, set reminder), confirm what you did clearly
- If drafting a document or email, produce complete ready-to-use content${context ? `\n\nCurrent context: ${context}` : ''}`
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
