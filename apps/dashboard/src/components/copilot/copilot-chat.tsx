'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Copy, Check, Sparkles } from 'lucide-react'

interface Message {
  role:     'user' | 'assistant'
  content:  string
}

interface CopilotChatProps {
  workspaceId: string
  workspaceName: string
  userName: string
}

const STARTERS = [
  'Summarise our knowledge base',
  'Draft a proposal for a new client',
  'What are our most common support queries?',
  'Help me write a project status report',
]

export function CopilotChat({ workspaceId, workspaceName, userName }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/copilot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next, workspace_id: workspaceId }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      const reply = data.reply ?? 'Sorry, something went wrong. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }, [messages, loading, workspaceId])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  async function copyMessage(content: string, idx: number) {
    await navigator.clipboard.writeText(content)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mb-5">
            <Sparkles className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Hi {userName.split(' ')[0]}, how can I help?
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mb-8">
            I&apos;m Sage, your internal AI assistant for {workspaceName}. Ask me anything — I can search your knowledge base, draft documents, and help your team move faster.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50 text-sm text-gray-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold ${
                m.role === 'user'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-brand-100 text-brand-700'
              }`}>
                {m.role === 'user' ? userName.charAt(0).toUpperCase() : 'AI'}
              </div>

              {/* Bubble */}
              <div className={`group relative max-w-[75%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-gray-900 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                }`}>
                  {m.content}
                </div>
                {m.role === 'assistant' && (
                  <button
                    onClick={() => copyMessage(m.content, i)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === i ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 shrink-0 flex items-center justify-center text-xs font-semibold">AI</div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                <style>{`
                  @keyframes copilot-dot { 0%,60%,100%{opacity:0.2} 30%{opacity:1} }
                `}</style>
                {[0, 280, 560].map((delay) => (
                  <span key={delay} className="w-2 h-2 rounded-full bg-brand-400"
                    style={{ animation: `copilot-dot 1.4s infinite`, animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 pt-3 border-t bg-white">
        <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — search knowledge base, draft documents, get answers…"
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none disabled:opacity-50 min-h-[24px]"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 w-8 h-8 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 flex items-center justify-center transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
