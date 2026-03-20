import type { FastifyInstance } from 'fastify'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL     ?? 'https://app.appalix.ai'
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.appalix.ai'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Verify Shopify's HMAC on the OAuth callback query string.
 * Shopify signs all query params except `hmac` itself, sorted alphabetically.
 */
function verifyShopifyOAuthHmac(query: Record<string, string>, secret: string): boolean {
  const { hmac, ...rest } = query
  if (!hmac) return false
  const message = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('&')
  const expected = createHmac('sha256', secret).update(message).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))
  } catch {
    return false
  }
}

export async function shopifyOAuthRoutes(fastify: FastifyInstance) {
  /**
   * GET /shopify/callback
   * Shopify redirects here after merchant approves the app.
   */
  fastify.get<{
    Querystring: { code?: string; shop?: string; state?: string; hmac?: string; timestamp?: string; error?: string }
  }>('/shopify/callback', async (request, reply) => {
    const { code, shop, state: rawState, error } = request.query
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!
    const clientId     = process.env.SHOPIFY_CLIENT_ID!

    if (error) {
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=${encodeURIComponent(error)}`)
    }

    if (!code || !shop || !rawState) {
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=missing_params`)
    }

    // Verify HMAC
    const allQuery = request.query as Record<string, string>
    if (!verifyShopifyOAuthHmac(allQuery, clientSecret)) {
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=invalid_hmac`)
    }

    // Decode state
    let uid = '', wid = '', name = 'Shopify integration', botId = '', shopFromState = ''
    try {
      const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString())
      uid           = parsed.uid   ?? ''
      wid           = parsed.wid   ?? ''
      name          = parsed.name  ?? name
      botId         = parsed.botId ?? ''
      shopFromState = parsed.shop  ?? ''
    } catch {
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=invalid_state`)
    }

    // Ensure shop in callback matches shop in state (security check)
    if (shopFromState && shop !== shopFromState) {
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=shop_mismatch`)
    }

    if (!uid || !wid) {
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=missing_context`)
    }

    // Exchange code for permanent access token
    let accessToken = ''
    try {
      const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      })
      const data = await res.json() as { access_token?: string; error?: string }
      if (!data.access_token) throw new Error(data.error ?? 'no token')
      accessToken = data.access_token
    } catch (err) {
      fastify.log.error({ err }, '[shopify oauth] token exchange failed')
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=token_exchange_failed`)
    }

    // Fetch shop info
    let shopName = '', shopEmail = ''
    try {
      const res  = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      })
      const data = await res.json() as { shop?: { name?: string; email?: string } }
      shopName  = data.shop?.name  ?? ''
      shopEmail = data.shop?.email ?? ''
    } catch { /* non-fatal */ }

    // Generate webhook secret and register webhooks + ScriptTag
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const webhookSecret = Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

    // Save integration first to get the ID
    const admin  = adminClient()
    const config = {
      shop_domain:    shop,
      access_token:   accessToken,
      webhook_secret: webhookSecret,
      shop_name:      shopName  || null,
      shop_email:     shopEmail || null,
    }

    const { data: inserted, error: dbError } = await admin
      .from('integrations')
      .insert({
        workspace_id: wid,
        bot_id:       botId || null,
        platform:     'shopify',
        name:         name || `Shopify — ${shopName || shop}`,
        status:       'active',
        config,
      })
      .select('id')
      .single()

    if (dbError || !inserted) {
      fastify.log.error({ err: dbError }, '[shopify oauth] insert failed')
      return reply.redirect(`${APP_URL}/integrations/new?platform=shopify&error=${encodeURIComponent(dbError?.message ?? 'db_error')}`)
    }

    const integrationId = (inserted as { id: string }).id
    const webhookAddr   = `${API_URL}/webhooks/shopify/${integrationId}`
    const scriptSrc     = `${API_URL}/widget.js?id=${integrationId}`

    // Register webhooks + ScriptTag (non-fatal)
    try {
      const topics = ['orders/create', 'orders/updated', 'fulfillments/create', 'orders/cancelled']
      await Promise.all([
        ...topics.map(topic =>
          fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
            body:    JSON.stringify({ webhook: { topic, address: webhookAddr, format: 'json' } }),
          })
        ),
        fetch(`https://${shop}/admin/api/2024-01/script_tags.json`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
          body:    JSON.stringify({ script_tag: { event: 'onload', src: scriptSrc } }),
        }),
      ])

      await admin.from('integrations').update({
        config: { ...config, webhooks_registered: true, script_tag_src: scriptSrc },
      }).eq('id', integrationId)
    } catch { /* non-fatal */ }

    return reply.redirect(`${APP_URL}/integrations/${integrationId}?connected=shopify`)
  })
}
