/**
 * Sage Email IDLE — real-time push inbox
 *
 * Keeps one persistent IMAP IDLE connection open per connected workspace.
 * When the mail server signals a new message (EXISTS response) the loop
 * immediately calls syncEmailsForWorkspace so emails appear without any
 * manual "Sync" click.
 *
 * imapflow's client.idle() resolves with `true` whenever the server sends
 * an untagged response (EXISTS, EXPUNGE, FETCH) — that's our push signal.
 * It resolves with `false` only when the connection drops, at which point
 * we reconnect with exponential back-off (5 s → 10 s → … → 5 min max).
 *
 * The manager (startIdleManager / stopIdleManager) loads all connected
 * gmail/microsoft integrations on startup and re-checks every 5 minutes
 * so newly-connected accounts are picked up automatically.
 */
import { ImapFlow }               from 'imapflow'
import { supabase }               from '../lib/supabase.js'
import { syncEmailsForWorkspace } from './sage-email-sync.js'
import { getValidAccessToken }    from './oauth-token-refresh.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ImapCreds {
  host: string
  port: number
  auth: { user: string; pass?: string; accessToken?: string }
}

/** Resolves IMAP credentials, handling both OAuth2 and app-password flows. */
async function resolveImapCreds(
  workspaceId: string,
  userId:      string,
  provider:    string,
  config:      Record<string, string>,
): Promise<ImapCreds | null> {
  const email = config.from_email
  if (!email) return null

  if (config.auth_method === 'oauth2') {
    const token = await getValidAccessToken(workspaceId, userId, provider as 'gmail' | 'microsoft', config)
    if (!token) return null
    if (provider === 'gmail')     return { host: 'imap.gmail.com',        port: 993, auth: { user: email, accessToken: token } }
    if (provider === 'microsoft') return { host: 'outlook.office365.com', port: 993, auth: { user: email, accessToken: token } }
    return null
  }

  // App-password fallback
  const password = config.app_password ?? config.password
  if (!password) return null
  if (provider === 'gmail')     return { host: 'imap.gmail.com',        port: 993, auth: { user: email, pass: password } }
  if (provider === 'microsoft') return { host: 'outlook.office365.com', port: 993, auth: { user: email, pass: password } }
  return null
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Per-workspace IDLE loop
// ---------------------------------------------------------------------------

/**
 * Starts an IDLE loop for one workspace.
 * Returns a stop() function — call it to gracefully shut the loop down.
 */
export function startIdleForWorkspace(
  workspaceId: string,
  userId:       string,
  creds:        ImapCreds,
): () => void {
  let running = true
  const label = `workspace=${workspaceId} user=${userId}`

  async function loop() {
    let backoff = 5_000  // 5 s initial reconnect delay

    while (running) {
      const client = new ImapFlow({
        host:   creds.host,
        port:   creds.port,
        secure: true,
        auth:   creds.auth,
        logger: false,  // suppress verbose IMAP wire logs
      })

      try {
        await client.connect()
        backoff = 5_000  // reset on successful connect

        const lock = await client.getMailboxLock('INBOX')
        try {
          console.log(`[IDLE] ${label} connected, waiting for mail…`)

          while (running) {
            const hasNew = await client.idle()

            if (!running) break

            if (hasNew) {
              try {
                await syncEmailsForWorkspace(workspaceId, userId, 20)
              } catch (syncErr) {
                console.error(`[IDLE] sync error for ${label}:`, (syncErr as Error).message)
              }
            } else {
              break
            }
          }
        } finally {
          lock.release()
        }

        if (running) await client.logout()
      } catch (err) {
        console.error(`[IDLE] ${label} connection error:`, (err as Error).message)
      } finally {
        try { await client.logout() } catch { /* ignore */ }
      }

      if (running) {
        console.log(`[IDLE] ${label} reconnecting in ${backoff / 1000}s…`)
        await sleep(backoff)
        backoff = Math.min(backoff * 2, 300_000)  // cap at 5 min
      }
    }

    console.log(`[IDLE] ${label} loop stopped`)
  }

  void loop()
  return () => { running = false }
}

// ---------------------------------------------------------------------------
// Gmail API poll loop (replaces IMAP IDLE — gmail.readonly scope)
// ---------------------------------------------------------------------------

/**
 * Polls Gmail API every 60 s for new Inbox messages.
 * Calls syncEmailsForWorkspace when new mail is detected.
 * Returns a stop() function identical to the IMAP IDLE interface.
 */
export function startGmailPollForWorkspace(
  workspaceId: string,
  userId:      string,
  config:      Record<string, string>,
): () => void {
  let running = true
  const label = `workspace=${workspaceId} user=${userId}`

  async function markDisconnected() {
    await supabase
      .from('sage_integrations')
      .update({ status: 'disconnected' })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'gmail')
    running = false
  }

  async function loop() {
    // Initial catch-up sync
    try {
      await syncEmailsForWorkspace(workspaceId, userId, 50)
    } catch (err) {
      const msg = (err as Error).message
      console.error(`[Gmail poll] catch-up sync failed for ${label}:`, msg)
      if (msg.includes('401') || msg.includes('invalid_grant') || msg.includes('unauthorized')) {
        console.warn(`[Gmail poll] auth error for ${label} — token revoked, stopping loop`)
        await markDisconnected()
        return
      }
    }

    // Track the newest message id we have seen to detect new arrivals
    let lastMessageId: string | null = null

    while (running) {
      await sleep(60_000)
      if (!running) break

      try {
        const token = await getValidAccessToken(workspaceId, userId, 'gmail', config)
        if (!token) {
          console.warn(`[Gmail poll] no valid token for ${label} — token revoked, stopping loop`)
          await markDisconnected()
          break
        }

        // Check if there is any message newer than what we last saw
        const checkUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&labelIds=INBOX&q=-is:spam+-is:draft'
        const res = await fetch(checkUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          console.warn(`[Gmail poll] 401 on poll check for ${label} — stopping loop`)
          await markDisconnected()
          break
        }
        if (!res.ok) continue

        const data = await res.json() as { messages?: { id: string }[] }
        const newestId = data.messages?.[0]?.id ?? null

        if (newestId && newestId !== lastMessageId) {
          lastMessageId = newestId
          console.log(`[Gmail poll] ${label} new mail detected — syncing`)
          await syncEmailsForWorkspace(workspaceId, userId, 20)
        }
      } catch (err) {
        console.error(`[Gmail poll] error for ${label}:`, (err as Error).message)
      }
    }

    console.log(`[Gmail poll] ${label} loop stopped`)
  }

  void loop()
  return () => { running = false }
}

// ---------------------------------------------------------------------------
// Microsoft Graph API poll loop (replaces IMAP IDLE for personal accounts)
// ---------------------------------------------------------------------------

/**
 * Polls Graph API every 60 s for new Inbox messages.
 * Calls syncEmailsForWorkspace when new mail is detected.
 * Returns a stop() function identical to the IMAP IDLE interface.
 */
export function startGraphPollForWorkspace(
  workspaceId: string,
  userId:      string,
  config:      Record<string, string>,
): () => void {
  let running = true
  const label = `workspace=${workspaceId} user=${userId}`

  async function loop() {
    // Start 2 minutes in the past so we catch any mail that arrived during startup
    let lastChecked = new Date(Date.now() - 2 * 60 * 1000)

    // Initial catch-up sync
    try {
      await syncEmailsForWorkspace(workspaceId, userId, 50)
    } catch (err) {
      console.error(`[Graph poll] catch-up sync failed for ${label}:`, (err as Error).message)
    }

    while (running) {
      await sleep(60_000)
      if (!running) break

      try {
        const token = await getValidAccessToken(workspaceId, userId, 'microsoft', config)
        if (!token) continue

        const isoTime = lastChecked.toISOString()
        const url = `https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$filter=receivedDateTime gt ${isoTime}&$top=1&$select=id`

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        lastChecked = new Date()

        if (!res.ok) continue

        const data = await res.json() as { value?: unknown[] }
        if (data.value && data.value.length > 0) {
          console.log(`[Graph poll] ${label} new mail detected — syncing`)
          await syncEmailsForWorkspace(workspaceId, userId, 20)
        }
      } catch (err) {
        console.error(`[Graph poll] error for ${label}:`, (err as Error).message)
      }
    }

    console.log(`[Graph poll] ${label} loop stopped`)
  }

  void loop()
  return () => { running = false }
}

// ---------------------------------------------------------------------------
// Manager — one loop per connected workspace
// ---------------------------------------------------------------------------

const activeLoops = new Map<string, () => void>()
let   managerRunning = false
let   managerTimer:   ReturnType<typeof setTimeout> | null = null

async function syncActiveIntegrations() {
  try {
    const { data: integrations } = await supabase
      .from('sage_integrations')
      .select('workspace_id, user_id, provider, config')
      .eq('status', 'connected')
      .in('provider', ['gmail', 'microsoft'])

    // Key loops by user_id (each user has their own IMAP connection)
    const connected = new Set((integrations ?? []).map(i => i.user_id as string))

    // Stop loops for integrations that were disconnected
    for (const [uid, stop] of activeLoops) {
      if (!connected.has(uid)) {
        stop()
        activeLoops.delete(uid)
        console.log(`[IDLE] stopped loop for disconnected user=${uid}`)
      }
    }

    // Start loops for newly connected integrations
    for (const row of integrations ?? []) {
      const userId   = row.user_id as string
      const wsId     = row.workspace_id as string
      const provider = row.provider as string
      const cfg      = row.config as Record<string, string>
      if (activeLoops.has(userId)) continue  // already running

      // Gmail OAuth2 → Gmail API polling (replaces IMAP IDLE, requires only gmail.readonly scope)
      if (provider === 'gmail' && cfg.auth_method === 'oauth2') {
        const stop = startGmailPollForWorkspace(wsId, userId, cfg)
        activeLoops.set(userId, stop)
        console.log(`[Gmail poll] started for workspace=${wsId} user=${userId}`)
        continue
      }

      // Microsoft OAuth2 → Graph API polling (IMAP IDLE unreliable for personal accounts)
      if (provider === 'microsoft' && cfg.auth_method === 'oauth2') {
        const stop = startGraphPollForWorkspace(wsId, userId, cfg)
        activeLoops.set(userId, stop)
        console.log(`[Graph poll] started for workspace=${wsId} user=${userId}`)
        continue
      }

      const creds = await resolveImapCreds(wsId, userId, provider, cfg)
      if (!creds) continue

      const stop = startIdleForWorkspace(wsId, userId, creds)
      activeLoops.set(userId, stop)
      console.log(`[IDLE] started loop for workspace=${wsId} user=${userId} (${provider})`)

      // Catch-up sync: fetch latest emails that may have arrived during downtime
      syncEmailsForWorkspace(wsId, userId, 50).catch((err: unknown) => {
        console.error(`[IDLE] catch-up sync failed for workspace=${wsId} user=${userId}:`, (err as Error).message)
      })
    }
  } catch (err) {
    console.error('[IDLE] manager sync error:', (err as Error).message)
  }
}

/** Call once after the HTTP server is up. */
export async function startIdleManager() {
  if (managerRunning) return
  managerRunning = true

  await syncActiveIntegrations()

  // Re-check every 5 min to pick up newly connected / disconnected accounts
  function schedule() {
    managerTimer = setTimeout(async () => {
      if (!managerRunning) return
      await syncActiveIntegrations()
      schedule()
    }, 5 * 60 * 1000)
  }
  schedule()

  console.log('[IDLE] manager started')
}

/** Cleanly shuts down all IDLE loops (e.g. on process SIGTERM). */
export function stopIdleManager() {
  managerRunning = false
  if (managerTimer) clearTimeout(managerTimer)
  for (const stop of activeLoops.values()) stop()
  activeLoops.clear()
  console.log('[IDLE] manager stopped')
}
