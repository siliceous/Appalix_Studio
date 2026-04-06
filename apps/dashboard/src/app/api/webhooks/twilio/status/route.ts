import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/server'

// Twilio MessageStatus → message_events event_type
const STATUS_EVENT_MAP: Record<string, string> = {
  sent:      'sms_sent',
  delivered: 'sms_delivered',
  failed:    'sms_failed',
  undelivered: 'sms_failed',
}

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // ── 1. Read raw body for signature validation ──────────────────────────────
  const rawBody = await req.text()
  const formParams: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(rawBody).entries()) {
    formParams[k] = v
  }

  // ── 2. Validate Twilio signature ───────────────────────────────────────────
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!authToken) {
    console.error('[twilio/status] TWILIO_AUTH_TOKEN env var not set')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const webhookUrl = 'https://app.appalix.ai/api/webhooks/twilio/status'

  const isValid = twilio.validateRequest(authToken, signature, webhookUrl, formParams)
  if (!isValid) {
    console.warn('[twilio/status] Invalid signature')
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  // ── 3. Extract fields ──────────────────────────────────────────────────────
  const messageSid    = formParams['MessageSid']    ?? ''
  const messageStatus = formParams['MessageStatus'] ?? ''
  // MessagingServiceSid is present for outbound; optional
  const errorCode     = formParams['ErrorCode']     ?? null

  // Twilio sends cost as e.g. "-0.000750" — only present on final status events
  const priceRaw = formParams['Price'] ?? null
  const costUsd  = priceRaw ? Math.abs(parseFloat(priceRaw)) : null

  if (!messageSid) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── 4. Update message delivery status ─────────────────────────────────────
  await admin
    .from('messages')
    .update({ metadata: { delivery_status: messageStatus, error_code: errorCode } } as never)
    .eq('platform_message_id', messageSid)

  // ── 5. Update usage log — cost arrives on delivered/failed ─────────────────
  await admin
    .from('sms_usage_log')
    .update({
      status:    messageStatus,
      error_code: errorCode,
      updated_at: new Date().toISOString(),
      ...(costUsd !== null ? { cost_usd: costUsd } : {}),
    } as never)
    .eq('message_sid', messageSid)

  // ── 6. Write message_events delivery event ────────────────────────────────
  const eventType = STATUS_EVENT_MAP[messageStatus]
  if (eventType) {
    // Look up conversation + contact linkage from sms_usage_log
    const { data: usageRow } = await admin
      .from('sms_usage_log')
      .select('workspace_id, conversation_id')
      .eq('message_sid', messageSid)
      .maybeSingle()

    if (usageRow?.workspace_id) {
      await admin.from('message_events').upsert({
        workspace_id:        usageRow.workspace_id,
        channel:             'sms',
        external_message_id: messageSid,
        conversation_id:     usageRow.conversation_id ?? null,
        event_type:          eventType,
        provider:            'twilio',
        provider_payload:    {
          message_status: messageStatus,
          error_code:     errorCode,
          cost_usd:       costUsd,
        },
        event_at: new Date().toISOString(),
      }, { onConflict: 'external_message_id,event_type', ignoreDuplicates: true })
    }
  }

  console.info(`[twilio/status] ${messageSid} → ${messageStatus}${costUsd ? ` ($${costUsd})` : ''}`)

  return NextResponse.json({ ok: true })
}
