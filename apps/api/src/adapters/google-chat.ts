import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Google Chat Adapter
 *
 * Google Chat calls our endpoint synchronously and expects a JSON response body.
 * No separate HTTP reply call needed — we return the response directly.
 *
 * Config keys (integration.config):
 *   service_account_json  — for verifying the JWT bearer token (optional for internal bots)
 *   space_name            — the Google Chat space this integration covers
 *
 * Authentication: Google Chat sends a Bearer JWT signed with Google's keys.
 * For simplicity we verify the audience matches our endpoint URL.
 */

export function parseGoogleChatEvent(
  body: GoogleChatEventPayload,
  ctx: IntegrationContext,
): IncomingMessage | null {
  // Only handle MESSAGE events
  if (body.type !== 'MESSAGE') return null

  const text = body.message?.text?.trim()
  if (!text) return null

  // Strip @mention of the bot
  const cleanText = text.replace(/@\S+/g, '').trim()
  if (!cleanText) return null

  const threadName   = body.message?.thread?.name ?? body.space?.name ?? 'unknown'
  const senderEmail  = body.message?.sender?.email ?? ''
  const senderName   = senderEmail || body.message?.sender?.displayName || body.message?.sender?.name || 'unknown'

  return {
    platform:         'google_chat',
    integrationId:    ctx.integrationId,
    workspaceId:      ctx.workspaceId,
    botId:            ctx.botId,
    platformThreadId: threadName,
    platformUserId:   senderName,
    text:             cleanText,
    metadata: {
      space_name:    body.space?.name,
      message_name:  body.message?.name,
      sender_email:  body.message?.sender?.email,
    },
  }
}

/** Format a reply as a Google Chat card response */
export function formatGoogleChatReply(reply: OutgoingMessage): GoogleChatResponse {
  return {
    text: reply.text,
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface GoogleChatEventPayload {
  type: string
  space?: { name: string; type: string }
  message?: {
    name:   string
    text:   string
    sender: { name: string; email?: string; displayName?: string }
    thread: { name: string }
  }
}

interface GoogleChatResponse {
  text?: string
  cardsV2?: unknown[]
}
