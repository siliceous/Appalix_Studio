import type { FastifyInstance } from 'fastify'
import {
  verifyShopifySignature,
  parseShopifyEvents,
  sendShopifyReply,
} from '../../adapters/shopify.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'

export async function shopifyRoutes(fastify: FastifyInstance) {
  /**
   * POST — inbound Shopify webhooks
   *
   * Shopify does not use a GET challenge. All verification is done
   * via HMAC-SHA256 on the raw body (X-Shopify-Hmac-Sha256 header, base64).
   *
   * Webhook URL to set in Shopify Partner Dashboard:
   *   https://api.appalix.ai/webhooks/shopify/:integrationId
   *
   * Topics to subscribe:
   *   - conversations/create
   *   - messages/create
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/shopify/:integrationId',
    { config: { rawBody: true } },
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg     = integration.config as Record<string, string>
      const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)

      // Verify HMAC signature
      const signature = request.headers['x-shopify-hmac-sha256'] as string | undefined
      if (!verifyShopifySignature(rawBody, signature, cfg.webhook_secret)) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      // Acknowledge immediately — Shopify requires a 200 within 5 seconds
      reply.status(200).send()

      const topic = (request.headers['x-shopify-topic'] as string | undefined) ?? ''
      const ctx   = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'shopify' as const,
        config:        cfg,
      }

      const messages = parseShopifyEvents(request.body as never, topic, ctx)

      for (const incoming of messages) {
        setImmediate(async () => {
          try {
            const { reply: aiReply } = await processMessage(incoming)
            const conversationId     = incoming.platformThreadId
            await sendShopifyReply(
              { text: aiReply },
              conversationId,
              cfg.shop_domain,
              cfg.access_token,
            )
          } catch (err) {
            console.error('[shopify webhook] processing error:', err)
          }
        })
      }
    },
  )
}
