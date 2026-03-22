/**
 * sage-notifications.ts
 *
 * Sends push + email notifications 15 minutes before:
 *   - Scheduled activities  (sage_deal_activities WHERE due_at IS NOT NULL)
 *   - Reminders             (sage_reminders)
 *
 * Called from the API server's background poller every 5 minutes.
 */

import { Resend } from 'resend'
import { supabase } from '../lib/supabase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpoMessage {
  to:    string
  title: string
  body:  string
  data?: Record<string, string>
  sound?: 'default'
}

// ---------------------------------------------------------------------------
// Push — Expo Push API (no SDK required on server)
// ---------------------------------------------------------------------------

async function sendPushBatch(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) return
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify(messages),
    })
    if (!res.ok) {
      console.error('[notif] Expo push error:', await res.text())
    }
  } catch (err) {
    console.error('[notif] Expo push fetch failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Email — Resend (workspace key, falls back to system key from env)
// ---------------------------------------------------------------------------

async function sendNotificationEmail(
  workspaceId: string,
  toEmail:     string,
  subject:     string,
  text:        string,
): Promise<void> {
  // Use workspace Resend key if configured, else system env key
  const { data: ws } = await supabase
    .from('workspaces')
    .select('automation_config')
    .eq('id', workspaceId)
    .single()

  const cfg      = (ws?.automation_config ?? {}) as Record<string, string>
  const apiKey   = cfg.resend_api_key ?? process.env.RESEND_API_KEY
  const fromAddr = cfg.email_from_address ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@appalix.com'

  if (!apiKey) {
    console.warn(`[notif] No Resend key for workspace ${workspaceId} — skipping email`)
    return
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({ from: fromAddr, to: [toEmail], subject, text })
    if (error) console.error('[notif] Resend error:', error.message)
  } catch (err) {
    console.error('[notif] Email send failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns push tokens for a user */
async function getTokensForUser(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_push_tokens')
    .select('token')
    .eq('user_id', userId)
  return (data ?? []).map((r: { token: string }) => r.token)
}

/** Returns the primary email for a user (auth.users via service role) */
async function getEmailForUser(userId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.admin.getUserById(userId)
  return user?.email ?? null
}

// ---------------------------------------------------------------------------
// Main poller
// ---------------------------------------------------------------------------

export async function pollDueNotifications(): Promise<void> {
  const now      = new Date()
  const windowLo = new Date(now.getTime() + 14 * 60 * 1000).toISOString() // 14 min from now
  const windowHi = new Date(now.getTime() + 16 * 60 * 1000).toISOString() // 16 min from now

  await Promise.all([
    pollActivities(windowLo, windowHi),
    pollReminders(windowLo, windowHi),
  ])
}

// ── Activities ───────────────────────────────────────────────────────────────

async function pollActivities(windowLo: string, windowHi: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from('sage_deal_activities')
    .select('id, deal_id, type, title, body, due_at, created_by, workspace_id')
    .not('due_at', 'is', null)
    .is('completed_at', null)
    .is('notif_sent_at', null)
    .gte('due_at', windowLo)
    .lte('due_at', windowHi)

  if (error) { console.error('[notif] activities query error:', error.message); return }
  if (!rows || rows.length === 0) return

  console.log(`[notif] sending notifications for ${rows.length} upcoming activity(ies)`)

  for (const row of rows as {
    id: string; deal_id: string; type: string; title: string | null; body: string | null;
    due_at: string; created_by: string | null; workspace_id: string
  }[]) {
    const userId = row.created_by
    if (!userId) continue

    const label   = row.title ?? row.body ?? row.type
    const dueTime = new Date(row.due_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const title   = 'Upcoming Activity'
    const message = `${row.type.charAt(0).toUpperCase() + row.type.slice(1)}: "${label}" at ${dueTime}`

    // Push
    const tokens = await getTokensForUser(userId)
    if (tokens.length > 0) {
      await sendPushBatch(tokens.map(to => ({
        to, title, body: message, sound: 'default' as const,
        data: { deepLink: `/(app)/deals/${row.deal_id}` },
      })))
    }

    // Email
    const email = await getEmailForUser(userId)
    if (email) {
      await sendNotificationEmail(
        row.workspace_id, email,
        `Reminder: ${label} in 15 minutes`,
        `Hi,\n\nYou have a scheduled ${row.type}: "${label}" at ${dueTime}.\n\nOpen the app to view the deal.\n\n— Appalix`,
      )
    }

    // Mark sent
    await supabase
      .from('sage_deal_activities')
      .update({ notif_sent_at: new Date().toISOString() })
      .eq('id', row.id)
  }
}

// ── Reminders ────────────────────────────────────────────────────────────────

async function pollReminders(windowLo: string, windowHi: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from('sage_reminders')
    .select('id, deal_id, title, note, due_at, workspace_id')
    .eq('is_sent', false)
    .is('notif_sent_at', null)
    .gte('due_at', windowLo)
    .lte('due_at', windowHi)

  if (error) { console.error('[notif] reminders query error:', error.message); return }
  if (!rows || rows.length === 0) return

  console.log(`[notif] sending notifications for ${rows.length} upcoming reminder(s)`)

  // We need the owner — join via sage_deals
  for (const row of rows as {
    id: string; deal_id: string; title: string; note: string | null;
    due_at: string; workspace_id: string
  }[]) {
    const { data: deal } = await supabase
      .from('sage_deals')
      .select('owner_id, title')
      .eq('id', row.deal_id)
      .single()

    const userId = deal?.owner_id
    if (!userId) continue

    const dueTime = new Date(row.due_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const pushTitle   = 'Reminder'
    const pushMessage = `"${row.title}" at ${dueTime}${row.note ? ` — ${row.note}` : ''}`

    // Push
    const tokens = await getTokensForUser(userId)
    if (tokens.length > 0) {
      await sendPushBatch(tokens.map(to => ({
        to, title: pushTitle, body: pushMessage, sound: 'default' as const,
        data: { deepLink: `/(app)/deals/${row.deal_id}` },
      })))
    }

    // Email
    const email = await getEmailForUser(userId)
    if (email) {
      await sendNotificationEmail(
        row.workspace_id, email,
        `Reminder in 15 minutes: ${row.title}`,
        `Hi,\n\nThis is a reminder: "${row.title}" is scheduled at ${dueTime}.\n${row.note ? `Note: ${row.note}\n` : ''}\nDeal: ${deal?.title ?? 'unknown'}\n\n— Appalix`,
      )
    }

    // Mark pre-notification sent (does NOT change is_sent — that fires at due time)
    await supabase
      .from('sage_reminders')
      .update({ notif_sent_at: new Date().toISOString() })
      .eq('id', row.id)
  }
}
