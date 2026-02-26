import type { FastifyInstance } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../../config.js'
import { callClaude } from '../../services/ai/claude.js'
import { retrieveContext, buildRagContext } from '../../services/rag/retrieval.js'

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)

interface CopilotBody {
  workspace_id:   string
  messages:       { role: 'user' | 'assistant'; content: string }[]
  user_name?:     string
  workspace_name?: string
}

function buildInternalSystemPrompt(workspaceName: string, userName: string): string {
  return `You are an internal AI assistant for ${workspaceName}. You are helping ${userName}, a verified team member.

Your role is to help the team work faster and smarter. You can:
- Answer questions using the workspace knowledge base
- Draft proposals, reports, summaries, and emails
- Help prepare presentations, pitches, and documentation
- Analyse data and provide recommendations
- Search and summarise internal content

Guidelines:
- Be concise, professional, and action-oriented
- When drafting documents, produce complete, ready-to-use content
- If asked to send something to a colleague, provide the full draft and suggest the next step
- Always cite your sources when using knowledge base content`
}

export async function copilotRoutes(fastify: FastifyInstance) {
  /**
   * POST /copilot
   * Internal copilot endpoint — server-to-server only.
   * Authenticated via X-Service-Key matching SUPABASE_SERVICE_ROLE_KEY.
   */
  fastify.post<{ Body: CopilotBody }>(
    '/',
    async (request, reply) => {
      // Auth: service key only
      const serviceKey = request.headers['x-service-key']
      if (serviceKey !== config.SUPABASE_SERVICE_ROLE_KEY) {
        return reply.status(401).send({ error: 'Unauthorised' })
      }

      const { workspace_id, messages, user_name = 'Team member', workspace_name = 'your workspace' } = request.body

      if (!workspace_id || !messages?.length) {
        return reply.status(400).send({ error: 'workspace_id and messages are required' })
      }

      // Load workspace + primary bot
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

      // Load primary bot for this workspace
      const { data: bot } = await supabase
        .from('bots')
        .select('id, model, max_tokens, temperature, enable_rag, system_prompt')
        .eq('workspace_id', workspace_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const model      = bot?.model       ?? 'claude-sonnet-4-6'
      const maxTokens  = bot?.max_tokens  ?? 2048
      const temperature = bot?.temperature ?? 0.7
      const enableRag  = bot?.enable_rag  ?? false

      // Build internal system prompt
      const wName = workspace.name ?? workspace_name
      const systemPrompt = buildInternalSystemPrompt(wName, user_name)

      // RAG retrieval on the last user message
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
      let ragContext = ''

      if (enableRag && bot?.id && lastUserMsg) {
        try {
          const chunks = await retrieveContext({
            workspaceId:    workspace_id,
            query:          lastUserMsg.content,
            matchThreshold: 0.45,
            matchCount:     6,
          })
          if (chunks.length > 0) {
            ragContext = '\n\n---\nRELEVANT KNOWLEDGE BASE CONTEXT:\n' + buildRagContext(chunks) + '\n---'
          }
        } catch {
          // RAG failure is non-fatal
        }
      }

      const fullSystemPrompt = ragContext
        ? systemPrompt + ragContext
        : systemPrompt

      try {
        const result = await callClaude({
          model,
          systemPrompt: fullSystemPrompt,
          messages,
          maxTokens,
          temperature,
        })

        return reply.send({ reply: result.content })
      } catch (err) {
        fastify.log.error({ err, workspace_id }, 'Copilot Claude call failed')
        return reply.status(500).send({ error: 'AI call failed' })
      }
    },
  )
}
