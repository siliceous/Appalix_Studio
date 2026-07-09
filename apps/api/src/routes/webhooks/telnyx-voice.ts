import type { FastifyInstance } from 'fastify'
import { supabase }             from '../../lib/supabase.js'
import {
  resolveWorkspaceByNumber,
  findOrCreateConversation,
  findOrCreateContact,
} from '../../services/telnyx-messaging.service.js'
import { recordVoiceCall } from '../../services/usage-ledger.service.js'

const TELNYX_API = 'https://api.telnyx.com/v2'

// ── Telnyx Call Control helpers ───────────────────────────────────────────────

async function callControlAction(
  callControlId: string,
  action:        string,
  payload:       Record<string, unknown> = {},
) {
  const key = process.env.TELNYX_API_KEY
  if (!key) { console.error('[telnyx-voice] TELNYX_API_KEY not set'); return }
  const res = await fetch(
    `${TELNYX_API}/calls/${encodeURIComponent(callControlId)}/actions/${action}`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    },
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error(`[telnyx-voice] ${action} failed:`, data)
  }
  return res
}

// ── Payload types ─────────────────────────────────────────────────────────────

interface TelnyxCallPayload {
  call_control_id:  string
  call_leg_id:      string
  call_session_id?: string
  from:             string
  to:               string
  direction:        string
  hangup_cause?:    string
  connection_id?:   string
}

interface TelnyxVoiceWebhook {
  data: {
    event_type: string
    id:         string
    payload:    TelnyxCallPayload
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function telnyxVoiceRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: TelnyxVoiceWebhook }>(
    '/telnyx/voice',
    async (req, reply) => {
      // Ack immediately so Telnyx doesn't retry
      reply.code(200).send({ ok: true })

      const body      = req.body
      const eventType = body?.data?.event_type
      const payload   = body?.data?.payload

      if (!payload?.call_control_id) return

      setImmediate(() => void processCallEvent(eventType, payload))
    },
  )
}

// ── Event processing ──────────────────────────────────────────────────────────

async function processCallEvent(
  eventType: string,
  payload:   TelnyxCallPayload,
) {
  try {
    switch (eventType) {
      case 'call.initiated':
        if (payload.direction === 'incoming') await handleInboundInitiated(payload)
        break
      case 'call.answered':
        await handleAnswered(payload)
        break
      case 'call.hangup':
        await handleHangup(payload)
        break
      default:
        break
    }
  } catch (err) {
    console.error('[telnyx-voice] processCallEvent error:', err)
  }
}

async function handleInboundInitiated(payload: TelnyxCallPayload) {
  const { call_control_id, from, to, connection_id } = payload

  // Resolve workspace from our Telnyx number
  const ws = await resolveWorkspaceByNumber(to)
  if (!ws) {
    console.warn('[telnyx-voice] no workspace for number', to, '— rejecting')
    await callControlAction(call_control_id, 'reject', { cause: 'USER_BUSY' })
    return
  }

  // Find active voice agent for this workspace/number (number-specific first, then any)
  const { data: agentRaw } = await supabase
    .from('voice_agents' as never)
    .select('id, name, config, bot_id')
    .eq('workspace_id', ws.workspaceId)
    .eq('is_active', true)
    .or(`phone_number.eq.${to},phone_number.is.null`)
    .order('phone_number', { nullsFirst: false, ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string; name: string; config: Record<string, unknown>; bot_id: string | null } | null }

  // Insert call session
  const { error: insertErr } = await supabase
    .from('call_sessions' as never)
    .insert({
      workspace_id:           ws.workspaceId,
      phone_number_id:        ws.phoneNumberId,
      voice_agent_id:         agentRaw?.id ?? null,
      telnyx_call_control_id: call_control_id,
      telnyx_connection_id:   connection_id ?? null,
      from_e164:              from,
      to_e164:                to,
      direction:              'inbound',
      status:                 'initiated',
    })

  if (insertErr) {
    console.error('[telnyx-voice] insert call_sessions:', insertErr.message)
  }

  // Answer the call
  await callControlAction(call_control_id, 'answer')
  console.info(`[telnyx-voice] answered call from ${from} → workspace ${ws.workspaceId}`)
}

async function handleAnswered(payload: TelnyxCallPayload) {
  const { call_control_id } = payload

  // Derive public WSS URL for Telnyx to connect to
  const publicApiUrl = process.env.PUBLIC_API_URL ?? 'https://appalix-api.onrender.com'
  const streamWsUrl  = publicApiUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://') + '/telnyx/call-ws'

  const now = new Date().toISOString()
  await supabase
    .from('call_sessions' as never)
    .update({ status: 'answered', answered_at: now })
    .eq('telnyx_call_control_id', call_control_id)

  // Also update outbound_call_records if this is an outbound call
  const { data: session } = await supabase
    .from('call_sessions' as never)
    .select('id, direction')
    .eq('telnyx_call_control_id', call_control_id)
    .maybeSingle() as {
      data: {
        id: string
        direction: 'inbound' | 'outbound'
      } | null
    }

  if (session?.direction === 'outbound') {
    await supabase
      .from('outbound_call_records' as never)
      .update({ status: 'answered', answered: true, answered_at: now })
      .eq('call_session_id', session.id)
  }

  // Start one-way media stream — inbound = what the caller says
  await callControlAction(call_control_id, 'streaming_start', {
    stream_url:   streamWsUrl,
    stream_track: 'inbound_track',
  })

  console.info(`[telnyx-voice] streaming_start → ${streamWsUrl}`)
}

async function handleHangup(payload: TelnyxCallPayload) {
  const { call_control_id, hangup_cause } = payload

  const { data: session } = await supabase
    .from('call_sessions' as never)
    .select('id, workspace_id, from_e164, to_e164, answered_at, direction, voice_agent_id, transcript')
    .eq('telnyx_call_control_id', call_control_id)
    .maybeSingle() as {
      data: {
        id:             string
        workspace_id:   string
        from_e164:      string
        to_e164:        string
        answered_at:    string | null
        direction:      'inbound' | 'outbound'
        voice_agent_id: string | null
        transcript:     Array<{ role: string; text: string; ts: string }>
      } | null
    }

  if (!session) return

  const endedAt  = new Date()
  const duration = session.answered_at
    ? Math.round((endedAt.getTime() - new Date(session.answered_at).getTime()) / 1000)
    : null

  await supabase
    .from('call_sessions' as never)
    .update({
      status:           'ended',
      ended_at:         endedAt.toISOString(),
      hangup_cause:     hangup_cause ?? null,
      ...(duration != null ? { duration_seconds: duration } : {}),
    })
    .eq('id', session.id)

  console.info(`[telnyx-voice] call ended — duration=${duration}s cause=${hangup_cause}`)

  // ── Update outbound_call_records if this is an outbound call ────────────────
  if (session.direction === 'outbound') {
    await supabase
      .from('outbound_call_records' as never)
      .update({
        status: 'completed',
        duration_seconds: duration || 0,
        hangup_cause: hangup_cause || null,
        completed_at: endedAt.toISOString(),
      })
      .eq('call_session_id', session.id)
  }

  // ── Wallet billing ────────────────────────────────────────────────────────
  if (duration && duration > 0 && session.workspace_id) {
    void recordVoiceCall({
      workspaceId:     session.workspace_id,
      callSessionId:   session.id,
      durationSeconds: duration,
      direction:       session.direction ?? 'inbound',
      isAiCall:        !!session.voice_agent_id,
      occurredAt:      endedAt,
    }).catch(err => console.error('[telnyx-voice] recordVoiceCall failed:', err))
  }

  // ── Post-call: surface transcript in conversations inbox ─────────────────
  if (session.workspace_id && session.from_e164) {
    try {
      const contactId = await findOrCreateContact(session.workspace_id, session.from_e164)

      const conversationId = await findOrCreateConversation({
        workspaceId: session.workspace_id,
        fromE164:    session.from_e164,
        toE164:      session.to_e164,
        contactId,
        platform:    'phone',
      })

      if (conversationId) {
        // Insert each transcript turn as a message
        const turns = session.transcript ?? []
        for (const turn of turns) {
          if (!turn.text?.trim()) continue
          await supabase.from('messages').insert({
            workspace_id:    session.workspace_id,
            conversation_id: conversationId,
            role:            turn.role === 'user' ? 'user' : 'assistant',
            content:         turn.text.trim(),
          })
        }

        // Link session to conversation
        await supabase
          .from('call_sessions' as never)
          .update({ conversation_id: conversationId })
          .eq('id', session.id)
      }
    } catch (err) {
      console.error('[telnyx-voice] post-call conversation link failed:', err)
    }
  }
}
