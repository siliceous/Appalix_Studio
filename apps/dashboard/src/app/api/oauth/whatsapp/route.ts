import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Initiates WhatsApp Business OAuth2 flow via Meta.
 * Query params:
 *   name    – integration name (stored in state, used by callback)
 *   bot_id  – Appalix bot to attach to this integration
 */
export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  if (!appId) {
    return NextResponse.json({ error: 'WhatsApp OAuth not configured' }, { status: 500 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/whatsapp/callback`

  const name  = req.nextUrl.searchParams.get('name')   ?? 'WhatsApp Business'
  const botId = req.nextUrl.searchParams.get('bot_id') ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return NextResponse.redirect(`${appUrl}/login`)

  const state = Buffer.from(JSON.stringify({
    uid:   user.id,
    wid:   membership.workspace_id,
    name,
    botId,
  })).toString('base64url')

  const url = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  url.searchParams.set('client_id',     appId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('state',         state)
  url.searchParams.set('scope', [
    'whatsapp_business_messaging',
    'whatsapp_business_management',
  ].join(','))

  return NextResponse.redirect(url.toString())
}
