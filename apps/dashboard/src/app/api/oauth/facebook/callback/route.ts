import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * Facebook Messenger OAuth2 callback.
 * Exchanges the auth code for a user access token, then gets a long-lived
 * page access token for the first connected Facebook Page, and creates an
 * integration in the `integrations` table.
 *
 * Context (uid, wid, name, botId) is carried in the base64url-encoded state param.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=facebook_messenger&error=access_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=facebook_messenger&error=missing_code`)
  }

  // ── 1. Decode state ──────────────────────────────────────────────────────
  let uid = '', wid = '', name = 'Facebook Messenger', botId = ''
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid   = parsed.uid   ?? ''
    wid   = parsed.wid   ?? ''
    name  = parsed.name  ?? name
    botId = parsed.botId ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=facebook_messenger&error=invalid_state`)
  }

  if (!uid || !wid) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=facebook_messenger&error=missing_context`)
  }

  // ── 2. Exchange code for short-lived user token ──────────────────────────
  const appId     = process.env.META_APP_ID     || process.env.FACEBOOK_APP_ID     || ''
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || ''
  const redirectUri = `${appUrl}/api/oauth/facebook/callback`

  let shortToken: string
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }),
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    if (!data.access_token) throw new Error(data.error?.message ?? 'no token')
    shortToken = data.access_token
  } catch (err) {
    console.error('[oauth/facebook/callback] token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=facebook_messenger&error=token_exchange_failed`)
  }

  // ── 3. Exchange for long-lived user token ────────────────────────────────
  let longToken: string
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type:        'fb_exchange_token',
        client_id:         appId,
        client_secret:     appSecret,
        fb_exchange_token: shortToken,
      }),
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    if (!data.access_token) throw new Error(data.error?.message ?? 'no long-lived token')
    longToken = data.access_token
  } catch (err) {
    console.error('[oauth/facebook/callback] long-lived token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=facebook_messenger&error=token_exchange_failed`)
  }

  // ── 4. Get page access token for the first connected page ────────────────
  let pageToken = '', pageId = '', pageName = ''
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`,
    )
    const data = await res.json() as {
      data?: { access_token: string; id: string; name: string }[]
      error?: { message: string }
    }
    const firstPage = data.data?.[0]
    if (firstPage) {
      pageToken = firstPage.access_token
      pageId    = firstPage.id
      pageName  = firstPage.name
    }
  } catch (err) {
    console.error('[oauth/facebook/callback] /me/accounts failed:', err)
    // Non-fatal — store long-lived token; user can configure page manually
  }

  // ── 5. Generate a verify token for webhook setup ─────────────────────────
  const verifyToken = randomBytes(16).toString('hex')

  // ── 6. Create the integration ────────────────────────────────────────────
  const admin = createAdminClient()
  const config = {
    page_access_token: pageToken || longToken,
    page_id:           pageId,
    page_name:         pageName,
    app_secret:        appSecret,
    verify_token:      verifyToken,
  }

  const { data: inserted, error } = await admin
    .from('integrations')
    .insert({
      workspace_id: wid,
      bot_id:       botId || null,
      platform:     'facebook_messenger',
      name:         name || `Facebook — ${pageName || 'Page'}`,
      status:       'active',
      config,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[oauth/facebook/callback] insert failed:', error.message)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=facebook_messenger&error=${encodeURIComponent(error.message)}`)
  }

  // ── 7. Register app-level webhook (idempotent) and subscribe the page ──────
  const apiUrl       = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ap.appalix.ai'
  const webhookToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? ''
  const appToken     = `${appId}|${appSecret}`

  try {
    await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object:       'page',
        callback_url: `${apiUrl}/webhooks/facebook`,
        fields:       'messages,messaging_postbacks',
        verify_token: webhookToken,
        access_token: appToken,
      }),
    })
  } catch (err) {
    console.error('[oauth/facebook/callback] app webhook registration failed:', err)
  }

  if (pageId && pageToken) {
    try {
      await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks',
          access_token:      pageToken,
        }),
      })
    } catch (err) {
      console.error('[oauth/facebook/callback] page subscription failed:', err)
    }
  }

  // ── 8. Redirect to the integration detail page ───────────────────────────
  const integrationId = (inserted as { id: string }).id
  return NextResponse.redirect(`${appUrl}/integrations/${integrationId}?connected=facebook`)
}
