'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function resubscribeInstagramWebhooks(integrationId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Unauthorised' }

  const admin = createAdminClient()
  const { data: intRaw } = await admin
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('platform', 'instagram')
    .single()

  if (!intRaw) return { ok: false, message: 'Integration not found' }

  const cfg          = intRaw.config as Record<string, string>
  const pageId       = cfg.page_id
  const igAccountId  = cfg.instagram_account_id
  const accessToken  = cfg.page_access_token || cfg.access_token
  const appId        = process.env.MESSENGER_APP_ID || process.env.META_APP_ID || ''
  const appSecret    = process.env.MESSENGER_APP_SECRET || cfg.app_secret || process.env.META_APP_SECRET || ''
  const appToken     = `${appId}|${appSecret}`
  const igAppId      = process.env.INSTAGRAM_APP_ID || appId
  const igAppSecret  = process.env.INSTAGRAM_APP_SECRET || appSecret
  const igAppToken   = `${igAppId}|${igAppSecret}`
  const apiUrl       = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://appalix-api.onrender.com'
  const verifyToken  = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? ''

  const results: string[] = []

  // 1. Messenger app — object:page subscription
  try {
    const res  = await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object:       'page',
        callback_url: `${apiUrl}/webhooks/facebook`,
        fields:       'messages,messaging_postbacks',
        verify_token: verifyToken,
        access_token: appToken,
      }),
    })
    const data = await res.json()
    results.push(`Page app sub: ${data.success ? 'OK' : JSON.stringify(data)}`)
  } catch (err) {
    results.push(`Page app sub error: ${err}`)
  }

  // 2. Instagram app — object:instagram subscription
  try {
    const res  = await fetch(`https://graph.facebook.com/v18.0/${igAppId}/subscriptions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object:       'instagram',
        callback_url: `${apiUrl}/webhooks/facebook`,
        fields:       'messages,messaging_postbacks',
        verify_token: verifyToken,
        access_token: igAppToken,
      }),
    })
    const data = await res.json()
    results.push(`Instagram app sub: ${data.success ? 'OK' : JSON.stringify(data)}`)
  } catch (err) {
    results.push(`Instagram app sub error: ${err}`)
  }

  // 3. Page subscription (Messenger app)
  if (pageId && accessToken) {
    try {
      const res  = await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks'], access_token: accessToken }),
      })
      const data = await res.json()
      results.push(`Page sub: ${data.success ? 'OK' : JSON.stringify(data)}`)
    } catch (err) {
      results.push(`Page sub error: ${err}`)
    }
  }

  // 4. Instagram account subscription (Instagram app token)
  if (igAccountId) {
    try {
      const res  = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/subscribed_apps`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks'], access_token: igAppToken }),
      })
      const data = await res.json()
      results.push(`IG account sub: ${data.success ? 'OK' : JSON.stringify(data)}`)
    } catch (err) {
      results.push(`IG account sub error: ${err}`)
    }
  }

  const allOk = results.every(r => r.includes('OK'))
  return { ok: allOk, message: results.join(' | ') }
}
