import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * Instagram OAuth2 callback.
 * 1. Exchange code → long-lived user token
 * 2. Fetch connected Facebook Pages → find their linked Instagram account
 * 3. Store integration with page_access_token + instagram_account_id
 * 4. Auto-register Meta webhook for instagram object
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

  const appId     = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || ''
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || ''
  const redirectUri = `${appUrl}/api/oauth/instagram/callback`

  // ── 2. Exchange code → short-lived token ──────────────────────────────────
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
    console.error('[oauth/instagram/callback] token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=token_exchange_failed`)
  }

  // ── 3. Exchange → long-lived token ────────────────────────────────────────
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
    console.error('[oauth/instagram/callback] long-lived token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=token_exchange_failed`)
  }

  // ── 4. Get pages → find Instagram business account ────────────────────────
  let pageToken = '', pageId = '', igAccountId = '', igUsername = ''
  try {
    const pagesRes  = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`)
    const pagesData = await pagesRes.json() as {
      data?: { access_token: string; id: string; name: string }[]
    }
    console.log('[oauth/instagram/callback] pages:', JSON.stringify(pagesData))
    const firstPage = pagesData.data?.[0]
    if (firstPage) {
      pageToken = firstPage.access_token
      pageId    = firstPage.id

      // Fetch the Instagram account linked to this page
      const igRes  = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`,
      )
      const igData = await igRes.json() as {
        instagram_business_account?: { id: string }
      }
      console.log('[oauth/instagram/callback] ig data for page', pageId, ':', JSON.stringify(igData))
      igAccountId = igData.instagram_business_account?.id ?? ''

      if (igAccountId) {
        const igProfileRes  = await fetch(
          `https://graph.facebook.com/v18.0/${igAccountId}?fields=username&access_token=${pageToken}`,
        )
        const igProfile = await igProfileRes.json() as { username?: string }
        igUsername = igProfile.username ?? ''
      }
    }
  } catch (err) {
    console.error('[oauth/instagram/callback] IG account fetch failed:', err)
  }

  const verifyToken = randomBytes(16).toString('hex')

  // ── 5. Create integration ─────────────────────────────────────────────────
  const admin  = createAdminClient()
  const config = {
    page_access_token:    pageToken || longToken,
    page_id:              pageId,
    instagram_account_id: igAccountId,
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
  const apiUrl        = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ap.appalix.ai'
  const appToken      = `${appId}|${appSecret}`
  const webhookToken  = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? ''

  // ── 6. Auto-register Meta app-level webhook for instagram object ───────────
  try {
    await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
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
  } catch (err) {
    console.error('[oauth/instagram/callback] webhook registration failed:', err)
  }

  // ── 7. Subscribe the page to receive Instagram events ─────────────────────
  if (pageId && pageToken) {
    try {
      await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages',
          access_token:      pageToken,
        }),
      })
    } catch (err) {
      console.error('[oauth/instagram/callback] page subscription failed:', err)
    }
  }

  return NextResponse.redirect(`${appUrl}/integrations/${integrationId}?connected=instagram`)
}
