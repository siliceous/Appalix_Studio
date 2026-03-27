import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Exchanges a short-lived user token for a long-lived one,
 * then returns all Facebook Pages the user manages — so the
 * frontend can show a page picker before creating the integration.
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token: string }
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appId     = process.env.MESSENGER_APP_ID     || process.env.META_APP_ID     || process.env.FACEBOOK_APP_ID     || ''
  const appSecret = process.env.MESSENGER_APP_SECRET || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || ''

  // Exchange short-lived → long-lived
  let longToken: string
  try {
    const res  = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type:        'fb_exchange_token',
        client_id:         appId,
        client_secret:     appSecret,
        fb_exchange_token: token,
      }),
    )
    const data = await res.json() as { access_token?: string; error?: { message: string } }
    if (!data.access_token) throw new Error(data.error?.message ?? 'no token')
    longToken = data.access_token
  } catch (err) {
    return NextResponse.json({ error: `Token exchange failed: ${String(err)}` }, { status: 500 })
  }

  // Fetch pages
  try {
    const res  = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`)
    const data = await res.json() as {
      data?: { access_token: string; id: string; name: string }[]
      error?: { message: string }
    }
    if (!data.data) throw new Error(data.error?.message ?? 'no pages')
    return NextResponse.json({
      longToken,
      pages: data.data.map(p => ({ id: p.id, name: p.name, access_token: p.access_token })),
    })
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch pages: ${String(err)}` }, { status: 500 })
  }
}
