import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.MONDAY_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Monday.com OAuth not configured' }, { status: 500 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/monday/callback`

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

  const url = new URL('https://auth.monday.com/oauth2/authorize')
  url.searchParams.set('client_id',    clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state',        state)
  url.searchParams.set('scope',        'me:read boards:read')

  return NextResponse.redirect(url.toString())
}
