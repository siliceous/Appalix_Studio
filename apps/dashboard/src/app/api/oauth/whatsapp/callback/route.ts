import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * WhatsApp Business OAuth2 callback.
 * Exchanges the auth code for a system user access token, retrieves the
 * WhatsApp Business Account and phone number ID, and creates an integration.
 *
 * Context (uid, wid, name, botId) is carried in the base64url-encoded state param.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (searchParams.get('error')) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=whatsapp&error=access_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=whatsapp&error=missing_code`)
  }

  // ── 1. Decode state ──────────────────────────────────────────────────────
  let uid = '', wid = '', name = 'WhatsApp Business', botId = ''
  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
    uid   = parsed.uid   ?? ''
    wid   = parsed.wid   ?? ''
    name  = parsed.name  ?? name
    botId = parsed.botId ?? ''
  } catch {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=whatsapp&error=invalid_state`)
  }

  if (!uid || !wid) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=whatsapp&error=missing_context`)
  }

  // ── 2. Exchange code for user access token ───────────────────────────────
  const appId       = process.env.META_APP_ID!
  const appSecret   = process.env.META_APP_SECRET!
  const redirectUri = `${appUrl}/api/oauth/whatsapp/callback`

  let userToken: string
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }),
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    if (!data.access_token) throw new Error(data.error?.message ?? 'no token')
    userToken = data.access_token
  } catch (err) {
    console.error('[oauth/whatsapp/callback] token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=whatsapp&error=token_exchange_failed`)
  }

  // ── 3. Get WhatsApp Business Account and phone number ───────────────────
  let wabaId = '', phoneNumberId = '', phoneNumber = '', displayName = ''
  try {
    // Get WhatsApp Business Accounts
    const wabaRes = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?access_token=${userToken}`,
    )
    const wabaData = await wabaRes.json() as {
      data?: { id: string; name: string }[]
    }
    const firstBusiness = wabaData.data?.[0]

    if (firstBusiness) {
      wabaId = firstBusiness.id

      // Get phone numbers for this WABA
      const phoneRes = await fetch(
        `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${userToken}`,
      )
      const phoneData = await phoneRes.json() as {
        data?: { id: string; display_phone_number: string; verified_name: string }[]
      }
      const firstPhone = phoneData.data?.[0]
      if (firstPhone) {
        phoneNumberId = firstPhone.id
        phoneNumber   = firstPhone.display_phone_number
        displayName   = firstPhone.verified_name
      }
    }
  } catch (err) {
    console.error('[oauth/whatsapp/callback] WABA lookup failed:', err)
    // Non-fatal — user can configure manually
  }

  // ── 4. Generate a verify token for webhook setup ─────────────────────────
  const verifyToken = randomBytes(16).toString('hex')

  // ── 5. Create the integration ────────────────────────────────────────────
  const admin = createAdminClient()
  const config = {
    access_token:    userToken,
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

  if (error) {
    console.error('[oauth/whatsapp/callback] insert failed:', error.message)
    return NextResponse.redirect(`${appUrl}/integrations?error=save_failed`)
  }

  // ── 6. Redirect to the integration detail page ───────────────────────────
  const integrationId = (inserted as { id: string }).id
  return NextResponse.redirect(`${appUrl}/integrations/${integrationId}?connected=whatsapp`)
}
