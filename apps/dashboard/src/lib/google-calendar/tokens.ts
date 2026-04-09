/**
 * Google Calendar token management.
 *
 * Server-only — never import this from a client component.
 * All DB writes use the admin client to bypass RLS.
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface GoogleCalendarTokens {
  access_token:  string
  refresh_token: string
  expires_at:    string
  google_email:  string
}

type AdminClient = ReturnType<typeof createAdminClient>

// ── Fetch raw tokens from sage_integrations ───────────────────────────────────

export async function getCalendarTokens(
  admin: AdminClient,
  userId: string,
  workspaceId: string,
): Promise<GoogleCalendarTokens | null> {
  const { data } = await admin
    .from('sage_integrations' as never)
    .select('config, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle() as unknown as { data: { config: Record<string, string>; status: string } | null }

  if (!data || data.status !== 'connected') return null
  const cfg = data.config
  if (!cfg?.access_token || !cfg?.refresh_token) return null

  return {
    access_token:  cfg.access_token,
    refresh_token: cfg.refresh_token,
    expires_at:    cfg.expires_at ?? new Date(0).toISOString(),
    google_email:  cfg.google_email ?? '',
  }
}

// ── Return a ready-to-use access token, refreshing if needed ──────────────────

export async function getValidAccessToken(
  admin: AdminClient,
  userId: string,
  workspaceId: string,
): Promise<string | null> {
  const tokens = await getCalendarTokens(admin, userId, workspaceId)
  if (!tokens) return null

  // Still valid? (5-minute buffer)
  if (Date.now() < new Date(tokens.expires_at).getTime() - 5 * 60 * 1000) {
    return tokens.access_token
  }

  // Refresh
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token,
        grant_type:    'refresh_token',
      }),
    })
    const data = await res.json() as { access_token?: string; expires_in?: number; error?: string }

    if (!data.access_token || data.error) {
      await admin
        .from('sage_integrations' as never)
        .update({ status: 'error' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('provider', 'google_calendar')
      return null
    }

    const newExpiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()

    await admin
      .from('sage_integrations' as never)
      .update({
        config: {
          google_email:  tokens.google_email,
          refresh_token: tokens.refresh_token,
          access_token:  data.access_token,
          expires_at:    newExpiresAt,
        },
      })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')

    return data.access_token
  } catch {
    return null
  }
}
