'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, Send, Mic, MicOff, X, Minimize2, Expand, Paperclip } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PRO_PLANS = ['pro', 'team', 'enterprise']

interface SageRightPanelProps {
  workspaceId: string
  plan?:        string
  trialEndsAt?: string | null
}

type PanelState = 'floating' | 'expanded' | 'closed'

function getContextLabel(pathname: string): string {
  if (pathname.includes('/sage/contacts/')) return 'Contact context'
  if (pathname.includes('/sage/pipelines/')) return 'Pipeline context'
  if (pathname.includes('/sage/tickets/'))  return 'Ticket context'
  if (pathname === '/sage/dashboard')        return 'Sage overview'
  if (pathname === '/sage/contacts')         return 'Contacts list'
  if (pathname === '/sage/pipelines')        return 'Pipelines list'
  if (pathname === '/sage/tickets')          return 'Tickets list'
  return 'Workspace context'
}

const STARTER_PROMPTS = [
  "What's on my plate today?",
  'Show high-priority open deals',
  'Which deals are closing this week?',
  'Find contact by name or email',
]

export function SageRightPanel({ workspaceId, plan = 'starter', trialEndsAt }: SageRightPanelProps) {
  const pathname    = usePathname()
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [listening,  setListening]  = useState(false)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const floatReady     = useRef(false)
  const [floatPos,     setFloatPos] = useState({ x: 40, y: 100 })
  const [winSize,      setWinSize]  = useState({ w: 420, h: 580 })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (panelState === 'closed') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'm' || e.key === 'M') toggleVoice()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelState, listening])

  // Listen for sage:open events dispatched by onboarding/help CTAs
  useEffect(() => {
    function onSageOpen(e: Event) {
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt ?? ''
      setPanelState('floating')
      if (prompt) {
        setTimeout(() => setInput(prompt), 150)
      }
    }
    window.addEventListener('sage:open', onSageOpen)
    return () => window.removeEventListener('sage:open', onSageOpen)
  }, [])

  useEffect(() => {
    if ((panelState === 'floating' || panelState === 'expanded') && !floatReady.current) {
      floatReady.current = true
      if (panelState === 'expanded') {
        setWinSize({ w: Math.min(620, window.innerWidth - 32), h: Math.min(window.innerHeight - 32, 820) })
        setFloatPos({ x: window.innerWidth - Math.min(620, window.innerWidth - 32) - 16, y: 16 })
      } else {
        setWinSize({ w: 420, h: 580 })
        setFloatPos({ x: window.innerWidth - 440, y: window.innerHeight - 620 })
      }
    }
    if (panelState === 'closed') floatReady.current = false
  }, [panelState])

  function toggleExpand() {
    if (panelState === 'expanded') {
      floatReady.current = false
      setPanelState('floating')
    } else {
      floatReady.current = false
      setPanelState('expanded')
    }
  }

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const res  = await fetch('/api/copilot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          workspaceId,
          messages: newMessages,
          context: `Current page: ${pathname}`,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'No response.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, pathname, workspaceId])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 512000) {
      setInput(prev => prev + (prev ? ' ' : '') + '[File too large — max 500 KB]')
      return
    }
    setInput(prev => prev + (prev ? ' ' : '') + '[File: ' + file.name + ']')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' + transcript : transcript))
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
      }
    }
    rec.onend   = () => setListening(false)
    rec.onerror = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    const start = { ox: floatPos.x, oy: floatPos.y, mx: e.clientX, my: e.clientY }
    function onMove(ev: MouseEvent) {
      setFloatPos({
        x: Math.max(0, Math.min(window.innerWidth  - winSize.w, start.ox + ev.clientX - start.mx)),
        y: Math.max(0, Math.min(window.innerHeight - winSize.h, start.oy + ev.clientY - start.my)),
      })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }

  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const fixR = floatPos.x + winSize.w
    const fixB = floatPos.y + winSize.h
    function onMove(ev: MouseEvent) {
      const newX = Math.min(ev.clientX, fixR - 280)
      const newY = Math.min(ev.clientY, fixB - 220)
      setFloatPos({ x: Math.max(0, newX), y: Math.max(0, newY) })
      setWinSize({ w: fixR - Math.max(0, newX), h: fixB - Math.max(0, newY) })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }

  // ── Closed — floating sparkles button ────────────────────────────────────
  if (panelState === 'closed') {
    const isTrialActive = trialEndsAt != null && new Date(trialEndsAt) > new Date()
    const isLocked = !PRO_PLANS.includes(plan) && !isTrialActive

    if (isLocked) {
      return (
        <a
          href="/settings/upgrade"
          title="Sage AI — Pro feature. Upgrade to unlock."
          className="fixed bottom-6 right-6 z-[100] w-11 h-11 rounded-full bg-gray-300 dark:bg-gray-700 shadow-lg flex items-center justify-center opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Sparkles className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </a>
      )
    }

    return (
      <button
        onClick={() => setPanelState('floating')}
        title="Open Sage AI"
        className="fixed bottom-6 right-6 z-[100] w-11 h-11 rounded-full bg-brand-600 hover:bg-brand-700 shadow-lg flex items-center justify-center transition-colors"
      >
        <Sparkles className="w-5 h-5 text-white" />
      </button>
    )
  }

  // ── Floating window ───────────────────────────────────────────────────────
  return (
    <div
      className="fixed z-[100] bg-white dark:bg-[#232323] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
      style={{ left: floatPos.x, top: floatPos.y, width: winSize.w, height: winSize.h }}
    >
      {/* Top-left resize handle */}
      <div
        onMouseDown={startResize}
        title="Resize"
        className="absolute top-0 left-0 w-5 h-5 z-10 cursor-nw-resize flex items-start justify-start p-1 group"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-300 dark:text-gray-600 group-hover:text-brand-400 dark:group-hover:text-[#15A4AE] transition-colors">
          <line x1="1" y1="9" x2="9" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="1" y1="5" x2="5" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Header — drag handle */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 bg-[#141c2b] dark:bg-[#141c2b] shrink-0 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={startDrag}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#15A4AE] to-[#0d7a83] flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-tight">Sage AI</p>
          <p className="text-[10px] text-gray-400 truncate mt-0.5">{getContextLabel(pathname)}</p>
        </div>
        <button
          onClick={toggleExpand}
          title={panelState === 'expanded' ? 'Restore' : 'Expand'}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          {panelState === 'expanded'
            ? <Minimize2 className="w-3.5 h-3.5 text-gray-400" />
            : <Expand    className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        <button
          onClick={() => { setPanelState('closed') }}
          title="Minimise"
          className="p-1 rounded hover:bg-red-500/20 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f8f7f4] dark:bg-[#232323]">
        {messages.length === 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1">Quick questions</p>
            {STARTER_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => send(prompt)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg border dark:border-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#141c2b] dark:bg-white/10 text-white'
                  : 'bg-white dark:bg-white/8 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#1c1c1c] shrink-0">
        <div className="flex items-end gap-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/8 px-3 py-2 focus-within:border-[#15A4AE]/50 focus-within:ring-2 focus-within:ring-[#15A4AE]/10 transition-all">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors text-gray-400 hover:text-brand-600 dark:hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Paperclip className="w-3 h-3" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKey}
            placeholder={listening ? 'Listening…' : 'Ask Sage…'}
            disabled={loading}
            className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none outline-none leading-relaxed max-h-[120px]"
          />
          <button
            onClick={toggleVoice}
            title={listening ? 'Stop listening' : 'Speak to Sage'}
            className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              listening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'text-gray-400 hover:text-brand-600 dark:hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          </button>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 w-6 h-6 rounded-lg bg-[#141c2b] hover:bg-[#1e2d45] dark:bg-brand-600 dark:hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="w-3 h-3 text-white" />
          </button>
        </div>
        <p className="text-[9px] text-gray-400 dark:text-gray-600 text-center mt-1.5">
          Press <kbd className="font-mono bg-gray-200 dark:bg-white/10 px-0.5 rounded">M</kbd> for mic · Enter to send
        </p>
      </div>
    </div>
  )
}
