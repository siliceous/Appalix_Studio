import type { FastifyInstance } from 'fastify'
import { createHmac, timingSafeEqual } from 'crypto'
import {
  verifyShopifySignature,
  parseShopifyEvents,
  sendShopifyReply,
} from '../../adapters/shopify.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'

/**
 * Verify a Shopify GDPR webhook using the app's client secret.
 * Shopify signs the raw body with HMAC-SHA256 and sends it base64-encoded
 * in the X-Shopify-Hmac-Sha256 header.
 */
function verifyGdprHmac(rawBody: string, hmacHeader: string | undefined, secret: string): boolean {
  if (!hmacHeader) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hmacHeader))
  } catch {
    return false
  }
}

export async function shopifyRoutes(fastify: FastifyInstance) {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET ?? ''

  /**
   * Unified GDPR/Compliance webhook endpoint — required for Shopify App Store review.
   * Configured in shopify.app.toml:
   *   uri = "https://appalix-api.onrender.com/webhooks/shopify/compliance"
   *
   * Handles all three compliance topics:
   *   - customers/data_request
   *   - customers/redact
   *   - shop/redact
   */
  fastify.post('/shopify/compliance', { config: { rawBody: true } }, async (request, reply) => {
    const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)
    const hmac    = request.headers['x-shopify-hmac-sha256'] as string | undefined
    const topic   = request.headers['x-shopify-topic'] as string | undefined
    const shop    = request.headers['x-shopify-shop-domain'] as string | undefined

    if (!verifyGdprHmac(rawBody, hmac, clientSecret)) {
      fastify.log.warn({ topic, shop }, '[shopify compliance] HMAC verification failed')
      return reply.status(401).send('Unauthorized')
    }

    fastify.log.info({ topic, shop }, '[shopify compliance] webhook received')

    switch (topic) {
      case 'customers/data_request':
        fastify.log.info({ topic, shop }, '[shopify compliance] customers/data_request — logging data access request')
        break
      case 'customers/redact':
        fastify.log.info({ topic, shop }, '[shopify compliance] customers/redact — TODO: delete customer data')
        break
      case 'shop/redact':
        fastify.log.info({ topic, shop }, '[shopify compliance] shop/redact — TODO: delete shop data and tokens')
        break
      default:
        fastify.log.warn({ topic, shop }, '[shopify compliance] unknown topic')
    }

    return reply.status(200).send()
  })

  /**
   * Legacy individual endpoints (kept for backward compatibility)
   */
  fastify.post('/shopify/customers-data-request', { config: { rawBody: true } }, async (request, reply) => {
    const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)
    const hmac    = request.headers['x-shopify-hmac-sha256'] as string | undefined
    if (!verifyGdprHmac(rawBody, hmac, clientSecret)) return reply.status(401).send('Unauthorized')
    fastify.log.info({ body: request.body }, '[shopify gdpr] customers/data_request received')
    return reply.status(200).send()
  })

  fastify.post('/shopify/customers-redact', { config: { rawBody: true } }, async (request, reply) => {
    const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)
    const hmac    = request.headers['x-shopify-hmac-sha256'] as string | undefined
    if (!verifyGdprHmac(rawBody, hmac, clientSecret)) return reply.status(401).send('Unauthorized')
    fastify.log.info({ body: request.body }, '[shopify gdpr] customers/redact received')
    return reply.status(200).send()
  })

  fastify.post('/shopify/shop-redact', { config: { rawBody: true } }, async (request, reply) => {
    const rawBody = (request as never as { rawBody?: string }).rawBody ?? JSON.stringify(request.body)
    const hmac    = request.headers['x-shopify-hmac-sha256'] as string | undefined
    if (!verifyGdprHmac(rawBody, hmac, clientSecret)) return reply.status(401).send('Unauthorized')
    fastify.log.info({ body: request.body }, '[shopify gdpr] shop/redact received')
    return reply.status(200).send()
  })

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
    async (request, reply) => {
      const integration = await resolveIntegration(request.params.integrationId)
      if (!integration) return reply.status(404).send({ error: 'Integration not found' })

      const cfg     = integration.config as Record<string, string>
      const rawBody = JSON.stringify(request.body)

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
            const { reply: aiReply, botPaused } = await processMessage(incoming)
            const conversationId     = incoming.platformThreadId
            if (!botPaused && aiReply) await sendShopifyReply(
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
