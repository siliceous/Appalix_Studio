import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'
import { randomBytes }               from 'crypto'

const CLOSE_OK = `
<html><head><title>Connected</title></head><body>
<script>
  if (window.opener) { window.opener.postMessage({ type: 'meta-leads-connected' }, '*') }
  window.close()
</script>
<p>Meta connected! You can close this window.</p>
</body></html>`

function closeWithError(msg: string) {
  return new NextResponse(
    `<html><head><title>Error</title></head><body>
<script>
  if (window.opener) { window.opener.postMessage({ type: 'meta-leads-error', error: ${JSON.stringify(msg)} }, '*') }
  window.close()
</script>
<p>Error: ${msg}. You can close this window.</p>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}

/**
 * Meta Lead Ads OAuth callback.
 * Exchanges the code for tokens, fetches pages, saves to lead_ad_sources,
 * subscribes pages to leadgen events, registers the app-level webhook, then
 * closes the popup.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const appId    = process.env.META_APP_ID     ?? ''
  const appSecret = process.env.META_APP_SECRET ?? ''

  if (!appId || !appSecret) return closeWithError('Meta OAuth not configured on server')

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

  const redirectUri = `${appUrl}/api/oauth/meta-leads/callback`

  // ── 2. Exchange code → short-lived user token ─────────────────────────────
  let userToken = ''
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }),
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    if (!data.access_token) throw new Error(data.error?.message ?? 'no token')
    userToken = data.access_token
  } catch (err) {
    return closeWithError(`Token exchange failed: ${String(err)}`)
  }

  // ── 3. Exchange → long-lived user token ───────────────────────────────────
  let longToken = userToken
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: userToken }),
    )
    const data = await res.json() as { access_token?: string }
    if (data.access_token) longToken = data.access_token
  } catch {
    // Non-fatal — fall back to short-lived token
  }

  // ── 4. Fetch pages ────────────────────────────────────────────────────────
  let pages: { id: string; name: string; access_token: string }[] = []
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`,
    )
    const data = await res.json() as {
      data?: { id: string; name: string; access_token: string }[]
    }
    pages = data.data ?? []
  } catch {
    // pages stays []
  }

  if (pages.length === 0) {
    return closeWithError('No Facebook Pages found. Ensure your account manages at least one Page with lead forms.')
  }

  // ── 5. Save first page to lead_ad_sources (upsert on workspace + platform) ─
  const admin       = createAdminClient()
  const verifyToken = randomBytes(16).toString('hex')
  const page        = pages[0]

  const { error: upsertError } = await (admin as ReturnType<typeof createAdminClient>)
    .from('lead_ad_sources')
    .upsert({
      workspace_id: wid,
      platform:     'meta',
      name:         `Meta — ${page.name}`,
      status:       'active',
      config: {
        page_access_token: page.access_token,
        page_id:           page.id,
        page_name:         page.name,
        verify_token:      verifyToken,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'workspace_id,platform',
    })

  if (upsertError) {
    console.error('[oauth/meta-leads/callback] upsert failed:', upsertError.message)
    return closeWithError(`Failed to save: ${upsertError.message}`)
  }

  // ── 6. Subscribe page to leadgen events (non-fatal) ───────────────────────
  try {
    await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: 'leadgen',
        access_token:      page.access_token,
      }),
    })
  } catch (err) {
    console.warn('[oauth/meta-leads/callback] page subscription failed:', err)
  }

  // ── 7. Register app-level webhook (idempotent) ────────────────────────────
  try {
    const appToken       = `${appId}|${appSecret}`
    const appVerifyToken = process.env.META_APP_VERIFY_TOKEN ?? verifyToken
    await fetch(`https://graph.facebook.com/v19.0/${appId}/subscriptions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object:       'page',
        callback_url: `${appUrl}/api/webhooks/meta-leadgen`,
        fields:       'leadgen',
        verify_token: appVerifyToken,
        access_token: appToken,
      }),
    })
  } catch (err) {
    console.warn('[oauth/meta-leads/callback] app webhook registration failed:', err)
  }

  return new NextResponse(CLOSE_OK, { headers: { 'Content-Type': 'text/html' } })
}
