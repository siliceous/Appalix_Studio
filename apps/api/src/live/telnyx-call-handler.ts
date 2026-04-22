/**
 * Telnyx Call Handler — Phase 2 Voice Bridge
 *
 * Telnyx initiates a WebSocket TO our server at /telnyx/call-ws after
 * we call streaming_start. This handler:
 *   1. Receives inbound caller audio (L16 PCM 16 kHz) from Telnyx
 *   2. Forwards it to Gemini Live (audio/pcm;rate=16000)
 *   3. Receives Gemini's response audio (PCM 24 kHz)
 *   4. Downsamples 24 kHz → 16 kHz via linear interpolation
 *   5. Sends downsampled audio back to Telnyx (plays to caller)
 *   6. Updates call_sessions.transcript with speech-to-text turns
 *
 * Telnyx media-stream wire protocol:
 *   Telnyx → us  { event:"start",  start:{ call_control_id, media_format } }
 *   Telnyx → us  { event:"media",  media:{ track:"inbound", payload:<b64> } }
 *   Telnyx → us  { event:"stop" }
 *   us → Telnyx  { event:"media",  media:{ payload:<b64 L16 16 kHz> } }
 *   us → Telnyx  { event:"clear" }  ← clears Telnyx audio buffer on interrupt
 */

import { WebSocket }   from 'ws'
import type { IncomingMessage } from 'http'
import { supabase }    from '../lib/supabase.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'models/gemini-3.1-flash-live-preview'
const DEFAULT_VOICE = 'Aoede'

function geminiWsUrl(apiKey: string) {
  return (
    'wss://generativelanguage.googleapis.com' +
    '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent' +
    `?key=${apiKey}`
  )
}

// ── Audio resampling: 24 kHz PCM → 16 kHz PCM ────────────────────────────────
// Ratio 3:2 — linear interpolation between adjacent samples.

function resample24kTo16k(input: Buffer): Buffer {
  const inputSamples  = Math.floor(input.length / 2)
  if (inputSamples === 0) return Buffer.alloc(0)
  const outputSamples = Math.floor(inputSamples * 16000 / 24000)
  const output        = Buffer.alloc(outputSamples * 2)

  for (let i = 0; i < outputSamples; i++) {
    const pos  = i * 24000 / 16000          // position in 24 kHz stream
    const lo   = Math.floor(pos)
    const hi   = Math.min(lo + 1, inputSamples - 1)
    const frac = pos - lo

    const s0     = input.readInt16LE(lo * 2)
    const s1     = input.readInt16LE(hi * 2)
    const sample = Math.round(s0 + (s1 - s0) * frac)
    output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2)
  }

  return output
}

// ── Session data ──────────────────────────────────────────────────────────────

interface CallMeta {
  callSessionId: string
  workspaceId:   string
  fromE164:      string
  toE164:        string
  botName:       string
  systemPrompt:  string
  voiceName:     string
  transcript:    Array<{ role: string; text: string; ts: string }>
}

// ── WebSocket handler (called from index.ts upgrade handler) ──────────────────

export async function handleTelnyxCallWs(
  ws:   WebSocket,
  _req: IncomingMessage,
): Promise<void> {
  let meta:      CallMeta | null = null
  let geminiWs:  WebSocket | null = null
  let closed     = false
  let pendingText = ''   // accumulates Gemini text transcript for current turn

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[telnyx-call] GEMINI_API_KEY not set')
    ws.close(1011, 'Server misconfiguration')
    return
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sendToTelnyx(event: Record<string, unknown>) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event))
  }

  function sendAudioToTelnyx(base64Audio: string) {
    sendToTelnyx({ event: 'media', media: { payload: base64Audio } })
  }

  function clearTelnyxBuffer() {
    sendToTelnyx({ event: 'clear' })
  }

  async function flushTranscriptTurn(role: 'user' | 'assistant', text: string) {
    if (!text.trim() || !meta) return
    meta.transcript.push({ role, text: text.trim(), ts: new Date().toISOString() })
    // Non-blocking DB persist
    void supabase
      .from('call_sessions' as never)
      .update({ transcript: meta.transcript })
      .eq('id', meta.callSessionId)
  }

  // ── Resolve call session from DB once we have call_control_id ────────────

  async function initSession(callControlId: string) {
    const { data: session } = await supabase
      .from('call_sessions' as never)
      .select('id, workspace_id, voice_agent_id, from_e164, to_e164')
      .eq('telnyx_call_control_id', callControlId)
      .maybeSingle() as {
        data: {
          id:             string
          workspace_id:   string
          voice_agent_id: string | null
          from_e164:      string
          to_e164:        string
        } | null
      }

    if (!session) {
      console.warn('[telnyx-call] no session for call_control_id', callControlId)
      ws.close(1008, 'Unknown call')
      return false
    }

    // Look up voice agent + bot prompt
    let botName     = 'AI Assistant'
    let systemPrompt = ''
    let voiceName   = DEFAULT_VOICE

    if (session.voice_agent_id) {
      const { data: agent } = await supabase
        .from('voice_agents' as never)
        .select('name, config, bot_id')
        .eq('id', session.voice_agent_id)
        .maybeSingle() as {
          data: {
            name:   string
            config: Record<string, unknown> | null
            bot_id: string | null
          } | null
        }

      if (agent) {
        botName   = agent.name ?? 'AI Assistant'
        voiceName = (agent.config?.voice_name as string | undefined) ?? DEFAULT_VOICE

        if (agent.bot_id) {
          const { data: bot } = await supabase
            .from('bots')
            .select('name, prompt')
            .eq('id', agent.bot_id)
            .maybeSingle() as { data: { name: string; prompt: string | null } | null }

          if (bot) {
            botName      = bot.name ?? botName
            systemPrompt = bot.prompt ?? ''
          }
        }
      }
    }

    // Build system prompt with voice rules
    const fullPrompt =
      (systemPrompt.trim() || `You are ${botName}, a helpful phone assistant.`) +
      '\n\nVOICE RULES: This is a real-time phone call. ' +
      'Keep every response to 1–3 short sentences. ' +
      'Be conversational and natural — no lists, no markdown. ' +
      'Speak in plain, flowing sentences.' +
      '\n\nOPENING: Your very first spoken output must greet the caller naturally, ' +
      `e.g. "Hello, this is ${botName}, how can I help you today?"`

    meta = {
      callSessionId: session.id,
      workspaceId:   session.workspace_id,
      fromE164:      session.from_e164,
      toE164:        session.to_e164,
      botName,
      systemPrompt:  fullPrompt,
      voiceName,
      transcript:    [],
    }

    await supabase
      .from('call_sessions' as never)
      .update({ status: 'streaming' })
      .eq('id', session.id)

    console.info(`[telnyx-call] session ready — agent="${botName}" voice=${voiceName}`)
    return true
  }

  // ── Open Gemini Live WebSocket ────────────────────────────────────────────

  function openGemini() {
    if (!meta) return
    geminiWs = new WebSocket(geminiWsUrl(apiKey!))

    geminiWs.on('open', () => {
      console.log(`[telnyx-call] gemini open — session=${meta!.callSessionId}`)
      geminiWs!.send(JSON.stringify({
        setup: {
          model: GEMINI_MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: meta!.voiceName },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: meta!.systemPrompt }],
          },
        },
      }))
    })

    geminiWs.on('message', (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(
          typeof raw === 'string' ? raw : raw.toString(),
        ) as Record<string, unknown>

        // Setup complete — trigger opening greeting
        if ('setupComplete' in msg) {
          geminiWs!.send(JSON.stringify({ realtimeInput: { text: '.' } }))
          return
        }

        const sc = msg.serverContent as {
          modelTurn?: {
            parts?: Array<{
              text?:       string
              inlineData?: { mimeType: string; data: string }
            }>
          }
          turnComplete?: boolean
          interrupted?:  boolean
        } | undefined

        if (sc?.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              // Downsample Gemini's 24 kHz output → 16 kHz for Telnyx
              const raw24  = Buffer.from(part.inlineData.data, 'base64')
              const raw16  = resample24kTo16k(raw24)
              sendAudioToTelnyx(raw16.toString('base64'))
            }
            if (part.text) {
              pendingText += part.text
            }
          }
        }

        if (sc?.turnComplete) {
          void flushTranscriptTurn('assistant', pendingText)
          pendingText = ''
        }

        if (sc?.interrupted) {
          clearTelnyxBuffer()
          void flushTranscriptTurn('assistant', pendingText)
          pendingText = ''
        }
      } catch {
        // Ignore malformed Gemini frames
      }
    })

    geminiWs.on('error', (err) => {
      console.error('[telnyx-call] gemini error:', err)
    })

    geminiWs.on('close', (code, reason) => {
      const r = Buffer.isBuffer(reason) ? reason.toString() : String(reason ?? '')
      console.warn(`[telnyx-call] gemini closed code=${code} reason="${r}"`)
      if (!closed) cleanup()
    })
  }

  // ── Handle Telnyx → us messages ───────────────────────────────────────────

  ws.on('message', async (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>
      const event = msg.event as string

      if (event === 'start') {
        const startPayload = msg.start as { call_control_id: string }
        const callControlId = startPayload?.call_control_id ?? (msg.call_control_id as string)
        if (!callControlId) { console.warn('[telnyx-call] start event missing call_control_id'); return }

        const ok = await initSession(callControlId)
        if (ok) openGemini()
        return
      }

      if (event === 'media') {
        const media = msg.media as { track: string; payload: string } | undefined
        // Only forward inbound (caller) audio to Gemini
        if (media?.track === 'inbound' && media.payload && geminiWs?.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({
            realtimeInput: {
              audio: { data: media.payload, mimeType: 'audio/pcm;rate=16000' },
            },
          }))
        }
        return
      }

      if (event === 'stop') {
        console.info('[telnyx-call] Telnyx stream stop received')
        cleanup()
      }
    } catch {
      // Ignore malformed frames
    }
  })

  ws.on('close', () => {
    if (!closed) cleanup()
  })

  ws.on('error', (err) => {
    console.error('[telnyx-call] telnyx ws error:', err)
    if (!closed) cleanup()
  })

  // ── Cleanup ───────────────────────────────────────────────────────────────

  function cleanup() {
    closed = true
    try { geminiWs?.close() } catch {}

    if (meta?.callSessionId && meta.transcript.length > 0) {
      void supabase
        .from('call_sessions' as never)
        .update({ transcript: meta.transcript })
        .eq('id', meta.callSessionId)
    }
  }
}
