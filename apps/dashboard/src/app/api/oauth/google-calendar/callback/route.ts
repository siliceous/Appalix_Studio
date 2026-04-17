import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'

/**
 * Google Calendar OAuth2 callback.
 * Exchanges the auth code for tokens and saves them to sage_integrations
 * with provider = 'google_calendar'.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Decode state first so we always redirect to the correct return path
  let userId: string | null      = null
  let workspaceId: string | null = null
  let returnPath = '/sage/calendar'
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    userId      = parsed.uid ?? null
    workspaceId = parsed.wid ?? null
    returnPath  = parsed.ret ?? '/sage/calendar'
  } catch {
    return NextResponse.redirect(`${appUrl}/sage/calendar?gcal=error`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}${returnPath}?gcal=denied`)
  }

  if (!userId || !workspaceId) {
    return NextResponse.redirect(`${appUrl}${returnPath}?gcal=error`)
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri  = `${appUrl}/api/oauth/google-calendar/callback`

  // ── 1. Exchange code for tokens ────────────────────────────────────────────
  let tokens: { access_token?: string; refresh_token?: string; expires_in?: number; error?: string }
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })
    tokens = await res.json() as typeof tokens
  } catch {
    return NextResponse.redirect(`${appUrl}${returnPath}?gcal=token_failed`)
  }

  if (!tokens.access_token || tokens.error) {
    return NextResponse.redirect(`${appUrl}${returnPath}?gcal=token_failed`)
  }

  // ── 2. Get Google email ────────────────────────────────────────────────────
  let googleEmail = ''
  try {
    const res  = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const info = await res.json() as { email?: string }
    googleEmail = info.email ?? ''
  } catch { /* best-effort */ }

  // ── 3. Build config, preserve refresh_token if Google didn't return one ───
  const admin = createAdminClient()
  const config: Record<string, string> = {
    google_email:  googleEmail,
    access_token:  tokens.access_token,
    expires_at:    new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
  }

  if (tokens.refresh_token) {
    config.refresh_token = tokens.refresh_token
  } else {
    // Preserve existing refresh_token if present
    const { data: existing } = await admin
      .from('sage_integrations' as never)
      .select('config')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .maybeSingle() as unknown as { data: { config: Record<string, string> } | null }
    const rt = existing?.config?.refresh_token
    if (rt) config.refresh_token = rt
  }

  if (!config.refresh_token) {
    // No refresh token at all — flow won't be sustainable; surface error
    return NextResponse.redirect(`${appUrl}${returnPath}?gcal=no_refresh_token`)
  }

  // ── 4. Upsert into sage_integrations ──────────────────────────────────────
  const { error: upsertError } = await (admin
    .from('sage_integrations' as never)
    .upsert(
      {
        workspace_id: workspaceId,
        user_id:      userId,
        provider:     'google_calendar',
        status:       'connected',
        config,
      },
      { onConflict: 'workspace_id,user_id,provider' },
    ) as unknown as Promise<{ error: { message: string } | null }>)

  if (upsertError) {
    console.error('[oauth/google-calendar/callback] upsert failed:', upsertError.message)
    return NextResponse.redirect(`${appUrl}${returnPath}?gcal=save_failed`)
  }

  return NextResponse.redirect(`${appUrl}${returnPath}?gcal=connected`)
}
