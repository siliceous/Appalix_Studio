import type { FastifyInstance } from 'fastify'
import { verifyTelegramSecret, parseTelegramUpdate, sendTelegramReply } from '../../adapters/telegram.js'
import type { TelegramUpdate } from '../../adapters/telegram.js'
import { processMessage, resolveIntegration } from '../../services/processor.js'

export async function telegramRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/telegram/:integrationId
   *
   * Telegram sends all updates as HTTP POST to this endpoint.
   * We must respond with 200 quickly; processing happens asynchronously.
   *
   * Authentication: Telegram sends a `X-Telegram-Bot-Api-Secret-Token` header
   * containing the secret_token set during setWebhook — we verify it before processing.
   */
  fastify.post<{ Params: { integrationId: string } }>(
    '/telegram/:integrationId',
    async (request, reply) => {
      const { integrationId } = request.params
      const update = request.body as TelegramUpdate

      // Resolve integration
      const integration = await resolveIntegration(integrationId)
      if (!integration) {
        return reply.status(200).send()  // Return 200 even on error (Telegram retries on non-2xx)
      }

      const cfg = integration.config as Record<string, string>
      const botToken      = cfg.bot_token
      const secretToken   = cfg.webhook_secret_token

      // Verify webhook secret token (optional but strongly recommended)
      if (secretToken) {
        const provided = request.headers['x-telegram-bot-api-secret-token'] as string | undefined
        if (!verifyTelegramSecret(provided, secretToken)) {
          fastify.log.warn({ integrationId }, '[telegram] Invalid secret token')
          return reply.status(200).send()  // Silently ignore — don't leak info
        }
      }

      // Build context
      const ctx = {
        integrationId: integration.id,
        workspaceId:   integration.workspace_id,
        botId:         integration.bot_id!,
        platform:      'telegram' as const,
        config:        cfg,
      }

      // Parse update
      const incoming = parseTelegramUpdate(update, ctx)
      if (!incoming) {
        return reply.status(200).send()  // Acknowledge unsupported update types
      }

      // Respond 200 immediately — Telegram resends if we don't ACK within a few seconds
      reply.status(200).send()

      // Process asynchronously
      setImmediate(async () => {
        try {
          if (!botToken) {
            fastify.log.error({ integrationId }, '[telegram] No bot_token configured')
            return
          }
          const { reply: aiReply } = await processMessage(incoming)
          const chatId     = (update.message ?? update.edited_message)!.chat.id
          const messageId  = (update.message ?? update.edited_message)!.message_id
          await sendTelegramReply({ text: aiReply }, chatId, botToken, messageId)
        } catch (err) {
          fastify.log.error({ err, integrationId }, '[telegram] processing error')
        }
      })
    },
  )
}
