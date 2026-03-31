import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(searchParams.get('error_description') ?? 'access_denied')}`)
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

  const clientId     = process.env.SALESFORCE_CLIENT_ID     ?? ''
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET ?? ''
  const redirectUri  = `${appUrl}/api/oauth/salesforce/callback`

  // ── 2. Exchange code for tokens ──────────────────────────────────────────
  // Salesforce returns instance_url — critical for all subsequent API calls
  let accessToken = '', refreshToken = '', instanceUrl = '', orgId = ''
  try {
    const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
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
    const data = await res.json() as {
      access_token?: string; refresh_token?: string
      instance_url?: string; id?: string; error?: string; error_description?: string
    }
    if (!data.access_token) {
      return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(data.error_description ?? data.error ?? 'token_exchange_failed')}`)
    }
    accessToken  = data.access_token
    refreshToken = data.refresh_token ?? ''
    instanceUrl  = data.instance_url  ?? ''
    // Extract org ID from the id URL (format: https://login.salesforce.com/id/{orgId}/{userId})
    orgId = data.id?.split('/').slice(-2, -1)[0] ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=token_exchange_failed`)
  }

  // ── 3. Upsert sage_integration ───────────────────────────────────────────
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_integrations')
    .upsert({
      workspace_id: wid,
      user_id:      uid,
      provider:     'salesforce',
      status:       'connected',
      config: {
        access_token:  accessToken,
        refresh_token: refreshToken,
        instance_url:  instanceUrl,
        org_id:        orgId,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,user_id,provider' })

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?crm_error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${appUrl}/integrations?crm_connected=salesforce`)
}
