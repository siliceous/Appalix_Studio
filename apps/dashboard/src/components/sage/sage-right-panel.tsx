'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, Send, ChevronRight, ChevronLeft, Mic, MicOff } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SageRightPanelProps {
  workspaceId: string
}

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

export function SageRightPanel({ workspaceId }: SageRightPanelProps) {
  const pathname    = usePathname()
  const [collapsed, setCollapsed]  = useState(false)
  const [messages,  setMessages]   = useState<Message[]>([])
  const [input,     setInput]      = useState('')
  const [loading,   setLoading]    = useState(false)
  const [listening, setListening]  = useState(false)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (collapsed) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'm' || e.key === 'M') toggleVoice()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, listening])

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
    rec.onend  = () => setListening(false)
    rec.onerror = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  // Collapsed state — just show a thin strip
  if (collapsed) {
    return (
      <div className="w-10 shrink-0 border-l dark:border-white/8 bg-white dark:bg-[#232323] flex flex-col items-center py-4 gap-4">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          title="Open Sage AI"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="rotate-90 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap mt-4">
          Sage AI
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 shrink-0 border-l dark:border-white/8 bg-white dark:bg-[#232323] flex flex-col shadow-[-4px_0_16px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_16px_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#61c2ad]/20 dark:border-[#61c2ad]/15 bg-[#61c2ad]/[0.08] dark:bg-[#61c2ad]/10 shrink-0">
        <div className="w-6 h-6 rounded-md bg-brand-50 dark:bg-[#61c2ad]/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-[#61c2ad]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Sage AI</p>
          <p className="text-[10px] text-gray-400 truncate">{getContextLabel(pathname)}</p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
            className={m.role === 'user'
              ? 'flex justify-end'
              : 'flex justify-start'
            }
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-white/8 text-gray-800 dark:text-gray-200'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-white/8 rounded-xl px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#61c2ad]/20 dark:border-[#61c2ad]/15 bg-[#61c2ad]/[0.08] dark:bg-[#61c2ad]/10 shrink-0">
        <div className="flex items-end gap-2 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/8 px-3 py-2">
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
                : 'text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          </button>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 w-6 h-6 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
