import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(searchParams.get('error') ?? 'access_denied')}`)
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=missing_code`)
  }

  // ── 1. Decode state ──────────────────────────────────────────────────────
  let uid = '', wid = ''
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid = parsed.uid ?? ''
    wid = parsed.wid ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=invalid_state`)
  }
  if (!uid || !wid) return NextResponse.redirect(`${appUrl}/integrations?crm_error=missing_context`)

  const clientId     = process.env.MONDAY_CLIENT_ID     ?? ''
  const clientSecret = process.env.MONDAY_CLIENT_SECRET ?? ''
  const redirectUri  = `${appUrl}/api/oauth/monday/callback`

  // ── 2. Exchange code for access token ───────────────────────────────────
  let accessToken = ''
  try {
    const res = await fetch('https://auth.monday.com/oauth2/token', {
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
      return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(data.error ?? 'token_exchange_failed')}`)
    }
    accessToken = data.access_token
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=token_exchange_failed`)
  }

  // ── 3. Fetch Monday account info ─────────────────────────────────────────
  let accountName = '', accountSlug = ''
  try {
    const gqlRes = await fetch('https://api.monday.com/v2', {
      method:  'POST',
      headers: { 'Authorization': accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ me { account { name slug } } }' }),
    })
    const gql = await gqlRes.json() as { data?: { me?: { account?: { name?: string; slug?: string } } } }
    accountName = gql.data?.me?.account?.name ?? ''
    accountSlug = gql.data?.me?.account?.slug ?? ''
  } catch { /* non-fatal */ }

  // ── 4. Upsert sage_integration ───────────────────────────────────────────
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_integrations')
    .upsert({
      workspace_id: wid,
      user_id:      uid,
      provider:     'monday',
      status:       'connected',
      config: {
        access_token:  accessToken,
        account_name:  accountName,
        account_slug:  accountSlug,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,user_id,provider' })

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${appUrl}/integrations?crm_connected=monday`)
}
