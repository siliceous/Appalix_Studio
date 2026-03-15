import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Initiates Kit (ConvertKit) OAuth2 flow.
 * Kit OAuth docs: https://developers.kit.com/v4#authentication-oauth
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.KIT_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'Kit OAuth not configured' }, { status: 500 })

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/kit/callback`

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

  const state = Buffer.from(JSON.stringify({ uid: user.id, wid: membership.workspace_id })).toString('base64url')

  const url = new URL('https://app.kit.com/oauth/authorize')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state',         state)

  return NextResponse.redirect(url.toString())
}
