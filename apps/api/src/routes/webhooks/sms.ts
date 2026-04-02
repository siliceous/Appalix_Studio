import type { FastifyInstance } from 'fastify'
import twilio from 'twilio'
import { processMessage } from '../../services/processor.js'

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) throw new Error('Twilio credentials not configured')
  return twilio(accountSid, authToken)
}

interface SmsBotBody {
  integrationId:  string
  workspaceId:    string
  botId:          string
  fromNumber:     string   // recipient (the person who texted in, E.164)
  toNumber:       string   // your Twilio number (E.164)
  text:           string
  messageSid:     string
}

export async function smsRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/sms/bot-reply
   * Called by the dashboard Twilio webhook (fire-and-forget) when the SMS
   * integration has a bot assigned. Runs processMessage() and sends the
   * bot reply back via Twilio.
   *
   * Auth: X-Service-Key header (Supabase service role key)
   */
  fastify.post<{ Body: SmsBotBody }>(
    '/sms/bot-reply',
    async (request, reply) => {
      // Verify service key so only our own infra can call this
      const serviceKey = request.headers['x-service-key']
      if (!serviceKey || serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const { integrationId, workspaceId, botId, fromNumber, toNumber, text, messageSid } = request.body

      if (!integrationId || !workspaceId || !botId || !fromNumber || !text) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      // Acknowledge immediately — Twilio already got its 200 from the dashboard webhook
      reply.status(202).send({ ok: true })

      // Process asynchronously, same pattern as WhatsApp/Slack webhooks
      setImmediate(async () => {
        try {
          const incoming = {
            platform:         'sms' as const,
            integrationId,
            workspaceId,
            botId,
            platformThreadId: fromNumber,  // thread key = sender's number
            platformUserId:   fromNumber,
            text,
            metadata:         { messageSid, toNumber },
          }

          const { reply: aiReply } = await processMessage(incoming)

          if (!aiReply) {
            console.warn('[sms/bot-reply] processMessage returned empty reply')
            return
          }

          // Send the bot reply back via Twilio
          await getTwilioClient().messages.create({
            from: toNumber,   // your Twilio number
            to:   fromNumber, // the person who texted in
            body: aiReply,
          })

          console.info(`[sms/bot-reply] Replied to ${fromNumber} — SID ${messageSid}`)
        } catch (err) {
          console.error('[sms/bot-reply] error:', err)
        }
      })
    },
  )
}
