import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'

const CLOSE_OK = `
<html><head><title>Connected</title></head><body>
<script>
  if (window.opener) { window.opener.postMessage({ type: 'linkedin-connected' }, '*') }
  window.close()
</script>
<p>LinkedIn connected! You can close this window.</p>
</body></html>`

function closeWithError(msg: string) {
  return new NextResponse(
    `<html><head><title>Error</title></head><body>
<script>
  if (window.opener) { window.opener.postMessage({ type: 'linkedin-error', error: ${JSON.stringify(msg)} }, '*') }
  window.close()
</script>
<p>Error: ${msg}. You can close this window.</p>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}

/**
 * LinkedIn Lead Gen Forms OAuth callback.
 * Exchanges the code for tokens, fetches account/org info,
 * saves to lead_ad_sources, then closes the popup.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const clientId     = process.env.LINKEDIN_CLIENT_ID     ?? ''
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? ''

  if (!clientId || !clientSecret) return closeWithError('LinkedIn OAuth not configured on server')

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

  const redirectUri = `${appUrl}/api/oauth/linkedin/callback`

  // ── 2. Exchange code → access token ──────────────────────────────────────
  let accessToken = '', expiresIn = 0, refreshToken = ''
  try {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    })
    const data = await res.json() as {
      access_token?:  string
      expires_in?:    number
      refresh_token?: string
      error?:         string
      error_description?: string
    }
    if (!data.access_token) throw new Error(data.error_description ?? data.error ?? 'no token')
    accessToken  = data.access_token
    expiresIn    = data.expires_in    ?? 0
    refreshToken = data.refresh_token ?? ''
  } catch (err) {
    return closeWithError(`Token exchange failed: ${String(err)}`)
  }

  // ── 3. Get user profile (OpenID) ──────────────────────────────────────────
  let firstName = '', lastName = '', email = ''
  try {
    const res  = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json() as {
      given_name?:  string
      family_name?: string
      email?:       string
    }
    firstName = data.given_name  ?? ''
    lastName  = data.family_name ?? ''
    email     = data.email       ?? ''
  } catch {
    // non-fatal
  }

  const accountName = [firstName, lastName].filter(Boolean).join(' ') || email || 'LinkedIn Account'

  // ── 4. Get organization (ad account) info ─────────────────────────────────
  let orgId = '', orgName = ''
  try {
    const res  = await fetch(
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationUrn,organization~(id,localizedName)))',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const data = await res.json() as {
      elements?: { organizationUrn?: string; 'organization~'?: { id?: number; localizedName?: string } }[]
    }
    const first = data.elements?.[0]
    if (first) {
      orgId   = first.organizationUrn?.split(':').pop() ?? ''
      orgName = first['organization~']?.localizedName ?? ''
    }
  } catch {
    // non-fatal
  }

  // ── 5. Save to lead_ad_sources (upsert) ───────────────────────────────────
  const admin = createAdminClient()
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null

  const config = {
    access_token:      accessToken,
    refresh_token:     refreshToken || null,
    token_expires_at:  tokenExpiresAt,
    org_id:            orgId   || null,
    org_name:          orgName || null,
    account_name:      accountName,
    email:             email   || null,
  }

  const { data: existing } = await admin
    .from('lead_ad_sources')
    .select('id')
    .eq('workspace_id', wid)
    .eq('platform', 'linkedin')
    .maybeSingle()

  let saveError: { message: string } | null = null
  if (existing) {
    const { error } = await admin
      .from('lead_ad_sources')
      .update({
        name:       `LinkedIn — ${orgName || accountName}`,
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
        platform:     'linkedin',
        name:         `LinkedIn — ${orgName || accountName}`,
        status:       'active',
        config,
      })
    saveError = error
  }

  if (saveError) {
    console.error('[oauth/linkedin/callback] save failed:', saveError.message)
    return closeWithError(`Failed to save: ${saveError.message}`)
  }

  return new NextResponse(CLOSE_OK, { headers: { 'Content-Type': 'text/html' } })
}
