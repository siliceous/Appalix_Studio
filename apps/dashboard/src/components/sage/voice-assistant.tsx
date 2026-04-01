'use client'

/**
 * Sage Voice Assistant
 *
 * Floating mic button that opens a voice conversation panel.
 * Streams PCM audio to the Live Gateway, receives audio/text responses,
 * and plays them back in real time.
 *
 * Usage:
 *   <VoiceAssistant workspaceId={workspace.id} pageContext="Pipeline board" />
 *
 * Place in a layout component that has workspaceId available.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Mic, MicOff, X, Loader2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'

interface TranscriptEntry {
  type:    'sage' | 'tool' | 'error'
  content: string
  id:      number
}

interface VoiceAssistantProps {
  workspaceId: string
  /** Pro+ plan check — hides voice for free workspaces */
  plan:        string
}

/** Convert a pathname to a readable page label for Sage's system prompt */
function pathToContext(pathname: string): string {
  if (pathname.startsWith('/sage/pipelines'))  return 'Sage Pipelines'
  if (pathname.startsWith('/sage/projects'))   return 'Sage Projects'
  if (pathname.startsWith('/sage/quotes'))     return 'Sage Quotes & Invoices'
  if (pathname.startsWith('/sage/contacts'))   return 'Sage Contacts'
  if (pathname.startsWith('/sage/roi'))        return 'Sage ROI dashboard'
  if (pathname.startsWith('/sage'))            return 'Sage CRM'
  if (pathname.startsWith('/dashboard/email')) return 'Email inbox'
  if (pathname.startsWith('/dashboard/bots'))  return 'Bot conversations'
  if (pathname.startsWith('/dashboard/forms')) return 'Form leads'
  if (pathname.startsWith('/dashboard/tickets')) return 'Tickets'
  if (pathname.startsWith('/dashboard'))       return 'Main dashboard'
  if (pathname.startsWith('/forms/leads'))     return 'All Leads'
  if (pathname.startsWith('/analytics'))       return 'Analytics'
  if (pathname.startsWith('/settings'))        return 'Settings'
  return 'Dashboard'
}

let _entryId = 0
const nextId = () => ++_entryId

export function VoiceAssistant({ workspaceId, plan }: VoiceAssistantProps) {
  const pathname   = usePathname()
  const pageContext = pathToContext(pathname)

  const [isOpen,     setIsOpen]     = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  const wsRef          = useRef<WebSocket | null>(null)
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const nextPlayRef    = useRef(0)           // schedule time for gapless playback
  const processorRef   = useRef<{ disconnect(): void } | null>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const transcriptRef  = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript])

  // Cleanup on unmount
  useEffect(() => () => { disconnectVoice() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addEntry = useCallback((type: TranscriptEntry['type'], content: string) => {
    setTranscript(prev => [...prev.slice(-50), { type, content, id: nextId() }])
  }, [])

  // ── Audio playback (PCM 16-bit → Web Audio) ────────────────────────────────

  const scheduleAudioChunk = useCallback((base64Data: string, mimeType: string) => {
    const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)?.[1] ?? '24000', 10)

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext({ sampleRate })
      nextPlayRef.current = 0
    }
    const ctx = audioCtxRef.current

    // base64 → Int16 → Float32
    const binary = atob(base64Data)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const pcm    = new Int16Array(bytes.buffer)
    const floats = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) floats[i] = pcm[i] / 32768

    const buf = ctx.createBuffer(1, floats.length, sampleRate)
    buf.copyToChannel(floats, 0)

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)

    const startAt = Math.max(ctx.currentTime, nextPlayRef.current)
    src.start(startAt)
    nextPlayRef.current = startAt + buf.duration

    setVoiceState('speaking')
    src.onended = () => {
      if (nextPlayRef.current <= ctx.currentTime + 0.05) setVoiceState('listening')
    }
  }, [])

  // ── Mic capture → base64 PCM ────────────────────────────────────────────────

  const startMic = useCallback(async (ws: WebSocket) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    })
    streamRef.current = stream

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext({ sampleRate: 16000 })
    }
    const ctx    = audioCtxRef.current
    const source = ctx.createMediaStreamSource(stream)

    // ScriptProcessorNode: widely supported, gives raw Float32 PCM frames
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor
    source.connect(processor)
    processor.connect(ctx.destination)

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const f32    = e.inputBuffer.getChannelData(0)
      const i16    = new Int16Array(f32.length)
      for (let i = 0; i < f32.length; i++) {
        i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32768)))
      }
      const bytes  = new Uint8Array(i16.buffer)
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      ws.send(JSON.stringify({ type: 'audio', data: btoa(bin) }))
    }
  }, [])

  // ── Stop mic + audio cleanly ──────────────────────────────────────────────

  function stopMic() {
    try {
      processorRef.current?.disconnect()
      processorRef.current = null
    } catch {}
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    } catch {}
  }

  // ── Connect to gateway ────────────────────────────────────────────────────

  const isProPlan = ['pro', 'team', 'enterprise'].includes(plan)

  const connect = useCallback(async () => {
    if (!isProPlan) {
      setIsOpen(true)
      setErrorMsg('Sage Voice requires a Pro plan. Upgrade in Settings → Upgrade.')
      return
    }
    setVoiceState('connecting')
    setErrorMsg(null)
    setTranscript([])
    nextPlayRef.current = 0

    try {
      const res = await fetch('/api/sage/live-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ workspace_id: workspaceId, page_context: pageContext }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(
          err.error === 'upgrade_required'
            ? 'Sage Voice requires a Pro plan. Upgrade in Settings → Upgrade.'
            : err.error ?? 'Failed to start voice session',
        )
      }

      const { wsUrl, firstName } = await res.json() as { wsUrl: string; firstName?: string }
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      let greetingDone = false

      // Check if it's been more than 1 hour since the last session ended
      const LAST_SESSION_KEY = 'sage_last_session_end'
      const lastEnd = parseInt(localStorage.getItem(LAST_SESSION_KEY) ?? '0', 10)
      const freshGreeting = Date.now() - lastEnd >= 60 * 60 * 1000   // ≥ 1 hour gap

      ws.onopen = () => {
        // mic starts AFTER greeting completes — see turn_complete handler below
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as Record<string, unknown>
          switch (msg.type) {
            case 'ready': {
              setVoiceState('speaking')
              const hour = new Date().getHours()
              const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
              const greet = freshGreeting
                ? `The user just woke you up by saying "Hey Sage". ` +
                  `Greet them warmly with "Good ${timeOfDay}, ${firstName ?? 'there'}!" ` +
                  `then add one short, genuinely warm pleasantry — something like asking how their day is going, ` +
                  `wishing them a great day, or a light uplifting remark. ` +
                  `Keep it to 2 sentences max. Do NOT call any tools.`
                : `The user is back (less than an hour since the last conversation). ` +
                  `Give a brief, friendly acknowledgement — like "Hey ${firstName ?? 'there'}, welcome back!" ` +
                  `or "Good to have you back, ${firstName ?? 'there'}!" — just 1 short sentence. Do NOT call any tools.`
              ws.send(JSON.stringify({ type: 'text', content: greet }))
              break
            }
            case 'audio':
              scheduleAudioChunk(String(msg.data), String(msg.mimeType ?? 'audio/pcm;rate=24000'))
              break
            case 'text':
              addEntry('sage', String(msg.content))
              break
            case 'tool_call':
              setVoiceState('thinking')
              addEntry('tool', `Checking ${String(msg.name).replace(/_/g, ' ')}…`)
              break
            case 'tool_result':
              addEntry('tool', String(msg.result))
              break
            case 'turn_complete':
              if (!greetingDone) {
                // greeting finished — now start the mic so user can speak
                greetingDone = true
                startMic(ws).catch(() => {
                  setErrorMsg('Microphone access denied. Allow mic access and try again.')
                  setVoiceState('error')
                  ws.close()
                })
              }
              if (nextPlayRef.current <= (audioCtxRef.current?.currentTime ?? 0) + 0.05) {
                setVoiceState('listening')
              }
              break
            case 'interrupted':
              nextPlayRef.current = 0
              setVoiceState('listening')
              break
            case 'error':
              setErrorMsg(String(msg.message))
              setVoiceState('error')
              break
          }
        } catch {}
      }

      ws.onclose  = () => {
        localStorage.setItem(LAST_SESSION_KEY, String(Date.now()))
        stopMic()
        wsRef.current = null
        setVoiceState('idle')
      }
      ws.onerror  = () => { setErrorMsg('Connection lost. Please reconnect.'); setVoiceState('error') }

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect')
      setVoiceState('error')
    }
  }, [workspaceId, pageContext, startMic, scheduleAudioChunk, addEntry])

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnectVoice = useCallback(() => {
    stopMic()
    nextPlayRef.current = 0
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setVoiceState('idle')
  }, [])

  const handleClose = useCallback(() => {
    disconnectVoice()
    setIsOpen(false)
    setTranscript([])
    setErrorMsg(null)
  }, [disconnectVoice])

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const STATE_LABEL: Record<VoiceState, string> = {
    idle:       'Ready',
    connecting: 'Connecting…',
    listening:  'Listening',
    thinking:   'Working on it…',
    speaking:   'Speaking',
    error:      'Error',
  }

  const STATE_DOT: Record<VoiceState, string> = {
    idle:       'bg-gray-300 dark:bg-gray-600',
    connecting: 'bg-amber-400 animate-pulse',
    listening:  'bg-green-500 animate-pulse',
    thinking:   'bg-amber-500 animate-pulse',
    speaking:   'bg-[#15A4AE] animate-pulse',
    error:      'bg-red-500',
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Expanded conversation panel ──────────────────────────────── */}
      {isOpen && (
        <div className="w-80 rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/10"
          style={{ maxHeight: 460 }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/8 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className={cn('w-2 h-2 rounded-full shrink-0', STATE_DOT[voiceState])} />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Sage Voice</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{STATE_LABEL[voiceState]}</span>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Transcript */}
          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2 [&::-webkit-scrollbar]:hidden"
          >
            {transcript.length === 0 && voiceState === 'connecting' && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Connecting to Sage…</span>
              </div>
            )}
            {transcript.length === 0 && voiceState === 'idle' && (
              <p className="text-sm text-gray-400 text-center pt-4">
                Press <strong>Start</strong> and speak to Sage
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{errorMsg}</p>
            )}
            {transcript.map(entry => (
              <div key={entry.id} className={cn(
                'rounded-xl px-3 py-2 text-sm leading-snug',
                entry.type === 'tool'
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-mono'
                  : entry.type === 'error'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100',
              )}>
                {entry.type === 'tool' && (
                  <span className="inline-flex items-center gap-1 mr-1">
                    <Zap className="w-3 h-3" />
                  </span>
                )}
                {entry.content}
              </div>
            ))}
          </div>

          {/* Action footer */}
          <div className="px-4 pb-4 pt-2 shrink-0">
            {(voiceState === 'idle' || voiceState === 'error') && (
              <button
                onClick={connect}
                className="w-full py-2 rounded-xl bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" />
                {voiceState === 'error' ? 'Reconnect' : 'Start listening'}
              </button>
            )}
            {(voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'thinking') && (
              <button
                onClick={disconnectVoice}
                className="w-full py-2 rounded-xl bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <MicOff className="w-4 h-4" />
                End session
              </button>
            )}
            {voiceState === 'connecting' && (
              <div className="w-full py-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 text-sm font-medium flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating mic button ──────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => isOpen ? handleClose() : setIsOpen(true)}
          title="Sage Voice"
          className={cn(
            'relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
            isOpen
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-[#15A4AE] hover:bg-[#0e8f99] text-white',
            voiceState === 'listening' && 'ring-4 ring-green-400/40',
            voiceState === 'speaking'  && 'ring-4 ring-[#15A4AE]/50',
            voiceState === 'thinking'  && 'ring-4 ring-amber-400/40',
          )}
        >
          {isOpen ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  )
}
