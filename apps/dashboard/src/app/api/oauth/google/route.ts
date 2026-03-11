import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * Initiates Google OAuth2 flow.
 * Usage: /api/oauth/google  or  /api/oauth/google?state=onboarding
 *
 * Embeds user_id + workspace_id in the state so the callback doesn't
 * need to rely on session cookies surviving the Google redirect.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/google/callback`
  const flow        = req.nextUrl.searchParams.get('state') ?? 'default'

  // Identify the logged-in user now, while we still have the session cookie
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

  // Encode user identity + flow into state
  const state = Buffer.from(JSON.stringify({
    flow,
    uid: user.id,
    wid: membership.workspace_id,
  })).toString('base64url')

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope',         'https://mail.google.com/ email profile')
  url.searchParams.set('access_type',   'offline')
  url.searchParams.set('prompt',        'consent')
  url.searchParams.set('state',         state)

  return NextResponse.redirect(url.toString())
}
