import { NextRequest, NextResponse } from 'next/server'

/**
 * Initiates Microsoft OAuth2 flow.
 * Usage: /api/oauth/microsoft  or  /api/oauth/microsoft?state=onboarding
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Microsoft OAuth not configured' }, { status: 500 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/microsoft/callback`
  const state       = req.nextUrl.searchParams.get('state') ?? 'default'

  // Scopes: IMAP read + SMTP send + offline refresh + user email
  const scope = [
    'https://outlook.office.com/IMAP.AccessAsUser.All',
    'https://outlook.office.com/SMTP.Send',
    'offline_access',
    'openid',
    'email',
  ].join(' ')

  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope',         scope)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('state',         state)

  return NextResponse.redirect(url.toString())
}
