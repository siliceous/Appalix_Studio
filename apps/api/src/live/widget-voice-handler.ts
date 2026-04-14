/**
 * Widget Voice Handler
 *
 * Bridges the customer-facing chat widget ↔ Gemini Live.
 * Simpler than session-manager.ts — no Sage tools, just the bot's system prompt.
 *
 * Protocol (same as Sage Live):
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
import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'

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

// ── Gemini session interface (minimal) ──────────────────────────────────────

interface GeminiSession {
  sendRealtimeInput(input: { audio: { data: string; mimeType: string } }): void
  sendClientContent(input: { turns: unknown[]; turnComplete: boolean }): void
  close(): void
}

// ── WebSocket handler ───────────────────────────────────────────────────────

export async function handleWidgetVoiceWs(
  ws: WebSocket,
  req: IncomingMessage,
): Promise<void> {
  const url       = new URL(req.url ?? '/', 'http://localhost')
  const sessionId = url.searchParams.get('session')

  function send(data: unknown) {
    if (ws.readyState === (ws as unknown as { OPEN: number }).OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  if (!sessionId || !sessions.has(sessionId)) {
    send({ type: 'error', message: 'Invalid or expired session' })
    ws.close(1008, 'Unauthorised')
    return
  }

  // Consume the one-time token immediately
  const meta = sessions.get(sessionId)!
  sessions.delete(sessionId)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    send({ type: 'error', message: 'Voice AI not configured on this server.' })
    ws.close(1011, 'Server error')
    return
  }

  // Build system prompt: bot's own prompt + voice brevity rule
  const systemPrompt =
    (meta.systemPrompt?.trim()
      ? meta.systemPrompt.trim() + '\n\n'
      : `You are ${meta.botName}, a helpful assistant.\n\n`) +
    `VOICE RULES: This is a real-time voice conversation. Keep every response to ` +
    `1–2 short sentences. Be conversational and natural. Do not use lists, markdown, ` +
    `or any formatting — speak in plain, flowing sentences.`

  let gemini: GeminiSession | null = null
  let closed = false

  try {
    const genaiModule  = await import('@google/genai')
    const GoogleGenAI  = genaiModule.GoogleGenAI
    const ai           = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gemini = await (ai.live as any).connect({
      model:  'gemini-2.0-flash-live-preview-04-09',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: meta.voiceName || 'Aoede' } },
        },
        systemInstruction: { parts: [{ text: systemPrompt }] },
      },
      callbacks: {
        onopen() {
          send({ type: 'ready' })
        },

        async onmessage(message: Record<string, unknown>) {
          const serverContent = message.serverContent as {
            modelTurn?: {
              parts?: Array<{
                text?:       string
                inlineData?: { mimeType: string; data: string }
              }>
            }
            turnComplete?: boolean
            interrupted?:  boolean
          } | undefined

          if (serverContent?.modelTurn?.parts) {
            for (const part of serverContent.modelTurn.parts) {
              if (part.inlineData) {
                send({ type: 'audio', data: part.inlineData.data, mimeType: part.inlineData.mimeType })
              }
              if (part.text) {
                send({ type: 'text', content: part.text })
              }
            }
          }

          if (serverContent?.turnComplete) send({ type: 'turn_complete' })
          if (serverContent?.interrupted)  send({ type: 'interrupted' })
        },

        onerror(err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[widget-voice] onerror:', msg)
          if (!closed) {
            closed = true
            send({ type: 'error', message: 'Voice session error — please try again.' })
            if (ws.readyState === (ws as unknown as { OPEN: number }).OPEN) ws.close(1011, 'Gemini error')
          }
        },

        onclose(evt: unknown) {
          const e      = evt as { code?: number; reason?: Buffer | string } | undefined
          const reason = Buffer.isBuffer(e?.reason) ? e.reason.toString() : String(e?.reason ?? '')
          console.warn(`[widget-voice] onclose — code=${e?.code} reason="${reason}"`)
          if (!closed) {
            closed = true
            send({ type: 'error', message: reason || 'Voice session ended — please reconnect.' })
            if (ws.readyState === (ws as unknown as { OPEN: number }).OPEN) ws.close(1000, 'Session ended')
          }
        },
      },
    })

  } catch (err) {
    console.error('[widget-voice] connect failed:', err)
    send({ type: 'error', message: 'Failed to start voice session. Check GEMINI_API_KEY.' })
    ws.close(1011, 'Upstream error')
    return
  }

  // ── Forward client → Gemini ───────────────────────────────────────────────

  ws.on('message', (data: Buffer) => {
    if (!gemini || closed) return
    try {
      const msg = JSON.parse(data.toString()) as {
        type: string; data?: string; content?: string; mimeType?: string
      }

      if (msg.type === 'audio' && msg.data) {
        gemini.sendRealtimeInput({
          audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
        })
      } else if (msg.type === 'text' && msg.content) {
        gemini.sendClientContent({
          turns:        [{ role: 'user', parts: [{ text: msg.content }] }],
          turnComplete: true,
        })
      }
    } catch {
      // Ignore malformed frames
    }
  })

  ws.on('close', () => {
    closed = true
    try { gemini?.close() } catch {}
  })

  ws.on('error', (err) => {
    console.error('[widget-voice] client ws error:', err)
    closed = true
    try { gemini?.close() } catch {}
  })
}
