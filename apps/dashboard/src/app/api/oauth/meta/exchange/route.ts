import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * Exchanges a short-lived Meta user access token (from FB.login() popup)
 * for a long-lived token, fetches page/WABA details, and creates an integration.
 */
export async function POST(req: NextRequest) {
  const { token, platform, name, botId, selectedPage } = await req.json() as {
    token: string
    platform: 'facebook_messenger' | 'whatsapp'
    name: string
    botId: string
    /** Pre-selected page from the page picker (skips /me/accounts fetch) */
    selectedPage?: { id: string; name: string; access_token: string }
  }

  if (!token || !platform) {
    return NextResponse.json({ error: 'Missing token or platform' }, { status: 400 })
  }

  const isMessenger = platform === 'facebook_messenger'
  const appId = isMessenger
    ? (process.env.MESSENGER_APP_ID  || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '')
    : (process.env.WHATSAPP_APP_ID   || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '')
  const appSecret = isMessenger
    ? (process.env.MESSENGER_APP_SECRET  || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '')
    : (process.env.WHATSAPP_APP_SECRET   || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '')

  // ── Auth check ────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return NextResponse.json({ error: 'No workspace' }, { status: 401 })

  const wid = membership.workspace_id

  // ── Exchange short-lived → long-lived user token ──────────────────────────
  let longToken: string
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type:        'fb_exchange_token',
        client_id:         appId,
        client_secret:     appSecret,
        fb_exchange_token: token,
      }),
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    if (!data.access_token) throw new Error(data.error?.message ?? 'no long-lived token')
    longToken = data.access_token
  } catch (err) {
    console.error('[meta/exchange] long-lived token exchange failed:', err)
    return NextResponse.json({ error: `Token exchange failed: ${String(err)}` }, { status: 500 })
  }

  const verifyToken = randomBytes(16).toString('hex')
  const admin       = createAdminClient()

  // ── Facebook Messenger ────────────────────────────────────────────────────
  if (platform === 'facebook_messenger') {
    let pageToken = '', pageId = '', pageName = ''

    if (selectedPage) {
      // Page was chosen in the frontend picker — use it directly
      pageToken = selectedPage.access_token
      pageId    = selectedPage.id
      pageName  = selectedPage.name
    } else {
      // Fallback: auto-pick first page (single-page accounts)
      try {
        const res  = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`)
        const data = await res.json() as {
          data?: { access_token: string; id: string; name: string }[]
          error?: { message: string }
        }
        const first = data.data?.[0]
        if (first) { pageToken = first.access_token; pageId = first.id; pageName = first.name }
      } catch (err) {
        console.error('[meta/exchange] /me/accounts failed:', err)
      }
    }

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ── Auto-register app-level webhook (idempotent) ─────────────────────────
    const apiUrl       = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://appalix-api.onrender.com'
    const webhookToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? verifyToken
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
      console.error('[meta/exchange] app webhook registration failed:', err)
    }

    // ── Auto-subscribe this page to receive events ───────────────────────────
    if (pageId && pageToken) {
      try {
        const subRes  = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscribed_fields: 'messages,messaging_postbacks',
              access_token:      pageToken,
            }),
          },
        )
        const subData = await subRes.json() as { success?: boolean; error?: { message: string } }
        if (!subData.success) {
          console.error('[meta/exchange] page subscription failed:', subData.error?.message)
        }
      } catch (err) {
        console.error('[meta/exchange] page subscription error:', err)
      }
    }

    return NextResponse.json({ integrationId: (inserted as { id: string }).id })
  }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  if (platform === 'whatsapp') {
    let wabaId = '', phoneNumberId = '', phoneNumber = '', displayName = ''
    try {
      const bizRes  = await fetch(`https://graph.facebook.com/v18.0/me/businesses?access_token=${longToken}`)
      const bizData = await bizRes.json() as { data?: { id: string }[] }
      const bizId   = bizData.data?.[0]?.id

      if (bizId) {
        const wabaRes  = await fetch(
          `https://graph.facebook.com/v18.0/${bizId}/owned_whatsapp_business_accounts?access_token=${longToken}`,
        )
        const wabaData = await wabaRes.json() as { data?: { id: string }[] }
        wabaId = wabaData.data?.[0]?.id ?? ''

        if (wabaId) {
          const phoneRes  = await fetch(
            `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${longToken}`,
          )
          const phoneData = await phoneRes.json() as {
            data?: { id: string; display_phone_number: string; verified_name: string }[]
          }
          const first = phoneData.data?.[0]
          if (first) {
            phoneNumberId = first.id
            phoneNumber   = first.display_phone_number
            displayName   = first.verified_name
          }
        }
      }
    } catch (err) {
      console.error('[meta/exchange] WhatsApp account fetch failed:', err)
    }

    const config = {
      access_token:    longToken,
      waba_id:         wabaId,
      phone_number_id: phoneNumberId,
      phone_number:    phoneNumber,
      display_name:    displayName,
      app_secret:      appSecret,
      verify_token:    verifyToken,
    }

    const { data: inserted, error } = await admin
      .from('integrations')
      .insert({
        workspace_id: wid,
        bot_id:       botId || null,
        platform:     'whatsapp',
        name:         name || `WhatsApp — ${displayName || phoneNumber || 'Business'}`,
        status:       'active',
        config,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const integrationId = (inserted as { id: string }).id
    const apiUrl        = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://appalix-api.onrender.com'
    const appToken      = `${appId}|${appSecret}`

    // ── Auto-register app-level WhatsApp webhook ──────────────────────────────
    try {
      await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object:       'whatsapp_business_account',
          callback_url: `${apiUrl}/webhooks/whatsapp/${integrationId}`,
          fields:       'messages',
          verify_token: verifyToken,
          access_token: appToken,
        }),
      })
    } catch (err) {
      console.error('[meta/exchange] WhatsApp webhook registration failed:', err)
    }

    // ── Subscribe the WABA to receive events ─────────────────────────────────
    if (wabaId && longToken) {
      try {
        await fetch(`https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: longToken }),
        })
      } catch (err) {
        console.error('[meta/exchange] WhatsApp WABA subscription failed:', err)
      }
    }

    return NextResponse.json({ integrationId })
  }

  return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
}
