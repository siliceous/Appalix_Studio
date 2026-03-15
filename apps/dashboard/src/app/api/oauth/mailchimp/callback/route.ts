import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'

/**
 * Mailchimp OAuth2 callback.
 * Exchanges the authorization code for an access token, fetches the user's
 * data centre prefix and first audience ID, then upserts a sage_integration
 * row and redirects back to the integrations page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(searchParams.get('error') ?? 'access_denied')}`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_code`)
  }

  // ── 1. Decode state ──────────────────────────────────────────────────────
  let uid = '', wid = '', onboarding = false
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid        = parsed.uid  ?? ''
    wid        = parsed.wid  ?? ''
    onboarding = parsed.flow === 'onboarding'
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=invalid_state`)
  }

  if (!uid || !wid) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_context`)
  }

  const clientId     = process.env.MAILCHIMP_CLIENT_ID     ?? ''
  const clientSecret = process.env.MAILCHIMP_CLIENT_SECRET ?? ''
  const redirectUri  = `${appUrl}/api/oauth/mailchimp/callback`

  // ── 2. Exchange code for access token ───────────────────────────────────
  let accessToken = ''
  try {
    const res = await fetch('https://login.mailchimp.com/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        code,
      }),
    })
    const data = await res.json() as { access_token?: string; error?: string }
    if (!data.access_token) {
      console.error('[oauth/mailchimp/callback] token error:', data.error)
      return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(data.error ?? 'token_exchange_failed')}`)
    }
    accessToken = data.access_token
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange_failed`)
  }

  // ── 3. Fetch data centre prefix (server) ────────────────────────────────
  let server  = 'us1'
  let listId  = ''
  try {
    const metaRes = await fetch('https://login.mailchimp.com/oauth2/metadata', {
      headers: { 'Authorization': `OAuth ${accessToken}` },
    })
    const meta = await metaRes.json() as { dc?: string; api_endpoint?: string }
    server = meta.dc ?? 'us1'

    // Fetch the first audience so users don't have to enter a list ID manually
    const listsRes = await fetch(`${meta.api_endpoint ?? `https://${server}.api.mailchimp.com`}/3.0/lists?count=1`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const lists = await listsRes.json() as { lists?: Array<{ id: string }> }
    listId = lists.lists?.[0]?.id ?? ''
  } catch {
    // Non-fatal — server/listId can stay as defaults
  }

  // ── 4. Upsert sage_integration ──────────────────────────────────────────
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_integrations')
    .upsert({
      workspace_id: wid,
      user_id:      uid,
      provider:     'mailchimp',
      status:       'connected',
      config: {
        access_token: accessToken,
        server,
        list_id: listId,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'workspace_id,user_id,provider',
    })

  if (error) {
    console.error('[oauth/mailchimp/callback] upsert failed:', error.message)
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(error.message)}`)
  }

  // ── 5. Redirect back ─────────────────────────────────────────────────────
  const redirectTo = onboarding
    ? `${appUrl}/dashboard`
    : `${appUrl}/integrations?provider=mailchimp&connected=1`
  return NextResponse.redirect(redirectTo)
}
