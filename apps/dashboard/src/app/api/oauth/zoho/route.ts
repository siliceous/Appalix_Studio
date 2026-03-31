import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.ZOHO_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Zoho OAuth not configured' }, { status: 500 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/zoho/callback`

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

  const url = new URL('https://accounts.zoho.com/oauth/v2/auth')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('state',         state)
  url.searchParams.set('access_type',   'offline')
  url.searchParams.set('scope', [
    'ZohoCRM.modules.contacts.READ',
    'ZohoCRM.modules.leads.READ',
    'ZohoCRM.modules.deals.READ',
    'ZohoCRM.modules.accounts.READ',
  ].join(','))

  return NextResponse.redirect(url.toString())
}
