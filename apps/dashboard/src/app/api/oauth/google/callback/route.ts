import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * Google OAuth2 callback.
 * Exchanges the auth code for tokens, gets the user's Gmail address,
 * and saves everything to sage_integrations.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state') ?? 'default'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=google_oauth_denied`)
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

  // ── 3. Identify the authenticated workspace user ─────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null

  if (!membership) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  // ── 4. Save / update integration ────────────────────────────────────────
  const config: Record<string, string> = {
    from_email:   email,
    access_token: tokens.access_token,
    expires_at:   new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    auth_method:  'oauth2',
  }
  // Only overwrite refresh_token when Google returns a new one
  if (tokens.refresh_token) {
    config.refresh_token = tokens.refresh_token
  } else {
    // Preserve existing refresh_token if we already have one stored
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('sage_integrations')
      .select('config')
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .maybeSingle()
    const existingConfig = ((existing as { config?: Record<string, string> } | null)?.config ?? {})
    if (existingConfig['refresh_token']) {
      config.refresh_token = existingConfig['refresh_token']
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('sage_integrations').upsert(
    {
      workspace_id: membership.workspace_id,
      user_id:      user.id,
      provider:     'gmail',
      status:       'connected',
      config,
    },
    { onConflict: 'workspace_id,user_id,provider' },
  )

  // ── 5. Redirect ──────────────────────────────────────────────────────────
  if (state === 'onboarding') {
    return NextResponse.redirect(`${appUrl}/dashboard`)
  }
  return NextResponse.redirect(`${appUrl}/integrations?connected=gmail`)
}
