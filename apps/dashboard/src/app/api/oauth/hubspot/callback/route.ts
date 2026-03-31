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

  const clientId     = process.env.HUBSPOT_CLIENT_ID     ?? ''
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET ?? ''
  const redirectUri  = `${appUrl}/api/oauth/hubspot/callback`

  // ── 2. Exchange code for tokens ──────────────────────────────────────────
  let accessToken = '', refreshToken = '', expiresAt = ''
  try {
    const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
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
    const data = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string }
    if (!data.access_token) {
      return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(data.error ?? 'token_exchange_failed')}`)
    }
    accessToken  = data.access_token
    refreshToken = data.refresh_token ?? ''
    expiresAt    = new Date(Date.now() + (data.expires_in ?? 1800) * 1000).toISOString()
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=token_exchange_failed`)
  }

  // ── 3. Fetch HubSpot portal info ─────────────────────────────────────────
  let hubId = '', hubDomain = ''
  try {
    const infoRes = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken)
    const info = await infoRes.json() as { hub_id?: number; hub_domain?: string }
    hubId     = String(info.hub_id ?? '')
    hubDomain = info.hub_domain ?? ''
  } catch { /* non-fatal */ }

  // ── 4. Upsert sage_integration ───────────────────────────────────────────
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_integrations')
    .upsert({
      workspace_id: wid,
      user_id:      uid,
      provider:     'hubspot',
      status:       'connected',
      config: {
        access_token:  accessToken,
        refresh_token: refreshToken,
        expires_at:    expiresAt,
        hub_id:        hubId,
        hub_domain:    hubDomain,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,user_id,provider' })

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${appUrl}/integrations?crm_connected=hubspot`)
}
