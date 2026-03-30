import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * Instagram Business Login OAuth2 callback.
 * Uses Instagram's own OAuth endpoint (not Facebook dialog/oauth).
 * 1. Exchange code → short-lived token (Instagram endpoint)
 * 2. Exchange → long-lived token (Instagram endpoint)
 * 3. Fetch Instagram user id + username
 * 4. Store integration
 * 5. Register Meta webhook
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=access_denied`)
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=missing_code`)
  }

  // ── 1. Decode state ──────────────────────────────────────────────────────
  let uid = '', wid = '', name = 'Instagram DM', botId = ''
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid   = parsed.uid   ?? ''
    wid   = parsed.wid   ?? ''
    name  = parsed.name  ?? name
    botId = parsed.botId ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=invalid_state`)
  }

  if (!uid || !wid) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=missing_context`)
  }

  const appId       = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || ''
  const appSecret   = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || ''
  const redirectUri = `${appUrl}/api/oauth/instagram/callback`

  // ── 2. Exchange code → short-lived Instagram token ───────────────────────
  let shortToken: string, igUserId: string
  try {
    const body = new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: 'authorization_code', redirect_uri: redirectUri, code })
    const res  = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body })
    const data = await res.json() as { access_token?: string; user_id?: number; error_message?: string }
    console.log('[oauth/instagram/callback] short token response:', JSON.stringify(data))
    if (!data.access_token) throw new Error(data.error_message ?? 'no token')
    shortToken = data.access_token
    igUserId   = String(data.user_id ?? '')
  } catch (err) {
    console.error('[oauth/instagram/callback] token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=token_exchange_failed`)
  }

  // ── 3. Exchange → long-lived token ───────────────────────────────────────
  let longToken: string
  try {
    const res  = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    console.log('[oauth/instagram/callback] long token response:', JSON.stringify(data))
    if (!data.access_token) throw new Error(data.error?.message ?? 'no long-lived token')
    longToken = data.access_token
  } catch (err) {
    console.error('[oauth/instagram/callback] long-lived token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=token_exchange_failed`)
  }

  // ── 4. Fetch Instagram username ───────────────────────────────────────────
  let igUsername = ''
  try {
    const res  = await fetch(`https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${longToken}`)
    const data = await res.json() as { id?: string; username?: string }
    console.log('[oauth/instagram/callback] me:', JSON.stringify(data))
    igUsername = data.username ?? ''
    if (data.id) igUserId = data.id
  } catch (err) {
    console.error('[oauth/instagram/callback] profile fetch failed:', err)
  }

  const verifyToken = randomBytes(16).toString('hex')

  // ── 5. Create integration ─────────────────────────────────────────────────
  const admin  = createAdminClient()
  const config = {
    access_token:         longToken,
    instagram_account_id: igUserId,
    instagram_username:   igUsername,
    app_secret:           appSecret,
    verify_token:         verifyToken,
  }

  const { data: inserted, error } = await admin
    .from('integrations')
    .insert({
      workspace_id: wid,
      bot_id:       botId || null,
      platform:     'instagram',
      name:         name || `Instagram${igUsername ? ` — @${igUsername}` : ' DM'}`,
      status:       'active',
      config,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[oauth/instagram/callback] insert failed:', error.message)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=${encodeURIComponent(error.message)}`)
  }

  const integrationId = (inserted as { id: string }).id
  const apiUrl        = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
  const appToken      = `${appId}|${appSecret}`
  const webhookToken  = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? ''

  // ── 6. Auto-register Meta app-level webhook ───────────────────────────────
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object:       'instagram',
        callback_url: `${apiUrl}/webhooks/instagram`,
        fields:       'messages',
        verify_token: webhookToken,
        access_token: appToken,
      }),
    })
    console.log('[oauth/instagram/callback] webhook reg:', await res.text())
  } catch (err) {
    console.error('[oauth/instagram/callback] webhook registration failed:', err)
  }

  return NextResponse.redirect(`${appUrl}/integrations/${integrationId}?connected=instagram`)
}
