import type { FastifyInstance } from 'fastify'
import { verifyWordPressApiKey, parseWordPressRequest, formatWordPressReply } from '../../adapters/wordpress.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'

export async function wordpressRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/wordpress/:integrationId
   *
   * Synchronous — the WordPress plugin awaits this response.
   * Responds with { reply, conversation_id }.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/wordpress/:integrationId',
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg       = integration.config as Record<string, string>
      const apiKey    = request.headers['x-wp-api-key'] as string | undefined

      if (!verifyWordPressApiKey(apiKey, cfg.api_key)) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'wordpress' as const,
        config:        cfg,
      }

      const incoming = parseWordPressRequest(request.body as never, ctx)
      if (!incoming) return reply.status(400).send({ error: 'Missing message' })

      try {
        const { reply: aiReply, conversationId } = await processMessage(incoming)
        return reply.send(formatWordPressReply({ text: aiReply }, conversationId))
      } catch (err) {
        console.error('[wordpress webhook] processing error:', err)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    },
  )
}
