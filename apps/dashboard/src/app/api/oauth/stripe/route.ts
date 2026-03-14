import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Initiates Stripe Connect OAuth flow.
 * Redirects to Stripe's authorization page so the user can connect their
 * Stripe account to this workspace.
 *
 * Query params:
 *   state – 'onboarding' | 'default' (passed through to callback)
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.STRIPE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Stripe Connect not configured' }, { status: 500 })
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/oauth/stripe/callback`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return NextResponse.redirect(`${appUrl}/login`)

  const stateParam = req.nextUrl.searchParams.get('state') ?? 'default'

  const state = Buffer.from(JSON.stringify({
    uid:        user.id,
    wid:        membership.workspace_id,
    onboarding: stateParam === 'onboarding',
  })).toString('base64url')

  const url = new URL('https://connect.stripe.com/oauth/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('scope',         'read_write')
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('state',         state)

  return NextResponse.redirect(url.toString())
}
