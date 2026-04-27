import type { FastifyInstance } from 'fastify'
import {
  sendSms,
  findOrCreateContact,
  findOrCreateConversation,
  insertOutboundMessage,
  resolveWorkspaceByNumber,
} from '../services/telnyx-messaging.service.js'
import { recordSmsOutbound }   from '../services/usage-ledger.service.js'
import { checkSendAllowed }    from '../modules/telco/smsSendGatekeeperService.js'

interface SendSmsBody {
  workspaceId: string
  from:        string   // E.164 Telnyx number owned by this workspace
  to:          string   // E.164 recipient
  body:        string
}

export async function telnyxSmsRoutes(fastify: FastifyInstance) {
  /**
   * POST /telnyx/sms/send
   * Sends an outbound SMS via Telnyx, stores the message, and records usage.
   * Auth: X-Service-Key (Supabase service role key) — server-to-server only.
   */
  fastify.post<{ Body: SendSmsBody }>(
    '/telnyx/sms/send',
    async (req, reply) => {
      const serviceKey = req.headers['x-service-key']
      if (!serviceKey || serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const { workspaceId, from, to, body } = req.body ?? {}
      if (!workspaceId || !from || !to || !body) {
        return reply.code(400).send({ error: 'workspaceId, from, to, and body are required' })
      }

      // Guard: verify the from number belongs to this workspace
      const ws = await resolveWorkspaceByNumber(from)
      if (!ws || ws.workspaceId !== workspaceId) {
        return reply.code(403).send({ error: 'from number not authorised for this workspace' })
      }

      // Compliance + opt-out gatekeeper
      const gate = await checkSendAllowed({ workspaceId, fromE164: from, toE164: to })
      if (!gate.allowed) {
        return reply.code(422).send({ error: gate.reason, code: gate.code })
      }

      // Send via Telnyx
      const result = await sendSms({
        from,
        to,
        body,
        messagingProfileId: ws.messagingProfileId ?? undefined,
      })

      if ('error' in result) {
        return reply.code(502).send({ error: result.error })
      }

      // Find / create CRM objects
      const contactId      = await findOrCreateContact(workspaceId, to)
      const conversationId = await findOrCreateConversation({
        workspaceId,
        fromE164:  to,    // thread key is always the remote party's number
        toE164:    from,
        contactId,
      })

      let messageId: string | null = null
      if (conversationId) {
        messageId = await insertOutboundMessage({
          workspaceId,
          conversationId,
          telnyxMessageId: result.messageId,
          body,
        })
      }

      // Record billable usage
      if (messageId) {
        await recordSmsOutbound({
          workspaceId,
          sourceId:        messageId,
          segments:        result.segments,
          occurredAt:      new Date(),
          toE164:          to,
          telnyxMessageId: result.messageId,
        })
      }

      return reply.code(200).send({
        ok:             true,
        telnyxMessageId: result.messageId,
        segments:        result.segments,
        conversationId,
        messageId,
      })
    },
  )
}
