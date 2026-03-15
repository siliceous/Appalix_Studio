'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  text: string
  link?: { text: string; href: string }
}

const FAQS: { q: string; a: string; link?: { text: string; href: string } }[] = [
  {
    q: 'What can this AI agent do for my business?',
    a: 'Think of it as a digital team member that handles repetitive work, supports customers, automates tasks, and keeps things moving even when your team is offline.',
  },
  {
    q: 'How quickly can we get up and running?',
    a: "Faster than you'd expect. Most teams launch their first agent within minutes using ready-made templates and simple integrations.",
  },
  {
    q: 'Is our data safe and under our control?',
    a: 'Absolutely. You stay in control with secure access, permissions, and guardrails — the AI only sees and uses what you allow.',
    link: { text: 'See our security & privacy page →', href: '/security' },
  },
  {
    q: 'Will it work with the tools we already use?',
    a: "Yes, it plugs into your existing stack — CRM, marketing tools, helpdesk, or internal docs. It can also hand over to a real person if available!",
  },
  {
    q: "What if it's not the right fit?",
    a: "Start with our 7-day free trial, test real use cases, and scale only when you see value. No pressure to commit before you're confident.",
  },
  {
    q: 'How does pricing work?',
    a: 'Plans grow with you — start with what you need today and expand as your usage increases. No complicated setup or surprise costs.',
    link: { text: 'Check our pricing →', href: '/pricing' },
  },
]

interface LiveChatWidgetProps {
  integrationId: string
}

export function LiveChatWidget({ integrationId }: LiveChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [usedFaqs, setUsedFaqs] = useState<Set<number>>(new Set())

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

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setShowSuggestions(false)
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
        { role: 'assistant', text: "Sorry, I couldn't connect right now. Please try again shortly." },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, integrationId, sessionId])

  function handleFaqClick(faq: typeof FAQS[number], index: number) {
    setUsedFaqs((prev) => new Set(prev).add(index))
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: faq.q },
      { role: 'assistant', text: faq.a, link: faq.link },
    ])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function openPopup(href: string) {
    const name = href.replace(/\//g, '')
    window.open(href, name, 'width=960,height=700,scrollbars=yes,resizable=yes')
  }

  return (
    <div className="rounded-2xl shadow-[0_0_55px_12px_rgba(255,255,255,0.09),0_0_110px_30px_rgba(255,255,255,0.045)]">
    <div className="w-full bg-white/[0.04] border border-[#15A4AE]/60 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#15A4AE] animate-pulse" />
        <span className="text-xs text-gray-400 font-medium">Appalix AI Agent · Online</span>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="p-4 space-y-3 h-[480px] overflow-y-auto scrollbar-none">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#2a2a2a] border border-white/10 text-gray-200 rounded-br-sm'
                  : 'bg-[#2a2a2a] border border-white/10 text-[#15A4AE] rounded-bl-sm'
              }`}
            >
              {m.text}
              {m.link && (
                <>
                  {' '}
                  <button
                    onClick={() => openPopup(m.link!.href)}
                    className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
                  >
                    {m.link.text}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Suggestion chips — visible until user interacts */}
        {showSuggestions && messages.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {FAQS.map((faq, i) => !usedFaqs.has(i) && (
              <button
                key={i}
                onClick={() => handleFaqClick(faq, i)}
                className="w-full text-left px-3.5 py-2 rounded-xl border border-[#15A4AE]/50 bg-[#15A4AE]/10 text-sm text-[#15A4AE] hover:bg-[#15A4AE]/20 hover:border-[#15A4AE]/70 transition-colors"
              >
                {faq.q}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
              <style>{`
                @keyframes dot-flash {
                  0%, 60%, 100% { opacity: 0.2; }
                  30% { opacity: 1; }
                }
              `}</style>
              <span className="w-2 h-2 rounded-full bg-[#15A4AE]" style={{ animation: 'dot-flash 1.4s infinite', animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#15A4AE]" style={{ animation: 'dot-flash 1.4s infinite', animationDelay: '280ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#15A4AE]" style={{ animation: 'dot-flash 1.4s infinite', animationDelay: '560ms' }} />
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
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-white outline-none focus:border-brand-600/50 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="p-2 bg-[#1a8c76] hover:bg-[#14705d] disabled:opacity-40 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
    </div>
  )
}
