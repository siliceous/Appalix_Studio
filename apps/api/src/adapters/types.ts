// ============================================================
// Unified adapter types
// Every platform normalises its incoming payload to IncomingMessage
// and formats its reply from OutgoingMessage.
// ============================================================

export type Platform =
  | 'slack'
  | 'google_chat'
  | 'facebook_messenger'
  | 'whatsapp'
  | 'wordpress'
  | 'web_widget'
  | 'custom_api'

/** Normalised inbound message from any platform */
export interface IncomingMessage {
  /** Which platform sent this */
  platform: Platform

  /** Integration row ID in our DB */
  integrationId: string

  /** Workspace ID (resolved from integration) */
  workspaceId: string

  /** Bot ID to use (from integration.bot_id) */
  botId: string

  /** Platform's own thread / channel / session identifier */
  platformThreadId: string

  /** Platform's own user identifier (PSID, user_id, phone, etc.) */
  platformUserId?: string

  /** The text the user sent */
  text: string

  /** User's local time as ISO string, e.g. "2026-03-01T14:32:00+11:00" */
  clientTime?: string

  /** User's IANA timezone, e.g. "Australia/Sydney" */
  clientTimezone?: string

  /** Extra context the platform provides (e.g. channel name, team) */
  metadata?: Record<string, unknown>
}

/** What we want to send back to the platform */
export interface OutgoingMessage {
  /** Plain text reply (always set) */
  text: string

  /** Optional structured card/block payload (platform-specific) */
  blocks?: unknown
}

/** Resolved integration + bot config from the DB */
export interface IntegrationContext {
  integrationId: string
  workspaceId:   string
  botId:         string
  platform:      Platform
  config:        Record<string, unknown>
}
