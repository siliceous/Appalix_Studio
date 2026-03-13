import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Slack OAuth2 callback.
 * Exchanges the auth code for a bot token, then creates an integration
 * in the `integrations` table and redirects to its detail page.
 *
 * Context (uid, wid, name, botId) is carried in the base64url-encoded state param.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=slack&error=access_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=slack&error=missing_code`)
  }

  // ── 1. Decode state ──────────────────────────────────────────────────────
  let uid = '', wid = '', name = 'Slack integration', botId = ''
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid   = parsed.uid   ?? ''
    wid   = parsed.wid   ?? ''
    name  = parsed.name  ?? name
    botId = parsed.botId ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=slack&error=invalid_state`)
  }

  if (!uid || !wid) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=slack&error=missing_context`)
  }

  // ── 2. Exchange code for tokens ──────────────────────────────────────────
  const clientId     = process.env.SLACK_CLIENT_ID!
  const clientSecret = process.env.SLACK_CLIENT_SECRET!
  const redirectUri  = `${appUrl}/api/oauth/slack/callback`

  let slackData: {
    ok: boolean
    access_token?: string        // bot token (xoxb-...)
    bot_user_id?: string
    team?: { id: string; name: string }
    authed_user?: { id: string }
    incoming_webhook?: { channel: string; channel_id: string; url: string }
    error?: string
  }

  try {
    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
      }),
    })
    slackData = await res.json() as typeof slackData
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=slack&error=token_exchange_failed`)
  }

  if (!slackData.ok || !slackData.access_token) {
    const detail = slackData.error ?? 'unknown'
    console.error('[oauth/slack/callback] Slack error:', detail)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=slack&error=${encodeURIComponent(detail)}`)
  }

  // ── 3. Get the signing secret — stored in env for the registered Slack app ──
  // Signing secret is per-Slack-app (not per-workspace), so we store it from env.
  // Customers don't need to paste it; Appalix's registered app secret is used.
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? ''

  // ── 4. Create the integration ────────────────────────────────────────────
  const admin = createAdminClient()
  const config = {
    bot_token:      slackData.access_token,
    signing_secret: signingSecret,
    team_id:        slackData.team?.id    ?? '',
    team_name:      slackData.team?.name  ?? '',
    bot_user_id:    slackData.bot_user_id ?? '',
  }

  const { data: inserted, error } = await admin
    .from('integrations')
    .insert({
      workspace_id: wid,
      bot_id:       botId || null,
      platform:     'slack',
      name:         name || `Slack — ${slackData.team?.name ?? 'workspace'}`,
      status:       'active',
      config,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[oauth/slack/callback] insert failed:', error.message)
    return NextResponse.redirect(`${appUrl}/integrations?error=save_failed`)
  }

  // ── 5. Redirect to the integration detail page ───────────────────────────
  const integrationId = (inserted as { id: string }).id
  return NextResponse.redirect(`${appUrl}/integrations/${integrationId}?connected=slack`)
}
