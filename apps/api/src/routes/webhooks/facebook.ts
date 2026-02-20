import type { FastifyInstance } from 'fastify'
import {
  verifyFacebookSignature,
  parseFacebookEvents,
  sendFacebookReply,
} from '../../adapters/facebook.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'

export async function facebookRoutes(fastify: FastifyInstance) {
  /**
   * GET /webhooks/facebook/:integrationId
   * Webhook verification challenge from Meta Developer Console.
   */
  fastify.get<{
    Params: { integrationId: string }
    Querystring: { 'hub.mode': string; 'hub.verify_token': string; 'hub.challenge': string }
  }>('/facebook/:integrationId', async (request, reply) => {
    const integration = await resolveIntegration(request.params.integrationId)
    if (!integration) return reply.status(404).send('Not found')

    const cfg          = integration.config as Record<string, string>
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query

    if (mode === 'subscribe' && token === cfg.verify_token) {
      return reply.send(challenge)
    }
    return reply.status(403).send('Forbidden')
  })

  /**
   * POST /webhooks/facebook/:integrationId
   * Incoming Messenger messages.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/facebook/:integrationId',
    { config: { rawBody: true } },
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg    = integration.config as Record<string, string>
      const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)

      if (!verifyFacebookSignature(rawBody, request.headers['x-hub-signature-256'] as string, cfg.app_secret)) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      // Acknowledge immediately
      reply.status(200).send()

      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'facebook_messenger' as const,
        config:        cfg,
      }

      const messages = parseFacebookEvents(request.body as never, ctx)

      for (const incoming of messages) {
        setImmediate(async () => {
          try {
            const { reply: aiReply } = await processMessage(incoming)
            await sendFacebookReply({ text: aiReply }, incoming.platformUserId!, cfg.page_access_token)
          } catch (err) {
            console.error('[facebook webhook] processing error:', err)
          }
        })
      }
    },
  )
}
