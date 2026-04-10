'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

type IgCandidate = {
  igAccountId: string
  igUsername:  string
  pageId:      string
  pageName:    string
  accessToken: string
}

export async function selectInstagramAccount(
  sessionId: string,
  igAccountId: string,
): Promise<{ integrationId?: string; error?: string }> {
  const admin = createAdminClient()

  // Fetch the pending integration
  const { data: pending, error: fetchErr } = await admin
    .from('integrations')
    .select('id, workspace_id, bot_id, name, config')
    .eq('id', sessionId)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !pending) return { error: 'Session not found or expired' }

  const cfg        = pending.config as Record<string, unknown>
  const candidates = (cfg.pending_accounts as IgCandidate[]) ?? []
  const pick       = candidates.find(c => c.igAccountId === igAccountId)

  if (!pick) return { error: 'Account not found in session' }

  const verifyToken = randomBytes(16).toString('hex')
  const appId       = process.env.MESSENGER_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || ''
  const appSecret   = process.env.MESSENGER_APP_SECRET || (cfg.app_secret as string) || process.env.INSTAGRAM_APP_SECRET || ''

  // Update the pending integration to active with the chosen account
  const { error: updateErr } = await admin
    .from('integrations')
    .update({
      name:   `Instagram${pick.igUsername ? ` — @${pick.igUsername}` : ' DM'}`,
      status: 'active',
      config: {
        access_token:         pick.accessToken,
        page_access_token:    pick.accessToken,
        page_id:              pick.pageId,
        page_name:            pick.pageName,
        instagram_account_id: pick.igAccountId,
        instagram_username:   pick.igUsername,
        app_secret:           appSecret,
        verify_token:         verifyToken,
      },
    })
    .eq('id', sessionId)

  if (updateErr) return { error: updateErr.message }

  // Register webhook — use Messenger app (already approved) routing via Facebook webhook
  const apiUrl       = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://appalix-api.onrender.com'
  const appToken     = `${appId}|${appSecret}`
  const webhookToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? ''

  try {
    await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object:       'page',
        callback_url: `${apiUrl}/webhooks/facebook`,
        fields:       'messages,messaging_postbacks',
        verify_token: webhookToken,
        access_token: appToken,
      }),
    })
  } catch { /* non-fatal */ }

  try {
    await fetch(`https://graph.facebook.com/v18.0/${pick.pageId}/subscribed_apps`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks'], access_token: pick.accessToken }),
    })
  } catch { /* non-fatal */ }

  return { integrationId: sessionId }
}
