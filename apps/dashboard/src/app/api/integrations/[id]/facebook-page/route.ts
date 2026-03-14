import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * PATCH /api/integrations/:id/facebook-page
 * Updates the connected Facebook Page for an existing Messenger integration.
 * Expects { pageId, pageName, pageAccessToken } in the body.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { pageId, pageName, pageAccessToken } = await req.json() as {
    pageId: string
    pageName: string
    pageAccessToken: string
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rowRaw } = await supabase
    .from('integrations')
    .select('config, workspace_id')
    .eq('id', id)
    .single()
  if (!rowRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingConfig = (rowRaw as any).config as Record<string, unknown>

  const appId     = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!

  const admin = createAdminClient()
  const { error } = await admin
    .from('integrations')
    .update({
      config: {
        ...existingConfig,
        page_id:           pageId,
        page_name:         pageName,
        page_access_token: pageAccessToken,
      },
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Re-register app-level webhook (idempotent)
  const apiUrl       = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://ap.appalix.ai'
  const webhookToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN!
  const appToken     = `${appId}|${appSecret}`
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
  } catch (err) {
    console.error('[facebook-page] app webhook re-registration failed:', err)
  }

  // Subscribe the new page to receive events
  try {
    await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: 'messages,messaging_postbacks',
        access_token:      pageAccessToken,
      }),
    })
  } catch (err) {
    console.error('[facebook-page] page subscription error:', err)
  }

  return NextResponse.json({ ok: true })
}
