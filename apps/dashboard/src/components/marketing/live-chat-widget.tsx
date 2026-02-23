'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface LiveChatWidgetProps {
  integrationId: string
}

export function LiveChatWidget({ integrationId }: LiveChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch welcome message from integration config on mount
  useEffect(() => {
    fetch(`/api/widget-config?id=${integrationId}`)
      .then((r) => r.json())
      .then((d: { welcome_message?: string }) => {
        setMessages([{ role: 'assistant', text: d.welcome_message ?? 'Hi there! How can I help you today?' }])
      })
      .catch(() => {
        setMessages([{ role: 'assistant', text: 'Hi there! How can I help you today?' }])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [sessionId] = useState<string>(() =>
    typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  )
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)

  // Scroll the messages box (not the whole page) to the bottom
  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const res = await fetch('/api/widget-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, message: text, session_id: sessionId }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { reply: string; conversation_id: string }
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I couldn\'t connect right now. Please try again shortly.' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, integrationId, sessionId])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#61c2ad] animate-pulse" />
        <span className="text-xs text-gray-400 font-medium">Appalix AI Agent · Online</span>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="p-4 space-y-3 h-64 overflow-y-auto scrollbar-none">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-white/10 text-gray-200 rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-brand-600/50 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="p-2 bg-[#3873BB] hover:bg-[#1a4073] disabled:opacity-40 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
