'use server'

import twilio from 'twilio'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN env vars not set')
  }
  return twilio(accountSid, authToken)
}

async function sendViaTelnyx(params: {
  from:               string
  to:                 string
  body:               string
  messagingProfileId?: string | null
}): Promise<{ messageId: string; segments: number } | { error: string }> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return { error: 'TELNYX_API_KEY not configured' }

  const payload: Record<string, string> = { from: params.from, to: params.to, text: params.body }
  if (params.messagingProfileId) payload.messaging_profile_id = params.messagingProfileId

  const res  = await fetch('https://api.telnyx.com/v2/messages', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json() as {
    data?:   { id: string; parts: number }
    errors?: Array<{ title: string; detail: string }>
  }

  if (!res.ok || !data.data?.id) {
    const msg = data.errors?.[0]?.detail ?? `Telnyx error ${res.status}`
    return { error: msg }
  }
  return { messageId: data.data.id, segments: data.data.parts ?? 1 }
}

/**
 * Send an outbound SMS reply from the conversations view.
 * Called by the conversation reply box when platform === 'sms'.
 * Routes via Telnyx (workspace_phone_numbers) when integration_id is null,
 * or via Twilio when integration_id is set.
 */
export async function sendSms(
  conversationId: string,
  content: string,
): Promise<{ error?: string }> {
  if (!content.trim()) return { error: 'Message cannot be empty' }

  // ── Auth & workspace ───────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = memberRaw as { workspace_id: string } | null
  if (!membership) return { error: 'Unauthorized' }

  const workspaceId = membership.workspace_id
  const admin = createAdminClient()

  // ── Load conversation (must be SMS, must belong to workspace) ──────────────
  const { data: convRaw } = await admin
    .from('conversations')
    .select('id, platform, platform_thread_id, integration_id')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .eq('platform', 'sms')
    .single()

  if (!convRaw) return { error: 'Conversation not found or is not an SMS thread' }

  const conv = convRaw as {
    id: string
    platform: string
    platform_thread_id: string
    integration_id: string | null
  }

  const toNumber = conv.platform_thread_id
  if (!toNumber) return { error: 'No recipient phone number on this conversation' }

  // ── Check opt-out before sending ──────────────────────────────────────────
  const { data: contactRaw } = await admin
    .from('sage_contacts')
    .select('sms_opt_out')
    .eq('workspace_id', workspaceId)
    .eq('phone', toNumber)
    .maybeSingle()

  if ((contactRaw as { sms_opt_out: boolean } | null)?.sms_opt_out) {
    return { error: 'This contact has opted out of SMS messages (STOP)' }
  }

  // ── Route: Telnyx (no integration_id) or Twilio ───────────────────────────
  if (!conv.integration_id) {
    // Telnyx path — find the workspace's provisioned number
    const { data: phoneRaw } = await admin
      .from('workspace_phone_numbers' as never)
      .select('e164, messaging_profile_id')
      .eq('workspace_id', workspaceId)
      .is('released_at', null)
      .limit(1)
      .maybeSingle() as { data: { e164: string; messaging_profile_id: string | null } | null }

    if (!phoneRaw) return { error: 'No Telnyx number provisioned for this workspace' }

    const result = await sendViaTelnyx({
      from:               phoneRaw.e164,
      to:                 toNumber,
      body:               content,
      messagingProfileId: phoneRaw.messaging_profile_id,
    })

    if ('error' in result) {
      console.error('[sms/send] Telnyx error:', result.error)
      return { error: `Failed to send SMS: ${result.error}` }
    }

    await admin.from('messages').insert({
      workspace_id:        workspaceId,
      conversation_id:     conversationId,
      role:                'assistant',
      content,
      platform_message_id: result.messageId,
    } as never)

    await admin
      .from('conversations')
      .update({ last_activity_at: new Date().toISOString() } as never)
      .eq('id', conversationId)

    await admin.from('sage_activity_log').insert({
      workspace_id: workspaceId,
      entity_type:  'conversation',
      entity_id:    conversationId,
      event_type:   'sms_sent',
      payload:      { to: toNumber, from: phoneRaw.e164, telnyx_message_id: result.messageId },
      user_id:      user.id,
    })

    console.info(`[sms/send] Telnyx sent to ${toNumber} from ${phoneRaw.e164} — ${result.messageId}`)
    return {}
  }

  // ── Twilio path (legacy integration_id) ───────────────────────────────────
  const { data: integRaw } = await admin
    .from('integrations')
    .select('id, config, status')
    .eq('id', conv.integration_id)
    .eq('platform', 'sms')
    .single()

  if (!integRaw || integRaw.status !== 'active') {
    return { error: 'SMS integration is inactive or not found' }
  }

  const config = integRaw.config as Record<string, string>
  const fromNumber = config.phone_number ?? config.from_number
  if (!fromNumber) return { error: 'Integration has no phone_number configured' }

  let messageSid: string
  let numSegments: number = 1

  try {
    const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const statusCallback = `${appUrl}/api/webhooks/twilio/status`

    const message = await getTwilioClient().messages.create({
      from:           fromNumber,
      to:             toNumber,
      body:           content,
      statusCallback,
    })

    messageSid  = message.sid
    numSegments = parseInt(String(message.numSegments ?? '1'), 10)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sms/send] Twilio error:', msg)
    return { error: `Failed to send SMS: ${msg}` }
  }

  await admin.from('messages').insert({
    workspace_id:        workspaceId,
    conversation_id:     conversationId,
    role:                'assistant',
    content,
    platform_message_id: messageSid,
  } as never)

  await admin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() } as never)
    .eq('id', conversationId)

  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'conversation',
    entity_id:    conversationId,
    event_type:   'sms_sent',
    payload:      { to: toNumber, from: fromNumber, sid: messageSid },
    user_id:      user.id,
  })

  await admin.from('sms_usage_log').insert({
    workspace_id:    workspaceId,
    integration_id:  conv.integration_id,
    conversation_id: conversationId,
    message_sid:     messageSid,
    direction:       'outbound',
    from_number:     fromNumber,
    to_number:       toNumber,
    segments:        numSegments,
    status:          'queued',
  } as never)

  console.info(`[sms/send] Twilio sent to ${toNumber} from ${fromNumber} — SID ${messageSid}`)
  return {}
}

/**
 * Confirm (or correct) an auto-suggested contact name.
 * Clears name_source so the name is treated as user-verified going forward.
 */
export async function confirmSmsContactName(
  contactId: string,
  name: string,
  conversationId?: string,
): Promise<{ error?: string }> {
  if (!name.trim()) return { error: 'Name cannot be empty' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_contacts')
    .update({ name: name.trim(), name_source: null } as never)
    .eq('id', contactId)

  if (error) return { error: error.message }

  // Also update the conversation title so the header reflects the confirmed name immediately
  if (conversationId) {
    await admin
      .from('conversations')
      .update({ title: name.trim() } as never)
      .eq('id', conversationId)
  }

  return {}
}

/**
 * Dismiss an auto-suggested name — keeps the phone number as the display name.
 */
export async function dismissSmsContactSuggestion(
  contactId: string,
  phone: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_contacts')
    .update({ name: phone, name_source: null } as never)
    .eq('id', contactId)

  if (error) return { error: error.message }
  return {}
}
