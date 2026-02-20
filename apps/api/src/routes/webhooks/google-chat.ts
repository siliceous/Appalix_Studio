import type { FastifyInstance } from 'fastify'
import { parseGoogleChatEvent, formatGoogleChatReply } from '../../adapters/google-chat.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'

export async function googleChatRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/google-chat/:integrationId
   *
   * Google Chat calls our endpoint synchronously and expects the reply
   * in the HTTP response body — no separate reply call needed.
   * Timeout: ~30 seconds. We must respond within that window.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/google-chat/:integrationId',
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ text: 'Integration not found.' })

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'google_chat' as const,
        config:        integration.config as Record<string, string>,
      }

      const incoming = parseGoogleChatEvent(request.body as never, ctx)
      if (!incoming) {
        return reply.send({ text: '' })  // Acknowledge silently
      }

      try {
        const { reply: aiReply } = await processMessage(incoming)
        return reply.send(formatGoogleChatReply({ text: aiReply }))
      } catch (err) {
        console.error('[google-chat webhook] processing error:', err)
        return reply.status(500).send({ text: 'Sorry, I encountered an error. Please try again.' })
      }
    },
  )
}
