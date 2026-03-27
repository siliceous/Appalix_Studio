import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * Initiates Meta Lead Ads OAuth flow.
 * Opens as a popup from the Lead Sources page.
 * URL: /api/oauth/meta-leads
 */
export async function GET(req: NextRequest) {
  const appId  = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!appId) {
    return NextResponse.json({ error: 'Meta OAuth not configured' }, { status: 500 })
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

  const redirectUri = `${appUrl}/api/oauth/meta-leads/callback`

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  url.searchParams.set('client_id',     appId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('state',         state)
  url.searchParams.set('auth_type',     'rerequest')
  url.searchParams.set('scope',         'leads_retrieval,pages_show_list,pages_read_engagement,ads_management')
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}
