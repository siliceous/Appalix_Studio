import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Stripe Connect OAuth2 callback.
 * Exchanges the authorization code for an access token, fetches the connected
 * account name, then upserts a sage_integration row and redirects back to the
 * integrations page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    const desc = searchParams.get('error_description') ?? 'access_denied'
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(desc)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_code`)
  }

  // ── 1. Decode state ──────────────────────────────────────────────────────
  let uid = '', wid = '', onboarding = false
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid        = parsed.uid        ?? ''
    wid        = parsed.wid        ?? ''
    onboarding = parsed.onboarding ?? false
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=invalid_state`)
  }

  if (!uid || !wid) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_context`)
  }

  // ── 2. Exchange code for access token ───────────────────────────────────
  const platformSecretKey = process.env.STRIPE_SECRET_KEY!

  let tokenData: {
    access_token?:           string
    stripe_user_id?:         string
    stripe_publishable_key?: string
    scope?:                  string
    error?:                  string
    error_description?:      string
  }

  try {
    const res = await fetch('https://connect.stripe.com/oauth/token', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${platformSecretKey}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
    })
    tokenData = await res.json() as typeof tokenData
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange_failed`)
  }

  if (!tokenData.access_token || !tokenData.stripe_user_id) {
    const detail = tokenData.error_description ?? tokenData.error ?? 'unknown'
    console.error('[oauth/stripe/callback] token exchange error:', detail)
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(detail)}`)
  }

  // ── 3. Fetch connected account name ────────────────────────────────────
  let accountName = 'Stripe Account'
  try {
    const accountRes = await fetch(
      `https://api.stripe.com/v1/accounts/${tokenData.stripe_user_id}`,
      { headers: { 'Authorization': `Bearer ${platformSecretKey}` } },
    )
    const account = await accountRes.json() as {
      business_profile?: { name?: string }
      email?:            string
    }
    accountName = account.business_profile?.name ?? account.email ?? accountName
  } catch {
    // non-fatal — display name fallback is fine
  }

  // ── 4. Upsert sage_integration ──────────────────────────────────────────
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_integrations')
    .upsert({
      workspace_id: wid,
      user_id:      uid,
      provider:     'stripe',
      status:       'connected',
      config: {
        secret_key:      tokenData.access_token,           // compatible with existing Sage invoicing code
        stripe_user_id:  tokenData.stripe_user_id,
        publishable_key: tokenData.stripe_publishable_key ?? '',
        account_name:    accountName,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'workspace_id,user_id,provider',
    })

  if (error) {
    console.error('[oauth/stripe/callback] upsert failed:', error.message)
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(error.message)}`)
  }

  // ── 5. Redirect back ─────────────────────────────────────────────────────
  const redirectTo = onboarding
    ? `${appUrl}/dashboard`
    : `${appUrl}/integrations?provider=stripe&connected=1`
  return NextResponse.redirect(redirectTo)
}
