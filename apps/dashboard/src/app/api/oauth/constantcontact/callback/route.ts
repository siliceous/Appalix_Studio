import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(searchParams.get('error') ?? 'access_denied')}`)
  }
  if (!code) return NextResponse.redirect(`${appUrl}/integrations?error=missing_code`)

  let uid = '', wid = ''
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid = parsed.uid ?? ''
    wid = parsed.wid ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=invalid_state`)
  }
  if (!uid || !wid) return NextResponse.redirect(`${appUrl}/integrations?error=missing_context`)

  const clientId     = process.env.CONSTANTCONTACT_CLIENT_ID     ?? ''
  const clientSecret = process.env.CONSTANTCONTACT_CLIENT_SECRET ?? ''
  const redirectUri  = `${appUrl}/api/oauth/constantcontact/callback`

  let accessToken = '', refreshToken = ''
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch('https://authz.constantcontact.com/oauth2/default/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })
    const data = await res.json() as { access_token?: string; refresh_token?: string; error?: string }
    if (!data.access_token) {
      return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(data.error ?? 'token_exchange_failed')}`)
    }
    accessToken  = data.access_token
    refreshToken = data.refresh_token ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange_failed`)
  }

  // Fetch the first contact list to auto-configure list_id
  let listId = ''
  try {
    const listsRes = await fetch('https://api.cc.email/v3/contact_lists?limit=1', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const lists = await listsRes.json() as { lists?: Array<{ list_id: string }> }
    listId = lists.lists?.[0]?.list_id ?? ''
  } catch { /* non-fatal */ }

  const admin = createAdminClient()
  const { error } = await admin.from('sage_integrations').upsert({
    workspace_id: wid,
    user_id:      uid,
    provider:     'constantcontact',
    status:       'connected',
    config: { access_token: accessToken, refresh_token: refreshToken, list_id: listId },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,user_id,provider' })

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${appUrl}/integrations?provider=constantcontact&connected=1`)
}
