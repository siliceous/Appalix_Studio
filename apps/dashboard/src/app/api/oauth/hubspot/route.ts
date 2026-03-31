import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'HubSpot OAuth not configured' }, { status: 500 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/hubspot/callback`

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

  const url = new URL('https://app.hubspot.com/oauth/authorize')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('state',         state)
  url.searchParams.set('scope', [
    'crm.objects.contacts.read',
    'crm.objects.deals.read',
    'crm.objects.companies.read',
  ].join(' '))

  return NextResponse.redirect(url.toString())
}
