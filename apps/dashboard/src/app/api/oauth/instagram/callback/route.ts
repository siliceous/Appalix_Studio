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

  // ── 4. Collect ALL Instagram accounts across all sources ─────────────────
  type IgCandidate = {
    igAccountId: string
    igUsername:  string
    pageId:      string
    pageName:    string
    accessToken: string
  }
  const candidates: IgCandidate[] = []

  // 4a. Try direct page access (/me/accounts)
  try {
    const res  = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${longToken}`
    )
    const data = await res.json() as {
      data?: { access_token: string; id: string; name: string; instagram_business_account?: { id: string; username?: string } }[]
    }
    console.log('[oauth/instagram/callback] /me/accounts:', JSON.stringify(data))
    for (const page of data.data ?? []) {
      if (page.instagram_business_account?.id) {
        candidates.push({
          igAccountId: page.instagram_business_account.id,
          igUsername:  page.instagram_business_account.username ?? '',
          pageId:      page.id,
          pageName:    page.name,
          accessToken: page.access_token,
        })
      }
    }
  } catch (err) {
    console.error('[oauth/instagram/callback] /me/accounts failed:', err)
  }

  // 4b. Try Business Manager API
  try {
    const bizRes  = await fetch(`https://graph.facebook.com/v18.0/me/businesses?fields=id,name&access_token=${longToken}`)
    const bizData = await bizRes.json() as { data?: { id: string; name: string }[] }
    console.log('[oauth/instagram/callback] /me/businesses:', JSON.stringify(bizData))

    for (const biz of bizData.data ?? []) {
      // Try owned_pages with instagram_business_account field
      const pagesRes  = await fetch(
        `https://graph.facebook.com/v18.0/${biz.id}/owned_pages?fields=id,name,instagram_business_account{id,username}&access_token=${longToken}`
      )
      const pagesData = await pagesRes.json() as {
        data?: { id: string; name: string; instagram_business_account?: { id: string; username?: string } }[]
      }
      console.log(`[oauth/instagram/callback] business ${biz.id} pages:`, JSON.stringify(pagesData))

      for (const page of pagesData.data ?? []) {
        let igBiz = page.instagram_business_account

        // If instagram_business_account not in owned_pages response, query page node directly
        if (!igBiz?.id) {
          try {
            const pageDetailRes  = await fetch(
              `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${longToken}`
            )
            const pageDetail = await pageDetailRes.json() as {
              instagram_business_account?: { id: string; username?: string }
              connected_instagram_account?: { id: string; username?: string }
            }
            console.log(`[oauth/instagram/callback] page ${page.id} direct:`, JSON.stringify(pageDetail))
            igBiz = pageDetail.instagram_business_account ?? pageDetail.connected_instagram_account
          } catch (err) {
            console.error(`[oauth/instagram/callback] page ${page.id} direct fetch failed:`, err)
          }
        }

        if (igBiz?.id) {
          const alreadyFound = candidates.some(c => c.igAccountId === igBiz!.id)
          if (!alreadyFound) {
            const patRes  = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=access_token&access_token=${longToken}`)
            const patData = await patRes.json() as { access_token?: string }
            candidates.push({
              igAccountId: igBiz.id,
              igUsername:  igBiz.username ?? '',
              pageId:      page.id,
              pageName:    page.name,
              accessToken: patData.access_token ?? longToken,
            })
          }
        }
      }

      // Also try /{biz}/instagram_accounts — catches accounts with partial access
      try {
        const igRes  = await fetch(
          `https://graph.facebook.com/v18.0/${biz.id}/instagram_accounts?fields=id,username,connected_page{id,name}&access_token=${longToken}`
        )
        const igData = await igRes.json() as {
          data?: { id: string; username?: string; connected_page?: { id: string; name: string } }[]
        }
        console.log(`[oauth/instagram/callback] business ${biz.id} instagram_accounts:`, JSON.stringify(igData))

        for (const ig of igData.data ?? []) {
          if (!ig.id) continue
          const alreadyFound = candidates.some(c => c.igAccountId === ig.id)
          if (!alreadyFound) {
            const connPage = ig.connected_page
            const patRes   = connPage
              ? await fetch(`https://graph.facebook.com/v18.0/${connPage.id}?fields=access_token&access_token=${longToken}`)
              : null
            const patData  = patRes ? await patRes.json() as { access_token?: string } : {}
            candidates.push({
              igAccountId: ig.id,
              igUsername:  ig.username ?? '',
              pageId:      connPage?.id ?? '',
              pageName:    connPage?.name ?? biz.name,
              accessToken: (patData as { access_token?: string }).access_token ?? longToken,
            })
          }
        }
      } catch (igErr) {
        console.error(`[oauth/instagram/callback] business ${biz.id} instagram_accounts failed:`, igErr)
      }
    }
  } catch (err) {
    console.error('[oauth/instagram/callback] business manager fallback failed:', err)
  }

  console.log('[oauth/instagram/callback] candidates:', JSON.stringify(candidates.map(c => ({ username: c.igUsername, pageId: c.pageId }))))

  if (candidates.length === 0) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=no_instagram_account`)
  }

  // ── 5. If multiple candidates, store pending and redirect to picker ────────
  if (candidates.length > 1) {
    const admin = createAdminClient()
    const { data: pending, error: pendingErr } = await admin
      .from('integrations')
      .insert({
        workspace_id: wid,
        bot_id:       botId || null,
        platform:     'instagram',
        name:         name || 'Instagram DM',
        status:       'pending',
        config: {
          app_secret:       appSecret,
          pending_accounts: candidates,
        },
      })
      .select('id')
      .single()

    if (pendingErr || !pending) {
      console.error('[oauth/instagram/callback] pending insert failed:', pendingErr?.message)
      return NextResponse.redirect(`${appUrl}/integrations/new?platform=instagram&error=server_error`)
    }

    return NextResponse.redirect(`${appUrl}/integrations/instagram/select?session=${(pending as { id: string }).id}`)
  }

  // ── 6. Single candidate — create integration directly ─────────────────────
  const pick        = candidates[0]
  const verifyToken = randomBytes(16).toString('hex')
  const config = {
    access_token:         pick.accessToken,
    page_access_token:    pick.accessToken,
    page_id:              pick.pageId,
    page_name:            pick.pageName,
    instagram_account_id: pick.igAccountId,
    instagram_username:   pick.igUsername,
    app_secret:           appSecret,
    verify_token:         verifyToken,
  }

  const admin = createAdminClient()
  const { data: inserted, error } = await admin
    .from('integrations')
    .insert({
      workspace_id: wid,
      bot_id:       botId || null,
      platform:     'instagram',
      name:         name || `Instagram${pick.igUsername ? ` — @${pick.igUsername}` : ' DM'}`,
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
  await registerWebhook(appId, appSecret, pick.pageId, pick.igAccountId, pick.accessToken)

  return NextResponse.redirect(`${appUrl}/integrations/${integrationId}?connected=instagram`)
}

async function registerWebhook(appId: string, appSecret: string, pageId: string, igAccountId: string, pageAccessToken: string) {
  const apiUrl       = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
  const appToken     = `${appId}|${appSecret}`
  const webhookToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? ''

  try {
    const subRes  = await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
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
    const subData = await subRes.json()
    console.log('[oauth/instagram/callback] app subscription result:', JSON.stringify(subData))
  } catch (err) {
    console.error('[oauth/instagram/callback] webhook registration failed:', err)
  }

  // Subscribe the Facebook Page (for Messenger)
  if (pageId && pageAccessToken) {
    try {
      const pageSubRes  = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscribed_fields: ['messages'], access_token: pageAccessToken }),
        }
      )
      const pageSubData = await pageSubRes.json()
      console.log('[oauth/instagram/callback] page subscription result:', JSON.stringify(pageSubData))
    } catch (err) {
      console.error('[oauth/instagram/callback] page subscription failed:', err)
    }
  }

  // Subscribe the Instagram Business Account (required for Instagram DM webhooks)
  if (igAccountId && pageAccessToken) {
    try {
      const igSubRes  = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}/subscribed_apps`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscribed_fields: ['messages'], access_token: pageAccessToken }),
        }
      )
      const igSubData = await igSubRes.json()
      console.log('[oauth/instagram/callback] ig account subscription result:', JSON.stringify(igSubData))
    } catch (err) {
      console.error('[oauth/instagram/callback] ig account subscription failed:', err)
    }
  }
}
