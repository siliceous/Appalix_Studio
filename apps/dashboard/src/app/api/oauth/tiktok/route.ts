import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * Initiates TikTok Lead Ads OAuth flow.
 * Opens as a popup from the Lead Sources page.
 * URL: /api/oauth/tiktok
 */
export async function GET(_req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!clientKey) {
    return NextResponse.json({ error: 'TikTok OAuth not configured' }, { status: 500 })
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

  const redirectUri = `${appUrl}/api/oauth/tiktok/callback`

  // TikTok Marketing API OAuth (different from consumer TikTok API)
  const url = new URL('https://ads.tiktok.com/marketing_api/auth')
  url.searchParams.set('app_id',       clientKey)
  url.searchParams.set('state',        state)
  url.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.redirect(url.toString())
}
