import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Initiates Slack OAuth2 flow for bot integration.
 * Query params:
 *   name    – integration name (stored in state, used by callback)
 *   bot_id  – Appalix bot to attach to this integration
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.SLACK_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Slack OAuth not configured' }, { status: 500 })
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/slack/callback`

  const name   = req.nextUrl.searchParams.get('name')   ?? 'Slack integration'
  const botId  = req.nextUrl.searchParams.get('bot_id') ?? ''

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

  // Encode all context into state so the callback can create the integration
  const state = Buffer.from(JSON.stringify({
    uid:   user.id,
    wid:   membership.workspace_id,
    name,
    botId,
  })).toString('base64url')

  const url = new URL('https://slack.com/oauth/v2/authorize')
  url.searchParams.set('client_id',    clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state',        state)
  url.searchParams.set('scope', [
    'channels:history',
    'channels:read',
    'chat:write',
    'im:history',
    'im:read',
    'im:write',
    'app_mentions:read',
    'groups:history',
    'groups:read',
  ].join(','))

  return NextResponse.redirect(url.toString())
}
