/**
 * Outbound Call Service
 * Manages outbound AI agent calls via Telnyx
 */

import { supabase } from '../lib/supabase.js'

const TELNYX_API = 'https://api.telnyx.com/v2'

interface OutboundCallOptions {
  toPhoneNumber: string
  voiceAgentId: string
  workspaceId: string
  contactId?: string
  contactData?: Record<string, unknown>
  customContext?: Record<string, unknown>
  campaignId?: string
}

interface TelnyxOutboundCallPayload {
  to: string
  from: string
  connection_id: string
  custom_headers?: Array<{
    name: string
    value: string
  }>
  webhook_url?: string
  webhook_failover_url?: string
}

/**
 * Initiate a single outbound call
 */
export async function initiateOutboundCall(
  options: OutboundCallOptions,
): Promise<{
  callSessionId: string
  callControlId: string
  toPhoneNumber: string
} | null> {
  const { toPhoneNumber, voiceAgentId, workspaceId, contactId, contactData, customContext, campaignId } = options

  try {
    // Get voice agent details
    const { data: agent } = await supabase
      .from('voice_agents' as never)
      .select('id, name, phone_number, config, bot_id, is_active')
      .eq('id', voiceAgentId)
      .eq('workspace_id', workspaceId)
      .maybeSingle() as {
        data: {
          id: string
          name: string
          phone_number: string | null
          config: Record<string, unknown> | null
          bot_id: string | null
          is_active: boolean
        } | null
        error: unknown
      }

    if (!agent || !agent.is_active) {
      console.error('[outbound-calls] agent not found or inactive:', voiceAgentId)
      return null
    }

    // Get workspace phone number (from_number)
    const { data: workspace } = await supabase
      .from('workspaces' as never)
      .select('id')
      .eq('id', workspaceId)
      .maybeSingle()

    if (!workspace) {
      console.error('[outbound-calls] workspace not found:', workspaceId)
      return null
    }

    // Find an available phone number for this agent/workspace
    const { data: phoneNumbers } = await supabase
      .from('workspace_phone_numbers' as never)
      .select('phone_number, telnyx_connection_id')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle() as {
        data: {
          phone_number: string
          telnyx_connection_id: string
        } | null
        error: unknown
      }

    if (!phoneNumbers) {
      console.error('[outbound-calls] no phone numbers available for workspace:', workspaceId)
      return null
    }

    // Create call_session record first (direction='outbound')
    const { data: callSession, error: sessionErr } = await supabase
      .from('call_sessions' as never)
      .insert({
        workspace_id: workspaceId,
        voice_agent_id: voiceAgentId,
        from_e164: phoneNumbers.phone_number,
        to_e164: toPhoneNumber,
        direction: 'outbound',
        status: 'initiated',
      })
      .select('id')
      .single() as {
        data: {
          id: string
        } | null
        error: unknown
      }

    if (sessionErr || !callSession) {
      const errMsg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr)
      console.error('[outbound-calls] insert call_sessions failed:', errMsg)
      return null
    }

    // Create outbound_call_record to track this call
    const { error: recordErr } = await supabase
      .from('outbound_call_records' as never)
      .insert({
        workspace_id: workspaceId,
        campaign_id: campaignId || null,
        call_session_id: callSession.id,
        contact_id: contactId || null,
        to_phone_number: toPhoneNumber,
        status: 'initiated',
        contact_data: contactData || null,
        custom_context: customContext || null,
        initiated_at: new Date().toISOString(),
      })

    if (recordErr) {
      console.error('[outbound-calls] insert outbound_call_records failed:', recordErr.message)
    }

    // Make the actual Telnyx API call
    const apiKey = process.env.TELNYX_API_KEY
    if (!apiKey) {
      console.error('[outbound-calls] TELNYX_API_KEY not set')
      return null
    }

    const telnyxPayload: TelnyxOutboundCallPayload = {
      to: toPhoneNumber,
      from: phoneNumbers.phone_number,
      connection_id: phoneNumbers.telnyx_connection_id,
      webhook_url: `${process.env.PUBLIC_API_URL || 'https://appalix-api.onrender.com'}/telnyx/voice`,
    }

    const res = await fetch(`${TELNYX_API}/calls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telnyxPayload),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      console.error('[outbound-calls] Telnyx API error:', error)

      // Mark call as failed
      await supabase
        .from('call_sessions' as never)
        .update({ status: 'failed' })
        .eq('id', callSession.id)

      return null
    }

    const telnyxResponse = (await res.json()) as {
      data?: {
        call_control_id: string
      }
    }

    const callControlId = telnyxResponse.data?.call_control_id
    if (!callControlId) {
      console.error('[outbound-calls] no call_control_id in Telnyx response')
      return null
    }

    if (!callSession?.id) {
      console.error('[outbound-calls] call session not created')
      return null
    }

    // Update call_session with Telnyx call_control_id
    await supabase
      .from('call_sessions' as never)
      .update({
        telnyx_call_control_id: callControlId,
        status: 'initiated',
      })
      .eq('id', callSession.id)

    console.info(`[outbound-calls] call initiated — session=${callSession.id} control=${callControlId} to=${toPhoneNumber}`)

    return {
      callSessionId: callSession.id,
      callControlId,
      toPhoneNumber,
    }
  } catch (err) {
    console.error('[outbound-calls] initiateOutboundCall error:', err)
    return null
  }
}

/**
 * Get call context to inject into Gemini system prompt
 * This enriches the agent's knowledge about the contact
 */
export function buildCallContext(
  agentName: string,
  botPrompt: string | null,
  contactData?: Record<string, unknown>,
  customContext?: Record<string, unknown>,
): string {
  const parts: string[] = []

  // Base system prompt
  if (botPrompt?.trim()) {
    parts.push(botPrompt.trim())
  } else {
    parts.push(`You are ${agentName}, a helpful AI agent.`)
  }

  // Voice rules (same as inbound)
  parts.push(
    '\n\nVOICE RULES: This is a real-time phone call. ' +
    'Keep every response to 1–3 short sentences. ' +
    'Be conversational and natural — no lists, no markdown. ' +
    'Speak in plain, flowing sentences.'
  )

  // Contact context
  if (contactData && Object.keys(contactData).length > 0) {
    const contactInfo = Object.entries(contactData)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    if (contactInfo) {
      parts.push(`\n\nCONTACT INFO: You are calling ${contactInfo}.`)
    }
  }

  // Custom campaign context
  if (customContext && Object.keys(customContext).length > 0) {
    const contextStr = Object.entries(customContext)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    if (contextStr) {
      parts.push(`\n\nCAMPAIGN CONTEXT: ${contextStr}`)
    }
  }

  // Opening instruction for outbound calls
  parts.push(
    `\n\nOPENING: When the callee answers, greet them naturally and introduce yourself briefly. ` +
    `For example: "Hi, this is ${agentName}. Is this a good time to chat?"`
  )

  return parts.join('')
}
