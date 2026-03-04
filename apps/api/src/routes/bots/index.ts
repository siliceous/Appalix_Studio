/**
 * POST /bots/conversations/analyze
 * Triggers AI analysis for bot conversations in the workspace.
 * Server-to-server only (authenticated via X-Service-Key).
 */
import type { FastifyInstance } from 'fastify'
import { config }               from '../../config.js'
import { analyzeConversationsForWorkspace } from '../../services/conversation-analyze.js'

interface AnalyzeBody {
  workspace_id:       string
  batch_size?:        number
  conversation_ids?:  string[]
}

function authCheck(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  return req.headers['x-service-key'] === config.SUPABASE_SERVICE_ROLE_KEY
}

export async function botRoutes(fastify: FastifyInstance) {
  /**
   * POST /bots/conversations/analyze
   * Retroactively runs AI analysis on conversations that have not been analyzed yet.
   * If conversation_ids is provided, re-analyzes only those conversations.
   */
  fastify.post<{ Body: AnalyzeBody }>('/conversations/analyze', async (request, reply) => {
    if (!authCheck(request)) return reply.status(401).send({ error: 'Unauthorised' })

    const { workspace_id, batch_size, conversation_ids } = request.body
    if (!workspace_id) return reply.status(400).send({ error: 'workspace_id is required' })

    try {
      const analyzed = await analyzeConversationsForWorkspace(
        workspace_id,
        batch_size ?? 50,
        conversation_ids,
      )
      return reply.send({ ok: true, analyzed })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      fastify.log.error({ err, workspace_id }, 'Conversation analysis failed')
      return reply.status(500).send({ error: message })
    }
  })
}
