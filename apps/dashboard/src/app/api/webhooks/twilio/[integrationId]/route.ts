import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { createAdminClient } from '@/lib/supabase/server'

// Never statically render — dynamic webhook
export const dynamic = 'force-dynamic'

// SMS STOP/HELP/START keyword patterns (CTIA compliance)
const OPT_OUT_KEYWORDS  = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'])
const OPT_IN_KEYWORDS   = new Set(['start', 'yes', 'unstop'])
const HELP_KEYWORDS     = new Set(['help', 'info'])

function normalizeE164(raw: string): string | null {
  try {
    if (isValidPhoneNumber(raw)) {
      return parsePhoneNumber(raw).number as string
    }
    // Try with US country as fallback
    if (isValidPhoneNumber(raw, 'US')) {
      return parsePhoneNumber(raw, 'US').number as string
    }
  } catch { /* fall through */ }
  return null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await params

  // ── 1. Read raw body for signature validation ──────────────────────────────
  // IMPORTANT: must read as text before parsing — same pattern as Stripe webhook
  const rawBody = await req.text()

  // ── 2. Validate Twilio signature ───────────────────────────────────────────
  const signature  = req.headers.get('x-twilio-signature') ?? ''
  const authToken  = process.env.TWILIO_AUTH_TOKEN

  if (!authToken) {
    console.error('[twilio/inbound] TWILIO_AUTH_TOKEN env var not set')
    return new NextResponse('<Response/>', { status: 500, headers: { 'Content-Type': 'text/xml' } })
  }

  // Build the full URL Twilio signed — use the actual request URL so it always matches
  // what was configured in the Twilio console, regardless of env var availability
  const webhookUrl = `https://app.appalix.ai/api/webhooks/twilio/${integrationId}`

  // Parse form body into a plain object for signature validation
  const formParams: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(rawBody).entries()) {
    formParams[k] = v
  }

  const isValid = twilio.validateRequest(authToken, signature, webhookUrl, formParams)
  if (!isValid) {
    console.warn(`[twilio/inbound] Invalid signature for integration ${integrationId}`)
    return new NextResponse('<Response/>', { status: 403, headers: { 'Content-Type': 'text/xml' } })
  }

  // ── 3. Extract Twilio fields ───────────────────────────────────────────────
  const messageSid  = formParams['MessageSid']  ?? ''
  const fromRaw     = formParams['From']         ?? ''
  const toRaw       = formParams['To']           ?? ''
  const body        = formParams['Body']         ?? ''
  const numMedia    = parseInt(formParams['NumMedia'] ?? '0', 10)

  if (!messageSid || !fromRaw || !toRaw) {
    console.error('[twilio/inbound] Missing required Twilio fields')
    return new NextResponse('<Response/>', { status: 400, headers: { 'Content-Type': 'text/xml' } })
  }

  // Normalize phone numbers to E.164
  const fromE164 = normalizeE164(fromRaw)
  if (!fromE164) {
    console.error(`[twilio/inbound] Could not normalize phone number: ${fromRaw}`)
    return new NextResponse('<Response/>', { status: 200, headers: { 'Content-Type': 'text/xml' } })
  }

  // ── 4. Process asynchronously, return TwiML immediately ───────────────────
  // Twilio requires a 200 within 15 seconds; processing is async to be safe
  handleInbound({ integrationId, messageSid, fromE164, toRaw, body, numMedia, formParams }).catch(err =>
    console.error('[twilio/inbound] handler error:', err),
  )

  // Empty TwiML — no auto-reply; humans/AI handle responses
  return new NextResponse('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

// ── Async handler ─────────────────────────────────────────────────────────────

async function handleInbound({
  integrationId,
  messageSid,
  fromE164,
  toRaw,
  body,
  numMedia,
  formParams,
}: {
  integrationId: string
  messageSid:    string
  fromE164:      string
  toRaw:         string
  body:          string
  numMedia:      number
  formParams:    Record<string, string>
}) {
  const admin = createAdminClient()

  // ── 1. Look up the integration ─────────────────────────────────────────────
  const { data: integration } = await admin
    .from('integrations')
    .select('id, workspace_id, config')
    .eq('id', integrationId)
    .eq('platform', 'sms')
    .eq('status', 'active')
    .single()

  if (!integration) {
    console.warn(`[twilio/inbound] No active SMS integration for id=${integrationId}`)
    return
  }

  const workspaceId = integration.workspace_id as string

  // ── 2. Idempotency — skip duplicate MessageSid ─────────────────────────────
  const { data: existing } = await admin
    .from('messages')
    .select('id')
    .eq('platform_message_id', messageSid)
    .maybeSingle()

  if (existing) {
    console.info(`[twilio/inbound] Duplicate MessageSid ${messageSid}, skipping`)
    return
  }

  // ── 3. Handle opt-out / opt-in / help keywords ────────────────────────────
  const keyword = body.trim().toLowerCase()

  if (OPT_OUT_KEYWORDS.has(keyword)) {
    await admin
      .from('sage_contacts')
      .update({ sms_opt_out: true } as never)
      .eq('workspace_id', workspaceId)
      .eq('phone', fromE164)
    console.info(`[twilio/inbound] Opt-out recorded for ${fromE164}`)
    // Still save the message below so agents see it
  } else if (OPT_IN_KEYWORDS.has(keyword)) {
    await admin
      .from('sage_contacts')
      .update({ sms_opt_out: false } as never)
      .eq('workspace_id', workspaceId)
      .eq('phone', fromE164)
    console.info(`[twilio/inbound] Opt-in recorded for ${fromE164}`)
  }
  // HELP keywords: no opt-out change, carrier handles the reply

  // ── 4. Find or create contact ──────────────────────────────────────────────
  let contactId: string | null = null
  const { data: existingContact } = await admin
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('phone', fromE164)
    .maybeSingle()

  if (existingContact) {
    contactId = existingContact.id as string
  } else {
    const { data: newContact } = await admin
      .from('sage_contacts')
      .insert({
        workspace_id: workspaceId,
        phone:        fromE164,
        name:         fromE164, // will be updated when we get more info
      })
      .select('id')
      .single()
    contactId = newContact?.id ?? null
  }

  // ── 5. Find or create conversation ────────────────────────────────────────
  // Thread key: (workspace_id, platform='sms', platform_thread_id=fromE164)
  let conversationId: string | null = null
  const { data: existingConv } = await admin
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'sms')
    .eq('platform_thread_id', fromE164)
    .is('deleted_at', null)
    .maybeSingle()

  if (existingConv) {
    conversationId = existingConv.id as string
    // Reopen if it was closed
    await admin
      .from('conversations')
      .update({ status: 'active', updated_at: new Date().toISOString() } as never)
      .eq('id', conversationId)
  } else {
    const { data: newConv } = await admin
      .from('conversations')
      .insert({
        workspace_id:       workspaceId,
        integration_id:     integrationId,
        platform:           'sms',
        platform_thread_id: fromE164,
        title:              fromE164,
        status:             'active',
        contact_id:         contactId,
      } as never)
      .select('id')
      .single()
    conversationId = newConv?.id ?? null
  }

  if (!conversationId) {
    console.error('[twilio/inbound] Failed to find/create conversation')
    return
  }

  // ── 6. Build message metadata (includes media URLs) ───────────────────────
  const metadata: Record<string, unknown> = {
    twilio: formParams,
  }
  if (numMedia > 0) {
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const url = formParams[`MediaUrl${i}`]
      if (url) mediaUrls.push(url)
    }
    metadata.media_urls = mediaUrls
  }

  // ── 7. Insert message ──────────────────────────────────────────────────────
  await admin.from('messages').insert({
    conversation_id:   conversationId,
    role:              'user',
    content:           body,
    platform_message_id: messageSid,
    metadata,
  } as never)

  // ── 8. Activity log ────────────────────────────────────────────────────────
  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'conversation',
    entity_id:    conversationId,
    event_type:   'sms_received',
    payload:      { from: fromE164, to: toRaw, sid: messageSid },
  })

  // ── 9. SMS usage log ───────────────────────────────────────────────────────
  await admin.from('sms_usage_log').insert({
    workspace_id:    workspaceId,
    integration_id:  integrationId,
    conversation_id: conversationId,
    message_sid:     messageSid,
    direction:       'inbound',
    from_number:     fromE164,
    to_number:       toRaw,
    segments:        1,
    status:          'received',
  } as never)

  console.info(`[twilio/inbound] Saved SMS from ${fromE164} → conv=${conversationId}`)
}
