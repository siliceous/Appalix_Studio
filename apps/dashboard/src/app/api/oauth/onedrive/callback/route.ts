import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'

/**
 * Microsoft OneDrive OAuth2 callback.
 * Exchanges the auth code for tokens and saves them to sage_integrations
 * with provider = 'onedrive'.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=onedrive_oauth_denied`)
  }

  // Decode state
  let userId: string | null      = null
  let workspaceId: string | null = null
  let returnPath = '/integrations'
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    userId      = parsed.uid ?? null
    workspaceId = parsed.wid ?? null
    returnPath  = parsed.ret ?? '/integrations'
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=onedrive_state_invalid`)
  }

  if (!userId || !workspaceId) {
    return NextResponse.redirect(`${appUrl}/integrations?error=onedrive_state_invalid`)
  }

  const clientId     = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const redirectUri  = `${appUrl}/api/oauth/onedrive/callback`

  const scope = [
    'https://graph.microsoft.com/Files.ReadWrite.All',
    'https://graph.microsoft.com/Sites.Read.All',
    'offline_access',
    'openid',
    'email',
  ].join(' ')

  // ── 1. Exchange code for tokens ──────────────────────────────────────────
  let tokens: { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error?: string; error_description?: string }
  try {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
        scope,
      }),
    })
    const body = await res.json() as typeof tokens
    if (!res.ok || body.error) {
      console.error('[oauth/onedrive/callback] token error:', body.error, body.error_description)
      return NextResponse.redirect(`${appUrl}/integrations?error=onedrive_token_failed`)
    }
    tokens = body
  } catch (e) {
    console.error('[oauth/onedrive/callback] token fetch threw:', e)
    return NextResponse.redirect(`${appUrl}/integrations?error=onedrive_token_failed`)
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(`${appUrl}/integrations?error=onedrive_token_failed`)
  }

  // ── 2. Get user email via Microsoft Graph ────────────────────────────────
  let email = ''
  try {
    const res  = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const info = await res.json() as { mail?: string; userPrincipalName?: string }
    email = info.mail ?? info.userPrincipalName ?? ''
  } catch { /* best-effort */ }

  // Fallback: extract from id_token
  if (!email && tokens.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString())
      email = payload.email ?? payload.preferred_username ?? payload.upn ?? ''
    } catch { /* ignore */ }
  }

  // ── 3. Build config, preserve refresh_token if not returned ─────────────
  const admin = createAdminClient()
  const config: Record<string, string> = {
    microsoft_email: email,
    access_token:    tokens.access_token,
    expires_at:      new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
  }

  if (tokens.refresh_token) {
    config.refresh_token = tokens.refresh_token
  } else {
    const { data: existing } = await admin
      .from('sage_integrations' as never)
      .select('config')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'onedrive')
      .maybeSingle() as unknown as { data: { config: Record<string, string> } | null }
    const rt = existing?.config?.refresh_token
    if (rt) config.refresh_token = rt
  }

  // ── 4. Upsert into sage_integrations ────────────────────────────────────
  const { error: upsertError } = await (admin
    .from('sage_integrations' as never)
    .upsert(
      {
        workspace_id: workspaceId,
        user_id:      userId,
        provider:     'onedrive',
        status:       'connected',
        config,
      },
      { onConflict: 'workspace_id,user_id,provider' },
    ) as unknown as Promise<{ error: { message: string } | null }>)

  if (upsertError) {
    console.error('[oauth/onedrive/callback] upsert failed:', upsertError.message)
    return NextResponse.redirect(`${appUrl}/integrations?error=onedrive_save_failed`)
  }

  return NextResponse.redirect(`${appUrl}${returnPath}?connected=1&provider=onedrive`)
}
