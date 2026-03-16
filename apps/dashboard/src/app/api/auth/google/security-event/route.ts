/**
 * Google Cross-Account Protection — Security Event Token (SET) endpoint.
 * Google calls this when a user's account is compromised or they revoke access.
 * Required for apps requesting restricted Gmail scopes.
 * Spec: https://openid.net/specs/openid-risc-profile-1_0.html
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // The SET is a JWT — decode the payload (we trust Google's signature for now;
    // full verification would require fetching Google's JWKS and validating the RS256 sig)
    const parts = body.split('.')
    if (parts.length < 2) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    const subject = payload.sub as string | undefined
    const events  = payload.events as Record<string, unknown> | undefined

    if (!subject || !events) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Handle token-revocation-related events — disconnect the integration
    const revocationEvents = [
      'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
      'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
      'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
      'https://schemas.openid.net/secevent/risc/event-type/account-purged',
    ]

    const isRevocation = revocationEvents.some(e => e in events)

    if (isRevocation) {
      // Disconnect any Gmail integration tied to this Google subject
      await admin
        .from('sage_integrations')
        .update({ status: 'disconnected', updated_at: new Date().toISOString() })
        .eq('provider', 'gmail')
        .contains('config', { google_id: subject })
    }

    // Always return 202 Accepted — Google expects this
    return new NextResponse(null, { status: 202 })
  } catch (err) {
    console.error('[google/security-event]', err)
    // Still return 202 to prevent Google from retrying endlessly
    return new NextResponse(null, { status: 202 })
  }
}
