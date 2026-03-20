import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * Initiates Shopify OAuth install flow.
 * Query params:
 *   shop    – merchant's myshopify.com domain
 *   name    – integration name
 *   bot_id  – Appalix bot to attach
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Shopify OAuth not configured' }, { status: 500 })
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.appalix.ai'
  const apiUrl     = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'
  const redirectUri = `${apiUrl}/shopify/callback`

  const shopRaw = req.nextUrl.searchParams.get('shop')   ?? ''
  const name    = req.nextUrl.searchParams.get('name')   ?? 'Shopify integration'
  const botId   = req.nextUrl.searchParams.get('bot_id') ?? ''

  if (!shopRaw) {
    return NextResponse.redirect(`${appUrl}/integrations/new?platform=shopify&error=missing_shop`)
  }

  // Extract store name from any input format:
  //   https://admin.shopify.com/store/mystore  → mystore
  //   https://mystore.myshopify.com/...        → mystore
  //   mystore.myshopify.com                   → mystore
  //   mystore.com                             → mystore (best guess)
  //   mystore                                 → mystore
  let storeName = shopRaw.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')

  const adminMatch = storeName.match(/admin\.shopify\.com\/store\/([^/?#]+)/)
  if (adminMatch) {
    storeName = adminMatch[1]
  } else if (storeName.includes('.myshopify.com')) {
    storeName = storeName.split('.myshopify.com')[0]
  } else if (storeName.includes('.')) {
    // e.g. mystore.com → take the first segment
    storeName = storeName.split('.')[0]
  }

  const shopDomain = `${storeName}.myshopify.com`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return NextResponse.redirect(`${appUrl}/login`)

  // Encode context + nonce in state to prevent CSRF
  const nonce = randomBytes(16).toString('hex')
  const state = Buffer.from(JSON.stringify({
    uid:   user.id,
    wid:   membership.workspace_id,
    name,
    botId,
    shop:  shopDomain,
    nonce,
  })).toString('base64url')

  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`)
  url.searchParams.set('client_id',    clientId)
  url.searchParams.set('scope',        'read_orders,read_customers,read_fulfillments,write_script_tags')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state',        state)

  return NextResponse.redirect(url.toString())
}
