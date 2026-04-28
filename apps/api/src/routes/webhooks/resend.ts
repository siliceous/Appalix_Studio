import type { FastifyInstance } from 'fastify'
import { processResendWebhook, type ResendWebhookPayload } from '../../services/resend-campaign.service.js'

export async function resendWebhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/resend
   * Receives delivery events from Resend (bounce, complaint, open, click, etc.)
   * Resend sends a svix-signature header but verification requires the signing
   * secret from Resend dashboard — for now we validate the payload shape only.
   * TODO Phase 5: add svix signature verification.
   */
  fastify.post('/resend', async (request, reply) => {
    const payload = request.body as ResendWebhookPayload

    if (!payload?.type || !payload?.data?.email_id) {
      return reply.status(400).send({ error: 'Invalid payload' })
    }

    // Acknowledge immediately so Resend doesn't retry
    reply.status(200).send({ ok: true })

    // Process asynchronously so the response is already sent
    setImmediate(async () => {
      try {
        await processResendWebhook(payload)
      } catch (err) {
        console.error('[resend-webhook] processing error:', err)
      }
    })
  })
}
