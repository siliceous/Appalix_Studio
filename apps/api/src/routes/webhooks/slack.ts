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
    async (request, reply) => {
      const { integrationId } = request.params
      const body = request.body as Record<string, unknown>
      const rawBody = JSON.stringify(body)

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

      // If the user has restricted channels, ignore messages from others
      const allowedChannels = (integration.config as Record<string, unknown>).allowed_channels as string[] | undefined
      if (allowedChannels && allowedChannels.length > 0) {
        const eventChannel = (body as never as { event?: { channel?: string } }).event?.channel
        if (eventChannel && !allowedChannels.includes(eventChannel)) {
          return reply.status(200).send()
        }
      }

      // Acknowledge immediately — Slack will retry if we don't respond in 3s
      reply.status(200).send()

      // Process asynchronously
      setImmediate(async () => {
        try {
          console.log('[slack webhook] processing message from integration:', integrationId)
          const { reply: aiReply, botPaused } = await processMessage(incoming)
          console.log('[slack webhook] AI reply generated, length:', aiReply?.length)
          const event = (body as never as { event: { channel: string; thread_ts?: string; ts?: string; user?: string } }).event
          if (!botPaused && aiReply) await sendSlackReply({ text: aiReply }, event, cfg.bot_token)
        } catch (err) {
          console.error('[slack webhook] processing error:', err)
        }
      })
    },
  )
}
