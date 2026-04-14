/**
 * Widget Voice Handler
 *
 * Bridges the customer-facing chat widget ↔ Gemini Live via raw WebSocket.
 * Uses the Gemini BidiGenerateContent wire protocol directly so we aren't
 * constrained by whichever model the SDK bundle hardcodes.
 *
 * Protocol (widget ↔ this server):
 *   Client → { type: "audio", data: "<base64 PCM 16kHz mono>" }
 *   Client → { type: "text",  content: "..." }
 *   Server → { type: "audio", data: "<base64>", mimeType: "audio/pcm;rate=24000" }
 *   Server → { type: "text",  content: "..." }
 *   Server → { type: "ready" }
 *   Server → { type: "turn_complete" }
 *   Server → { type: "interrupted" }
 *   Server → { type: "error", message: "..." }
 */

import { randomUUID } from 'crypto'
import { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'

// ── Model & endpoint ────────────────────────────────────────────────────────

const GEMINI_MODEL = 'models/gemini-3.1-flash-live-preview'

function geminiWsUrl(apiKey: string) {
  return (
    'wss://generativelanguage.googleapis.com' +
    '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent' +
    `?key=${apiKey}`
  )
}

// ── In-memory session store ─────────────────────────────────────────────────

interface WidgetVoiceSession {
  integrationId: string
  botName:       string
  systemPrompt:  string
  voiceName:     string
  createdAt:     Date
}

const sessions = new Map<string, WidgetVoiceSession>()

// Purge sessions older than 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000
  for (const [id, meta] of sessions) {
    if (meta.createdAt.getTime() < cutoff) sessions.delete(id)
  }
}, 60_000)

export function createWidgetVoiceSession(
  meta: Omit<WidgetVoiceSession, 'createdAt'>,
): string {
  const id = `wv_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  sessions.set(id, { ...meta, createdAt: new Date() })
  return id
}

// ── WebSocket handler ───────────────────────────────────────────────────────

export async function handleWidgetVoiceWs(
  ws: WebSocket,
  req: IncomingMessage,
): Promise<void> {
  const url       = new URL(req.url ?? '/', 'http://localhost')
  const sessionId = url.searchParams.get('session')

  function send(data: unknown) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data))
  }

  if (!sessionId || !sessions.has(sessionId)) {
    send({ type: 'error', message: 'Invalid or expired session' })
    ws.close(1008, 'Unauthorised')
    return
  }

  const meta = sessions.get(sessionId)!
  sessions.delete(sessionId)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    send({ type: 'error', message: 'Voice AI not configured on this server.' })
    ws.close(1011, 'Server error')
    return
  }

  // Build system prompt
  const systemPrompt =
    (meta.systemPrompt?.trim()
      ? meta.systemPrompt.trim() + '\n\n'
      : `You are ${meta.botName}, a helpful assistant.\n\n`) +
    `VOICE RULES: This is a real-time voice conversation. Keep every response to ` +
    `1–2 short sentences. Be conversational and natural. Do not use lists, markdown, ` +
    `or any formatting — speak in plain, flowing sentences.`

  let closed    = false
  let geminiWs: WebSocket | null = null

  // ── Open raw WebSocket to Gemini ──────────────────────────────────────────

  try {
    geminiWs = new WebSocket(geminiWsUrl(apiKey))
  } catch (err) {
    console.error('[widget-voice] failed to create gemini ws:', err)
    send({ type: 'error', message: 'Failed to start voice session.' })
    ws.close(1011, 'Upstream error')
    return
  }

  geminiWs.on('open', () => {
    // First message must be BidiGenerateContentSetup
    geminiWs!.send(JSON.stringify({
      setup: {
        model: GEMINI_MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: meta.voiceName || 'Aoede' },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
    }))
  })

  geminiWs.on('message', (raw: Buffer | string) => {
    try {
      const msg = JSON.parse(
        typeof raw === 'string' ? raw : raw.toString(),
      ) as Record<string, unknown>

      // Gemini signals setup is done
      if ('setupComplete' in msg) {
        send({ type: 'ready' })
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
          if (part.inlineData) {
            send({ type: 'audio', data: part.inlineData.data, mimeType: part.inlineData.mimeType })
          }
          if (part.text) {
            send({ type: 'text', content: part.text })
          }
        }
      }

      if (sc?.turnComplete) send({ type: 'turn_complete' })
      if (sc?.interrupted)  send({ type: 'interrupted' })
    } catch {
      // Ignore malformed frames
    }
  })

  geminiWs.on('error', (err) => {
    console.error('[widget-voice] gemini ws error:', err)
    if (!closed) {
      closed = true
      send({ type: 'error', message: 'Voice session error — please try again.' })
      if (ws.readyState === WebSocket.OPEN) ws.close(1011, 'Gemini error')
    }
  })

  geminiWs.on('close', (code, reason) => {
    const r = Buffer.isBuffer(reason) ? reason.toString() : String(reason ?? '')
    console.warn(`[widget-voice] gemini closed — code=${code} reason="${r}"`)
    if (!closed) {
      closed = true
      send({ type: 'error', message: r || 'Voice session ended — please reconnect.' })
      if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Session ended')
    }
  })

  // ── Forward client → Gemini ───────────────────────────────────────────────

  ws.on('message', (data: Buffer) => {
    if (!geminiWs || closed || geminiWs.readyState !== WebSocket.OPEN) return
    try {
      const msg = JSON.parse(data.toString()) as {
        type: string; data?: string; content?: string
      }

      if (msg.type === 'audio' && msg.data) {
        geminiWs.send(JSON.stringify({
          realtimeInput: {
            audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
          },
        }))
      } else if (msg.type === 'text' && msg.content) {
        // 3.1 model: use realtimeInput for text during conversation
        geminiWs.send(JSON.stringify({
          realtimeInput: { text: msg.content },
        }))
      }
    } catch {
      // Ignore malformed frames
    }
  })

  ws.on('close', () => {
    closed = true
    try { geminiWs?.close() } catch {}
  })

  ws.on('error', (err) => {
    console.error('[widget-voice] client ws error:', err)
    closed = true
    try { geminiWs?.close() } catch {}
  })
}
