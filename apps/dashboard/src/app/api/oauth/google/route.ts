import { NextRequest, NextResponse } from 'next/server'

/**
 * Initiates Google OAuth2 flow.
 * Usage: /api/oauth/google  or  /api/oauth/google?state=onboarding
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/google/callback`
  const state       = req.nextUrl.searchParams.get('state') ?? 'default'

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope',         'https://mail.google.com/ email profile')
  url.searchParams.set('access_type',   'offline')
  url.searchParams.set('prompt',        'consent')   // always prompt so we get a refresh_token
  url.searchParams.set('state',         state)

  return NextResponse.redirect(url.toString())
}
