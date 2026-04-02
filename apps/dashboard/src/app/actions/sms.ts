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

/**
 * Send an outbound SMS reply from the conversations view.
 * Called by the conversation reply box when platform === 'sms'.
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
    .select('id, platform, platform_thread_id, integration_id, contact_id')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .eq('platform', 'sms')
    .single()

  if (!convRaw) return { error: 'Conversation not found or is not an SMS thread' }

  const conv = convRaw as {
    id: string
    platform: string
    platform_thread_id: string  // E.164 recipient number
    integration_id: string | null
    contact_id: string | null
  }

  const toNumber = conv.platform_thread_id
  if (!toNumber) return { error: 'No recipient phone number on this conversation' }

  // ── Load integration to get the sending number ────────────────────────────
  if (!conv.integration_id) return { error: 'No integration linked to this SMS conversation' }

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

  // ── Check opt-out before sending ──────────────────────────────────────────
  if (conv.contact_id) {
    const { data: contactRaw } = await admin
      .from('sage_contacts')
      .select('sms_opt_out')
      .eq('id', conv.contact_id)
      .single()

    const contact = contactRaw as { sms_opt_out: boolean } | null
    if (contact?.sms_opt_out) {
      return { error: 'This contact has opted out of SMS messages (STOP)' }
    }
  }

  // ── Send via Twilio REST ───────────────────────────────────────────────────
  let messageSid: string
  let numSegments: number = 1

  try {
    const appUrl        = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const statusCallback = `${appUrl}/api/webhooks/twilio/status`

    const message = await getTwilioClient().messages.create({
      from:           fromNumber,
      to:             toNumber,
      body:           content,
      statusCallback,
    })

    messageSid   = message.sid
    numSegments  = parseInt(String(message.numSegments ?? '1'), 10)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sms/send] Twilio error:', msg)
    return { error: `Failed to send SMS: ${msg}` }
  }

  // ── Save message to DB ────────────────────────────────────────────────────
  await admin.from('messages').insert({
    conversation_id:     conversationId,
    role:                'assistant',
    content,
    platform_message_id: messageSid,
    metadata:            { delivery_status: 'queued' },
  } as never)

  // Touch conversation updated_at
  await admin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() } as never)
    .eq('id', conversationId)

  // ── Activity log ─────────────────────────────────────────────────────────
  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'conversation',
    entity_id:    conversationId,
    event_type:   'sms_sent',
    payload:      { to: toNumber, from: fromNumber, sid: messageSid },
    user_id:      user.id,
  })

  // ── Usage log ─────────────────────────────────────────────────────────────
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

  console.info(`[sms/send] Sent to ${toNumber} from ${fromNumber} — SID ${messageSid}`)
  return {}
}
