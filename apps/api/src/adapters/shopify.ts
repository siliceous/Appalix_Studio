import { createHmac, timingSafeEqual } from 'crypto'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Shopify Adapter
 *
 * Handles inbound messages from Shopify Inbox (customer chat) and
 * replies via the Shopify Admin API.
 *
 * Config keys (integration.config):
 *   shop_domain    — e.g. "mystore.myshopify.com"
 *   access_token   — Shopify Admin API access token (X-Shopify-Access-Token)
 *   webhook_secret — shared secret for HMAC-SHA256 signature verification
 *
 * Shopify sends HMAC as base64(HMAC-SHA256(secret, rawBody))
 * in the X-Shopify-Hmac-Sha256 header.
 */

export function verifyShopifySignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export function parseShopifyEvents(
  body: ShopifyWebhookPayload,
  topic: string,
  ctx: IntegrationContext,
): IncomingMessage[] {
  const messages: IncomingMessage[] = []

  // Shopify Inbox: conversations/create or messages/create
  if (topic === 'conversations/create' || topic === 'messages/create') {
    const message = body.message ?? body.messages?.[0]
    if (!message?.body) return messages

    // Only process messages from the customer (not from merchants/bots)
    if (message.author?.type === 'merchant' || message.author?.type === 'bot') return messages

    const conversationId = String(body.id ?? body.conversation_id ?? 'unknown')
    const customerId     = String(body.customer?.id ?? message.author?.id ?? conversationId)

    messages.push({
      platform:         'shopify',
      integrationId:    ctx.integrationId,
      workspaceId:      ctx.workspaceId,
      botId:            ctx.botId,
      platformThreadId: conversationId,
      platformUserId:   customerId,
      text:             message.body,
      metadata: {
        topic,
        conversation_id: conversationId,
        customer_email:  body.customer?.email,
        customer_name:   body.customer
          ? `${body.customer.first_name ?? ''} ${body.customer.last_name ?? ''}`.trim()
          : undefined,
        message_id: String(message.id),
        shop_domain: (ctx.config as Record<string, string>).shop_domain,
      },
    })
  }

  return messages
}

export async function sendShopifyReply(
  reply:          OutgoingMessage,
  conversationId: string,
  shopDomain:     string,
  accessToken:    string,
): Promise<void> {
  // Shopify Admin API: POST a message to a conversation
  // REST endpoint: POST /admin/api/2024-01/conversations/{id}/messages.json
  const url = `https://${shopDomain}/admin/api/2024-01/conversations/${conversationId}/messages.json`

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      message: {
        body:   reply.text,
        author: { type: 'bot' },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify API error (${res.status}): ${err}`)
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface ShopifyAuthor {
  id?:   number | string
  type?: 'customer' | 'merchant' | 'bot'
  name?: string
}

interface ShopifyMessage {
  id:      number | string
  body:    string
  author?: ShopifyAuthor
}

interface ShopifyCustomer {
  id?:         number | string
  email?:      string
  first_name?: string
  last_name?:  string
}

interface ShopifyWebhookPayload {
  id?:              number | string
  conversation_id?: number | string
  customer?:        ShopifyCustomer
  message?:         ShopifyMessage
  messages?:        ShopifyMessage[]
}
