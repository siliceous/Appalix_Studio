import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Web Widget Adapter
 *
 * The embeddable JS chat widget calls:
 *   POST /chat/:integrationId
 *   { "message": "...", "session_id": "...", "metadata": {} }
 *
 * Auth: the integration ID itself acts as a public token.
 * Optionally restrict by allowed_origins in integration.config.
 *
 * Config keys (integration.config):
 *   allowed_origins  — array of allowed CORS origin URLs
 *   theme            — widget theme config (colours etc.)
 */

export function parseWebWidgetRequest(
  body: WebWidgetRequestBody,
  ctx: IntegrationContext,
): IncomingMessage | null {
  const text = body.message?.trim()
  if (!text) return null

  return {
    platform:         'web_widget',
    integrationId:    ctx.integrationId,
    workspaceId:      ctx.workspaceId,
    botId:            ctx.botId,
    platformThreadId: body.session_id ?? 'anon',
    platformUserId:   body.session_id,
    text,
    metadata:         body.metadata ?? {},
  }
}

export function formatWebWidgetReply(
  reply: OutgoingMessage,
  conversationId: string,
): WebWidgetResponseBody {
  return {
    reply:           reply.text,
    conversation_id: conversationId,
  }
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!allowedOrigins.length) return true  // no restriction configured
  if (!origin) return false
  return allowedOrigins.some((allowed) => {
    if (allowed === '*') return true
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      return origin.endsWith(domain)
    }
    return origin === allowed
  })
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface WebWidgetRequestBody {
  message:     string
  session_id?: string
  metadata?:   Record<string, unknown>
}

interface WebWidgetResponseBody {
  reply:           string
  conversation_id: string
}
