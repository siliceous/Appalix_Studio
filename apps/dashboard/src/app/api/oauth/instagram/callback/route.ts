import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * Instagram OAuth2 callback via Facebook Login.
 * Requires Instagram Business account linked to a Facebook Page.
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

  // ── 2. Exchange code → short-lived token ─────────────────────────────────
  let shortToken: string
  try {
    const res  = await fetch(
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

  // ── 3. Exchange → long-lived token ───────────────────────────────────────
  let longToken: string
  try {
    const res  = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken }),
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    if (!data.access_token) throw new Error(data.error?.message ?? 'no long-lived token')
    longToken = data.access_token
  } catch (err) {
    console.error('[oauth/instagram/callback] long-lived token failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=token_exchange_failed`)
  }

  // ── 4. Find Instagram account via Facebook Pages ──────────────────────────
  type PageEntry = { access_token: string; id: string; name: string; instagram_business_account?: { id: string; username?: string } }
  let accessToken = longToken, pageId = '', igAccountId = '', igUsername = '', pageName = ''

  const findIgInPages = (pages: PageEntry[]) => {
    for (const page of pages) {
      if (page.instagram_business_account?.id) {
        accessToken = page.access_token
        pageId      = page.id
        pageName    = page.name
        igAccountId = page.instagram_business_account.id
        igUsername  = page.instagram_business_account.username ?? ''
        return true
      }
    }
    return false
  }

  // 4a. Try direct page access first (/me/accounts)
  try {
    const res  = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${longToken}`
    )
    const data = await res.json() as { data?: PageEntry[] }
    console.log('[oauth/instagram/callback] /me/accounts:', JSON.stringify(data))
    findIgInPages(data.data ?? [])
  } catch (err) {
    console.error('[oauth/instagram/callback] /me/accounts failed:', err)
  }

  // 4b. Fall back to Business Manager API if no IG account found yet
  if (!igAccountId) {
    try {
      const bizRes  = await fetch(`https://graph.facebook.com/v18.0/me/businesses?fields=id,name&access_token=${longToken}`)
      const bizData = await bizRes.json() as { data?: { id: string; name: string }[] }
      console.log('[oauth/instagram/callback] /me/businesses:', JSON.stringify(bizData))

      for (const biz of bizData.data ?? []) {
        if (igAccountId) break
        const pagesRes  = await fetch(
          `https://graph.facebook.com/v18.0/${biz.id}/owned_pages?fields=id,name,instagram_business_account{id,username}&access_token=${longToken}`
        )
        const pagesData = await pagesRes.json() as { data?: { id: string; name: string; instagram_business_account?: { id: string; username?: string } }[] }
        console.log(`[oauth/instagram/callback] business ${biz.id} pages:`, JSON.stringify(pagesData))

        for (const page of pagesData.data ?? []) {
          if (page.instagram_business_account?.id) {
            igAccountId = page.instagram_business_account.id
            igUsername  = page.instagram_business_account.username ?? ''
            pageId      = page.id
            pageName    = page.name
            // Get the page access token
            const patRes  = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=access_token&access_token=${longToken}`)
            const patData = await patRes.json() as { access_token?: string }
            accessToken   = patData.access_token ?? longToken
            break
          }
        }
      }
    } catch (err) {
      console.error('[oauth/instagram/callback] business manager fallback failed:', err)
    }
  }

  const verifyToken = randomBytes(16).toString('hex')

  // ── 5. Create integration ─────────────────────────────────────────────────
  const admin  = createAdminClient()
  const config = {
    access_token:         accessToken,
    page_access_token:    accessToken,
    page_id:              pageId,
    page_name:            pageName,
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
  const apiUrl        = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
  const appToken      = `${appId}|${appSecret}`
  const webhookToken  = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? ''

  // ── 6. Register webhook ───────────────────────────────────────────────────
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

  // ── 7. Subscribe page ─────────────────────────────────────────────────────
  if (pageId && accessToken !== longToken) {
    try {
      await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed_fields: 'messages', access_token: accessToken }),
      })
    } catch (err) {
      console.error('[oauth/instagram/callback] page subscription failed:', err)
    }
  }

  return NextResponse.redirect(`${appUrl}/integrations/${integrationId}?connected=instagram`)
}
