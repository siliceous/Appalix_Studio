import { supabase } from '../lib/supabase.js'

const TELNYX_API = 'https://api.telnyx.com/v2'

function headers() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

// ── Send ─────────────────────────────────────────────────────────────────────

export async function sendSms(params: {
  from:               string   // E.164 Telnyx number
  to:                 string   // E.164 recipient
  body:               string
  messagingProfileId?: string
}): Promise<{ messageId: string; segments: number } | { error: string }> {
  const payload: Record<string, string> = {
    from: params.from,
    to:   params.to,
    text: params.body,
  }
  if (params.messagingProfileId) payload.messaging_profile_id = params.messagingProfileId

  const res  = await fetch(`${TELNYX_API}/messages`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(payload),
  })
  const data = await res.json() as {
    data?:   { id: string; parts: number }
    errors?: Array<{ title: string; detail: string }>
  }

  if (!res.ok || !data.data?.id) {
    const msg = data.errors?.[0]?.detail ?? `Telnyx error ${res.status}`
    console.error('[telnyx-messaging] sendSms:', msg)
    return { error: msg }
  }

  return { messageId: data.data.id, segments: data.data.parts ?? 1 }
}

// ── Workspace routing ─────────────────────────────────────────────────────────
// Look up which workspace owns a given Telnyx number.

export async function resolveWorkspaceByNumber(e164: string): Promise<{
  workspaceId:        string
  phoneNumberId:      string
  messagingProfileId: string | null
  botId:              string | null
} | null> {
  const { data } = await supabase
    .from('workspace_phone_numbers' as never)
    .select('id, workspace_id, messaging_profile_id, bot_id')
    .eq('e164', e164)
    .is('released_at', null)
    .maybeSingle() as { data: {
      id: string
      workspace_id: string
      messaging_profile_id: string | null
      bot_id: string | null
    } | null }

  if (!data) return null
  return {
    workspaceId:        data.workspace_id,
    phoneNumberId:      data.id,
    messagingProfileId: data.messaging_profile_id,
    botId:              data.bot_id,
  }
}

// ── Contact ───────────────────────────────────────────────────────────────────

export async function findOrCreateContact(
  workspaceId: string,
  phoneE164:   string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('phone', phoneE164)
    .maybeSingle()

  if (existing) return existing.id as string

  const { data: created } = await supabase
    .from('sage_contacts')
    .insert({
      workspace_id: workspaceId,
      phone:        phoneE164,
      source:       'chat',
      name_source:  'sms_auto',
    })
    .select('id')
    .single()

  return (created?.id as string) ?? null
}

// ── Conversation thread ───────────────────────────────────────────────────────
// Thread key = sender E.164 so all messages with the same contact share one thread.

export async function findOrCreateConversation(params: {
  workspaceId:  string
  fromE164:     string   // caller / sender — becomes the thread key
  toE164:       string   // our Telnyx number
  contactId:    string | null
}): Promise<string | null> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('platform', 'sms')
    .eq('platform_thread_id', params.fromE164)
    .maybeSingle()

  if (existing) {
    // Touch last_activity_at so the thread floats to the top
    await supabase
      .from('conversations')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', existing.id as string)
    return existing.id as string
  }

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      workspace_id:       params.workspaceId,
      platform:           'sms',
      platform_thread_id: params.fromE164,
      platform_user_id:   params.fromE164,
      status:             'active',
      last_activity_at:   new Date().toISOString(),
    })
    .select('id')
    .single()

  return (created?.id as string) ?? null
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function insertInboundMessage(params: {
  workspaceId:     string
  conversationId:  string
  telnyxMessageId: string
  body:            string
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      workspace_id:        params.workspaceId,
      conversation_id:     params.conversationId,
      role:                'user',
      content:             params.body,
      platform_message_id: params.telnyxMessageId,
    })
    .select('id')
    .single()

  if (error) console.error('[telnyx-messaging] insertInboundMessage:', error.message)
  return (data?.id as string) ?? null
}

export async function insertOutboundMessage(params: {
  workspaceId:     string
  conversationId:  string
  telnyxMessageId: string
  body:            string
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      workspace_id:        params.workspaceId,
      conversation_id:     params.conversationId,
      role:                'assistant',
      content:             params.body,
      platform_message_id: params.telnyxMessageId,
    })
    .select('id')
    .single()

  if (error) console.error('[telnyx-messaging] insertOutboundMessage:', error.message)
  return (data?.id as string) ?? null
}

// ── Opt-out keyword handling ──────────────────────────────────────────────────
// Carrier-mandated STOP/START/HELP handling (TCPA / ACMA compliance).

const STOP_WORDS  = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
const START_WORDS = new Set(['START', 'YES', 'UNSTOP'])

export async function handleOptOutKeyword(
  workspaceId: string,
  contactId:   string | null,
  body:        string,
): Promise<'opted_out' | 'opted_in' | null> {
  if (!contactId) return null

  const word = body.trim().toUpperCase()

  if (STOP_WORDS.has(word)) {
    await supabase
      .from('sage_contacts')
      .update({ sms_opt_out: true, sms_opted_out_at: new Date().toISOString() })
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
    return 'opted_out'
  }

  if (START_WORDS.has(word)) {
    await supabase
      .from('sage_contacts')
      .update({ sms_opt_out: false, sms_opted_out_at: null })
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
    return 'opted_in'
  }

  return null
}

// Check if a contact is opted out before sending
export async function isOptedOut(workspaceId: string, toE164: string): Promise<boolean> {
  const { data } = await supabase
    .from('sage_contacts')
    .select('sms_opt_out')
    .eq('workspace_id', workspaceId)
    .eq('phone', toE164)
    .maybeSingle()

  return (data as { sms_opt_out: boolean } | null)?.sms_opt_out === true
}
