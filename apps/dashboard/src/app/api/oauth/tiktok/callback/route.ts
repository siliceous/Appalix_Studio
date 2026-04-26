import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'

const CLOSE_OK = `
<html><head><title>Connected</title></head><body>
<script>
  if (window.opener) { window.opener.postMessage({ type: 'tiktok-connected' }, '*') }
  window.close()
</script>
<p>TikTok connected! You can close this window.</p>
</body></html>`

function closeWithError(msg: string) {
  return new NextResponse(
    `<html><head><title>Error</title></head><body>
<script>
  if (window.opener) { window.opener.postMessage({ type: 'tiktok-error', error: ${JSON.stringify(msg)} }, '*') }
  window.close()
</script>
<p>Error: ${msg}. You can close this window.</p>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}

/**
 * TikTok Lead Ads OAuth callback.
 * Exchanges the code for tokens, fetches advertiser info,
 * saves to lead_ad_sources, then closes the popup.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? ''
  // Numeric App ID (e.g. 7627013716740522001) — required by the token exchange API
  // Falls back to TIKTOK_CLIENT_KEY for legacy setups where the same value was used
  const appId = process.env.TIKTOK_APP_ID ?? process.env.TIKTOK_CLIENT_KEY ?? ''

  if (!appId || !clientSecret) return closeWithError('TikTok OAuth not configured on server')

  if (searchParams.get('error') || !code) {
    return closeWithError(searchParams.get('error_description') ?? 'OAuth cancelled or denied')
  }

  // ── 1. Decode state ───────────────────────────────────────────────────────
  let uid = '', wid = ''
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid = parsed.uid ?? ''
    wid = parsed.wid ?? ''
  } catch {
    return closeWithError('Invalid OAuth state')
  }
  if (!uid || !wid) return closeWithError('Missing workspace context')

  // ── 2. Exchange code → access token ──────────────────────────────────────
  let accessToken = '', expiresIn = 0, refreshToken = '', advertiserId = ''
  try {
    // TikTok Marketing API token endpoint (different from consumer API)
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        app_id:     appId,
        secret:     clientSecret,
        auth_code:  code,
      }),
    })
    const data = await res.json() as {
      data?: {
        access_token?:   string
        advertiser_ids?: string[]
        advertiser_id?:  string
        expires_in?:     number
        refresh_token?:  string
      }
      code?:    number
      message?: string
    }
    if (data.code !== 0 || !data.data?.access_token) {
      throw new Error(data.message ?? 'no token')
    }
    accessToken  = data.data.access_token
    expiresIn    = data.data.expires_in ?? 0
    refreshToken = data.data.refresh_token ?? ''
    // Marketing API returns array of advertiser IDs
    advertiserId = data.data.advertiser_id ?? data.data.advertiser_ids?.[0] ?? ''
  } catch (err) {
    return closeWithError(`Token exchange failed: ${String(err)}`)
  }

  // ── 3. Get advertiser info ────────────────────────────────────────────────
  let advertiserName = ''
  if (advertiserId) {
    try {
      const res  = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${advertiserId}"]`,
        { headers: { 'Access-Token': accessToken } },
      )
      const data = await res.json() as {
        data?: { list?: { advertiser_id?: string; advertiser_name?: string }[] }
      }
      advertiserName = data.data?.list?.[0]?.advertiser_name ?? ''
    } catch {
      // non-fatal
    }
  }

  const accountName = advertiserName || `TikTok Ads Account`

  // ── 4. Save to lead_ad_sources (upsert) ───────────────────────────────────
  const admin = createAdminClient()
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null

  const config = {
    access_token:     accessToken,
    refresh_token:    refreshToken || null,
    token_expires_at: tokenExpiresAt,
    advertiser_id:    advertiserId  || null,
    advertiser_name:  advertiserName || null,
  }

  const { data: existing } = await admin
    .from('lead_ad_sources')
    .select('id')
    .eq('workspace_id', wid)
    .eq('platform', 'tiktok')
    .maybeSingle()

  let saveError: { message: string } | null = null
  if (existing) {
    const { error } = await admin
      .from('lead_ad_sources')
      .update({
        name:       `TikTok — ${accountName}`,
        status:     'active',
        config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as { id: string }).id)
    saveError = error
  } else {
    const { error } = await admin
      .from('lead_ad_sources')
      .insert({
        workspace_id: wid,
        platform:     'tiktok',
        name:         `TikTok — ${accountName}`,
        status:       'active',
        config,
      })
    saveError = error
  }

  if (saveError) {
    console.error('[oauth/tiktok/callback] save failed:', saveError.message)
    return closeWithError(`Failed to save: ${saveError.message}`)
  }

  // ── 5. Register lead webhook with TikTok (fire-and-forget) ───────────────
  if (advertiserId && accessToken) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.appalix.ai'}/api/webhooks/tiktok`
    fetch('https://business-api.tiktok.com/open_api/v1.3/webhook/create/', {
      method:  'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        advertiser_id: advertiserId,
        webhook_url:   webhookUrl,
        webhook_type:  'LEAD',
      }),
    })
      .then(r => r.json())
      .then(d => {
        if ((d as { code?: number }).code !== 0) {
          console.warn('[oauth/tiktok/callback] webhook register failed:', JSON.stringify(d))
        } else {
          console.log('[oauth/tiktok/callback] webhook registered for advertiser', advertiserId)
        }
      })
      .catch(e => console.warn('[oauth/tiktok/callback] webhook register error:', e))
  }

  return new NextResponse(CLOSE_OK, { headers: { 'Content-Type': 'text/html' } })
}
