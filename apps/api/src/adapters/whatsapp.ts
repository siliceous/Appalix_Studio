import { createHmac, timingSafeEqual } from 'crypto'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * WhatsApp Business (Meta Cloud API) Adapter
 *
 * Config keys (integration.config):
 *   phone_number_id  — your registered WhatsApp number ID
 *   access_token     — Meta permanent or temporary access token
 *   app_secret       — for X-Hub-Signature-256 verification
 *   verify_token     — for webhook verification challenge
 */

export function verifyWhatsAppSignature(
  rawBody: string,
  signature: string | undefined,
  appSecret: string,
): boolean {
  if (!signature || !appSecret) return false
  const [, hash] = signature.split('=')
  if (!hash) return false

  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
  } catch {
    return false
  }
}

export function parseWhatsAppEvents(
  body: WhatsAppWebhookPayload,
  ctx: IntegrationContext,
): IncomingMessage[] {
  const messages: IncomingMessage[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value?.messages) continue

      for (const msg of value.messages) {
        // Only handle text messages for now; media handled in future
        if (msg.type !== 'text' || !msg.text?.body) continue

        // Acknowledge read
        messages.push({
          platform:         'whatsapp',
          integrationId:    ctx.integrationId,
          workspaceId:      ctx.workspaceId,
          botId:            ctx.botId,
          // Use the sender's phone number as thread ID (one conversation per number)
          platformThreadId: msg.from,
          platformUserId:   msg.from,
          text:             msg.text.body,
          metadata: {
            message_id:     msg.id,
            phone_number_id: value.metadata?.phone_number_id,
          },
        })
      }
    }
  }

  return messages
}

export async function sendWhatsAppReply(
  reply:         OutgoingMessage,
  to:            string,
  phoneNumberId: string,
  accessToken:   string,
): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to,
        type:    'text',
        text:    { preview_url: false, body: reply.text },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error: ${err}`)
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface WhatsAppWebhookPayload {
  entry?: Array<{
    id: string
    changes?: Array<{
      value: {
        messaging_product: string
        metadata?: { phone_number_id: string }
        messages?: Array<{
          id:   string
          from: string
          type: string
          text?: { body: string }
        }>
      }
      field: string
    }>
  }>
}
