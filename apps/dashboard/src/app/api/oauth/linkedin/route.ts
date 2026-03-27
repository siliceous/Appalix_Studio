import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * Initiates LinkedIn Lead Gen Forms OAuth flow.
 * Opens as a popup from the Lead Sources page.
 * URL: /api/oauth/linkedin
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!clientId) {
    return NextResponse.json({ error: 'LinkedIn OAuth not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return NextResponse.redirect(`${appUrl}/login`)

  const state = Buffer.from(JSON.stringify({
    uid: user.id,
    wid: membership.workspace_id,
  })).toString('base64url')

  const redirectUri = `${appUrl}/api/oauth/linkedin/callback`

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('state',         state)
  url.searchParams.set('scope',         'openid profile email r_ads_leadgen_automation r_ads')

  return NextResponse.redirect(url.toString())
}
