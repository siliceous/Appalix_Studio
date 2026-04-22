import type { FastifyInstance } from 'fastify'
import { createVerify }         from 'node:crypto'
import { supabase }             from '../../lib/supabase.js'
import {
  resolveWorkspaceByNumber,
  findOrCreateContact,
  findOrCreateConversation,
  insertInboundMessage,
  insertOutboundMessage,
  handleOptOutKeyword,
  sendSms,
} from '../../services/telnyx-messaging.service.js'
import {
  recordSmsInbound,
  recordSmsOutbound,
} from '../../services/usage-ledger.service.js'
import { processMessage } from '../../services/processor.js'

// ── Signature verification ────────────────────────────────────────────────────
// Telnyx signs webhooks with Ed25519. The signed payload is:
//   timestamp + "|" + rawBody
// Public key is the base64-encoded DER SPKI key from the Telnyx portal.

function verifyTelnyxSignature(
  rawBody:   string,
  signature: string,
  timestamp: string,
): boolean {
  const publicKey = process.env.TELNYX_PUBLIC_KEY
  if (!publicKey) {
    console.warn('[telnyx-webhook] TELNYX_PUBLIC_KEY not set — skipping signature check')
    return true
  }
  try {
    const verifier = createVerify('ed25519')
    verifier.update(`${timestamp}|${rawBody}`)
    return verifier.verify(
      { key: Buffer.from(publicKey, 'base64'), format: 'der', type: 'spki' },
      Buffer.from(signature, 'base64'),
    )
  } catch (err) {
    console.error('[telnyx-webhook] signature verify error:', err)
    return false
  }
}

// ── Telnyx payload types ──────────────────────────────────────────────────────

interface TelnyxEndpoint {
  phone_number: string
}

interface TelnyxMessagePayload {
  id:                   string
  direction:            'inbound' | 'outbound'
  from:                 TelnyxEndpoint
  to:                   TelnyxEndpoint[]
  text:                 string
  parts:                number
  messaging_profile_id?: string
  received_at?:         string
  sent_at?:             string
  errors?:              Array<{ title: string; detail: string }>
}

interface TelnyxWebhookBody {
  data: {
    event_type: string
    id:         string
    payload:    TelnyxMessagePayload
  }
  meta?: { attempt?: number }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function telnyxMessagingRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: TelnyxWebhookBody }>(
    '/telnyx/messaging',
    async (req, reply) => {
      const rawBody  = (req as unknown as { rawBody: string }).rawBody ?? ''
      const sig      = req.headers['telnyx-signature-ed25519'] as string ?? ''
      const ts       = req.headers['telnyx-timestamp']          as string ?? ''
      const body     = req.body

      const sigValid = verifyTelnyxSignature(rawBody, sig, ts)

      // ── Idempotency ──────────────────────────────────────────────────────
      const providerEventId = body?.data?.id ?? null
      const eventType       = body?.data?.event_type ?? 'unknown'

      if (providerEventId) {
        const { error: insertErr } = await supabase
          .from('webhook_events' as never)
          .insert({
            provider:          'telnyx',
            event_type:        eventType,
            provider_event_id: providerEventId,
            signature_valid:   sigValid,
            payload:           body,
            processing_status: 'pending',
          })

        // Unique constraint violation = duplicate — ack silently
        if (insertErr?.code === '23505') {
          return reply.code(200).send({ ok: true, duplicate: true })
        }
        if (insertErr) {
          console.error('[telnyx-webhook] webhook_events insert:', insertErr.message)
        }
      }

      if (!sigValid) {
        await markWebhookStatus(providerEventId, 'failed', 'invalid signature')
        return reply.code(401).send({ ok: false })
      }

      // Ack immediately — process async so Telnyx doesn't retry on slow ops
      reply.code(200).send({ ok: true })

      setImmediate(() => {
        void processWebhook(body, providerEventId)
      })
    },
  )
}

// ── Processing ────────────────────────────────────────────────────────────────

async function processWebhook(
  body:            TelnyxWebhookBody,
  providerEventId: string | null,
) {
  try {
    const { event_type, payload } = body.data

    if (event_type === 'message.received') {
      await handleInbound(payload)
    } else if (
      event_type === 'message.sent'      ||
      event_type === 'message.delivered' ||
      event_type === 'message.delivery.failed' ||
      event_type === 'message.finalized'
    ) {
      await handleDeliveryUpdate(payload, event_type)
    }

    await markWebhookStatus(providerEventId, 'processed')
  } catch (err) {
    console.error('[telnyx-webhook] processWebhook error:', err)
    await markWebhookStatus(providerEventId, 'failed', String(err))
  }
}

async function handleInbound(payload: TelnyxMessagePayload) {
  const fromE164 = payload.from.phone_number
  const toE164   = payload.to[0]?.phone_number ?? ''

  if (!fromE164 || !toE164) {
    console.warn('[telnyx-webhook] handleInbound: missing from/to', { fromE164, toE164 })
    return
  }

  // Resolve workspace from our Telnyx number
  const ws = await resolveWorkspaceByNumber(toE164)
  if (!ws) {
    console.warn('[telnyx-webhook] handleInbound: no workspace for number', toE164)
    return
  }

  const contactId      = await findOrCreateContact(ws.workspaceId, fromE164)
  const conversationId = await findOrCreateConversation({
    workspaceId: ws.workspaceId,
    fromE164,
    toE164,
    contactId,
  })
  if (!conversationId) return

  // Handle STOP/START before storing the message
  const optResult = await handleOptOutKeyword(ws.workspaceId, contactId, payload.text ?? '')
  if (optResult === 'opted_out') {
    console.info(`[telnyx-webhook] contact ${fromE164} opted out`)
    // Still store the message for audit purposes
  }

  const messageId = await insertInboundMessage({
    workspaceId:     ws.workspaceId,
    conversationId,
    telnyxMessageId: payload.id,
    body:            payload.text ?? '',
  })

  if (messageId) {
    await recordSmsInbound({
      workspaceId:     ws.workspaceId,
      sourceId:        messageId,
      occurredAt:      new Date(payload.received_at ?? Date.now()),
      fromE164,
      telnyxMessageId: payload.id,
    })
  }

  console.info(`[telnyx-webhook] inbound SMS from ${fromE164} → workspace ${ws.workspaceId}`)

  // ── Bot auto-reply ───────────────────────────────────────────────────────
  if (ws.botId && optResult !== 'opted_out') {
    try {
      const { reply, botPaused } = await processMessage({
        platform:        'sms',
        integrationId:   '',
        workspaceId:     ws.workspaceId,
        botId:           ws.botId,
        platformThreadId: fromE164,
        platformUserId:  fromE164,
        text:            payload.text ?? '',
      })

      if (reply && !botPaused) {
        const sendResult = await sendSms({
          from:               toE164,
          to:                 fromE164,
          body:               reply,
          messagingProfileId: ws.messagingProfileId ?? undefined,
        })

        if ('messageId' in sendResult) {
          const outId = await insertOutboundMessage({
            workspaceId:     ws.workspaceId,
            conversationId,
            telnyxMessageId: sendResult.messageId,
            body:            reply,
          })
          if (outId) {
            await recordSmsOutbound({
              workspaceId:     ws.workspaceId,
              sourceId:        outId,
              segments:        sendResult.segments,
              occurredAt:      new Date(),
              toE164:          fromE164,
              telnyxMessageId: sendResult.messageId,
            })
          }
        }
      }
    } catch (err) {
      console.error('[telnyx-webhook] bot auto-reply failed:', err)
    }
  }
}

async function handleDeliveryUpdate(payload: TelnyxMessagePayload, eventType: string) {
  // Update the message delivery status via platform_message_id
  const isFailed = eventType === 'message.delivery.failed'
  const { error } = await supabase
    .from('messages')
    .update({
      is_error:      isFailed,
      error_message: isFailed && payload.errors?.length
        ? payload.errors[0].detail
        : null,
    })
    .eq('platform_message_id', payload.id)

  if (error) console.error('[telnyx-webhook] handleDeliveryUpdate:', error.message)
}

async function markWebhookStatus(
  providerEventId: string | null,
  status:          string,
  error?:          string,
) {
  if (!providerEventId) return
  await supabase
    .from('webhook_events' as never)
    .update({
      processing_status: status,
      processed_at:      new Date().toISOString(),
      ...(error ? { error } : {}),
    })
    .eq('provider_event_id', providerEventId)
    .eq('provider', 'telnyx')
}
