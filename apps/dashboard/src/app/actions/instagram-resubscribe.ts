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
  const accessToken  = cfg.page_access_token || cfg.access_token
  // Use Messenger app (already Live + approved) — Instagram events route via Facebook webhook
  const appId        = process.env.MESSENGER_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || ''
  const appSecret    = process.env.MESSENGER_APP_SECRET || cfg.app_secret || process.env.META_APP_SECRET || ''
  const appToken     = `${appId}|${appSecret}`
  const apiUrl       = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://appalix-api.onrender.com'
  const verifyToken  = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? ''

  const results: string[] = []

  // 1. App-level subscription (page object, facebook webhook)
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
    results.push(`App subscription: ${data.success ? 'OK' : JSON.stringify(data)}`)
  } catch (err) {
    results.push(`App subscription error: ${err}`)
  }

  // 2. Facebook Page subscription — include instagram field so IG DMs arrive here
  if (pageId && accessToken) {
    try {
      const res  = await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks', 'instagram'], access_token: accessToken }),
      })
      const data = await res.json()
      results.push(`Page subscription: ${data.success ? 'OK' : JSON.stringify(data)}`)
    } catch (err) {
      results.push(`Page subscription error: ${err}`)
    }
  }

  const allOk = results.every(r => r.includes('OK'))
  return { ok: allOk, message: results.join(' | ') }
}
