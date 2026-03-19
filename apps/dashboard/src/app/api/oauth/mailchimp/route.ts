import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * Initiates Mailchimp OAuth2 flow.
 * Redirects to Mailchimp's authorization page so the user can connect their
 * Mailchimp account to this workspace.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.MAILCHIMP_CLIENT_ID
  if (!clientId) {
    const keys = Object.keys(process.env).filter(k => k.toLowerCase().includes('mailchimp'))
    console.error('[oauth/mailchimp] MAILCHIMP_CLIENT_ID missing. Related keys found:', keys)
    return NextResponse.json({ error: 'Mailchimp OAuth not configured', debug: keys }, { status: 500 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/mailchimp/callback`
  const flow        = req.nextUrl.searchParams.get('state') ?? 'default'

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
    flow,
    uid: user.id,
    wid: membership.workspace_id,
  })).toString('base64url')

  const url = new URL('https://login.mailchimp.com/oauth2/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('state',         state)

  return NextResponse.redirect(url.toString())
}
