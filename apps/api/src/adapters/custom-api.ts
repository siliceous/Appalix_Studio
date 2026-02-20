import { timingSafeEqual } from 'crypto'
import type { IncomingMessage, IntegrationContext, OutgoingMessage } from './types.js'

/**
 * Custom API Adapter
 *
 * A generic REST adapter for any custom integration.
 * Callers authenticate with an API key in the X-API-Key header.
 *
 * Request:
 *   POST /webhooks/custom/:integrationId
 *   X-API-Key: <api_key>
 *   {
 *     "message": "...",
 *     "thread_id": "...",   // caller's own thread/session identifier
 *     "user_id":  "...",    // optional caller's user identifier
 *     "metadata": {}
 *   }
 *
 * Response (synchronous):
 *   { "reply": "...", "conversation_id": "..." }
 *
 * Config keys (integration.config):
 *   api_key       — the secret the caller must include
 *   allowed_ips   — optional array of allowed IP addresses
 */

export function verifyCustomApiKey(
  providedKey: string | undefined,
  storedKey:   string,
): boolean {
  if (!providedKey || !storedKey) return false
  try {
    return timingSafeEqual(Buffer.from(providedKey), Buffer.from(storedKey))
  } catch {
    return false
  }
}

export function parseCustomApiRequest(
  body:        CustomApiRequestBody,
  ctx:         IntegrationContext,
  remoteIp?:  string,
): IncomingMessage | null {
  const text = body.message?.trim()
  if (!text) return null

  // Optional IP allowlist check
  const allowedIps = (ctx.config.allowed_ips as string[] | undefined) ?? []
  if (allowedIps.length > 0 && remoteIp && !allowedIps.includes(remoteIp)) return null

  return {
    platform:         'custom_api',
    integrationId:    ctx.integrationId,
    workspaceId:      ctx.workspaceId,
    botId:            ctx.botId,
    platformThreadId: body.thread_id ?? 'default',
    platformUserId:   body.user_id,
    text,
    metadata:         body.metadata ?? {},
  }
}

export function formatCustomApiReply(
  reply: OutgoingMessage,
  conversationId: string,
): CustomApiResponseBody {
  return {
    reply:           reply.text,
    conversation_id: conversationId,
  }
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface CustomApiRequestBody {
  message:    string
  thread_id?: string
  user_id?:   string
  metadata?:  Record<string, unknown>
}

interface CustomApiResponseBody {
  reply:           string
  conversation_id: string
}
