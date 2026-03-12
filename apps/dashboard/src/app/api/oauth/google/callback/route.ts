import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Google OAuth2 callback.
 * Exchanges the auth code for tokens, gets the user's Gmail address,
 * and saves everything to sage_integrations.
 *
 * User identity (uid, wid) is read from the state parameter so this
 * works even if the session cookie is not available after the redirect.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=google_oauth_denied`)
  }

  // Decode state — supports both new base64url JSON and legacy plain strings
  let flow = 'default'
  let userId: string | null = null
  let workspaceId: string | null = null
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    flow        = parsed.flow ?? 'default'
    userId      = parsed.uid  ?? null
    workspaceId = parsed.wid  ?? null
  } catch {
    // Legacy: state is a plain string like 'onboarding' or 'default'
    flow = rawState || 'default'
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri  = `${appUrl}/api/oauth/google/callback`

  // ── 1. Exchange code for tokens ─────────────────────────────────────────
  let tokens: { access_token?: string; refresh_token?: string; expires_in?: number }
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
    return NextResponse.redirect(`${appUrl}/integrations?error=google_token_failed`)
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(`${appUrl}/integrations?error=google_token_failed`)
  }

  // ── 2. Get the user's Gmail address ─────────────────────────────────────
  let email: string
  try {
    const res  = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const info = await res.json() as { email?: string }
    email = info.email ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=google_userinfo_failed`)
  }

  if (!email) {
    return NextResponse.redirect(`${appUrl}/integrations?error=google_email_missing`)
  }

  // ── 3. Identify the workspace user ───────────────────────────────────────
  // Prefer identity from state; fall back to session cookie
  const supabase = await createClient()
  if (!userId || !workspaceId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${appUrl}/login`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membershipRaw } = await (supabase as any)
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    const membership = membershipRaw as { workspace_id: string } | null
    if (!membership) return NextResponse.redirect(`${appUrl}/login`)

    userId      = user.id
    workspaceId = membership.workspace_id
  }

  // ── 4. Save / update integration ────────────────────────────────────────
  const admin = createAdminClient()
  const config: Record<string, string> = {
    from_email:   email,
    access_token: tokens.access_token,
    expires_at:   new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    auth_method:  'oauth2',
  }
  if (tokens.refresh_token) {
    config.refresh_token = tokens.refresh_token
  } else {
    const { data: existing } = await admin
      .from('sage_integrations' as never)
      .select('config')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .maybeSingle()
    const existingConfig = ((existing as { config?: Record<string, string> } | null)?.config ?? {})
    if (existingConfig['refresh_token']) {
      config.refresh_token = existingConfig['refresh_token']
    }
  }

  const { error: upsertError } = await (admin.from('sage_integrations' as never).upsert(
    {
      workspace_id: workspaceId,
      user_id:      userId,
      provider:     'gmail',
      status:       'connected',
      config,
    },
    { onConflict: 'workspace_id,user_id,provider' },
  ) as unknown as Promise<{ error: { message: string; code: string } | null }>)

  if (upsertError) {
    console.error('[oauth/google/callback] upsert failed:', JSON.stringify(upsertError))
    return NextResponse.redirect(`${appUrl}/integrations?error=save_failed&detail=${encodeURIComponent(upsertError.message)}`)
  }

  // ── 5. Kick off an initial sync in the background ───────────────────────
  const apiBase    = process.env.API_BASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (apiBase && serviceKey) {
    fetch(`${apiBase}/sage/emails/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': serviceKey },
      body:    JSON.stringify({ workspace_id: workspaceId, user_id: userId, limit: 50 }),
    }).catch(() => {/* best-effort — don't block the redirect */})
  }

  // ── 6. Redirect ──────────────────────────────────────────────────────────
  if (flow === 'onboarding') {
    return NextResponse.redirect(`${appUrl}/dashboard`)
  }
  return NextResponse.redirect(`${appUrl}/sage/emails?syncing=1`)
}
