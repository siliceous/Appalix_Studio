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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ImapCreds {
  host: string
  port: number
  auth: { user: string; pass: string }
}

function getImapCreds(
  provider: string,
  config:   Record<string, string>,
): ImapCreds | null {
  const email    = config.from_email
  const password = config.app_password ?? config.password
  if (!email || !password) return null
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
      const userId = row.user_id as string
      const wsId   = row.workspace_id as string
      if (activeLoops.has(userId)) continue  // already running

      const creds = getImapCreds(
        row.provider as string,
        row.config   as Record<string, string>,
      )
      if (!creds) continue

      const stop = startIdleForWorkspace(wsId, userId, creds)
      activeLoops.set(userId, stop)
      console.log(`[IDLE] started loop for workspace=${wsId} user=${userId} (${row.provider as string})`)

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
