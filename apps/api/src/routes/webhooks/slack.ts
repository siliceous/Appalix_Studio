import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifySlackSignature, parseSlackEvent, sendSlackReply } from '../../adapters/slack.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'

export async function slackRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/slack/:integrationId
   *
   * Handles:
   *  - url_verification challenge (must respond within 3s)
   *  - Events API (app_mention, message)
   *
   * Slack requires a 200 response within 3 seconds. We respond immediately
   * and process the message asynchronously.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/slack/:integrationId',
    { config: { rawBody: true } },
    async (request, reply) => {
      const { integrationId } = request.params
      const rawBody  = (request as FastifyRequest & { rawBody?: string }).rawBody ?? JSON.stringify(request.body)
      const body     = request.body as Record<string, unknown>

      // Handle url_verification challenge immediately
      if (body.type === 'url_verification') {
        return reply.send({ challenge: body.challenge })
      }

      // Load integration
      const integration = await resolveIntegration(integrationId)
      if (!integration) {
        return reply.status(404).send({ error: 'Integration not found' })
      }

      const cfg = integration.config as Record<string, string>

      // Verify signature
      const timestamp = request.headers['x-slack-request-timestamp'] as string
      const signature = request.headers['x-slack-signature'] as string
      const signingSecret = cfg.signing_secret

      if (!verifySlackSignature(rawBody, timestamp, signature, signingSecret)) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      // Parse event
      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'slack' as const,
        config:        cfg,
      }

      const incoming = parseSlackEvent(body as never, ctx)
      if (!incoming) {
        return reply.status(200).send()  // Acknowledge unactionable events
      }

      // Acknowledge immediately — Slack will retry if we don't respond in 3s
      reply.status(200).send()

      // Process asynchronously
      setImmediate(async () => {
        try {
          console.log('[slack webhook] processing message from integration:', integrationId)
          const { reply: aiReply } = await processMessage(incoming)
          console.log('[slack webhook] AI reply generated, length:', aiReply?.length)
          const event = (body as never as { event: { channel: string; thread_ts?: string; ts?: string; user?: string } }).event
          await sendSlackReply({ text: aiReply }, event, cfg.bot_token)
        } catch (err) {
          console.error('[slack webhook] processing error:', err)
        }
      })
    },
  )
}
