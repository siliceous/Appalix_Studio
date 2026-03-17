'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { X, Send, Loader2, Sparkles } from 'lucide-react'
import { sendEmail, draftEmailFromContext, rewriteEmail } from '@/app/actions/sage-emails'

interface EmailComposeModalProps {
  to?:      string   // pre-filled recipient (editable)
  toName?:  string   // used for AI draft personalisation
  subject?: string   // pre-filled subject (editable)
  context?: string   // context fed to AI draft generator
  onClose:  () => void
  onSent?:  () => void
}

export function EmailComposeModal({
  to: initialTo = '',
  toName,
  subject: initialSubject = '',
  context = '',
  onClose,
  onSent,
}: EmailComposeModalProps) {
  const [to,      setTo]      = useState(initialTo)
  const [cc,      setCc]      = useState('')
  const [bcc,     setBcc]     = useState('')
  const [subject, setSubject] = useState(initialSubject)
  const [body,    setBody]    = useState('')
  const [showCc,  setShowCc]  = useState(false)
  const [showBcc, setShowBcc] = useState(false)

  const [generating, setGenerating] = useState(true)
  const [genError,   setGenError]   = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const [showRewrite,  setShowRewrite]  = useState(false)
  const [rewriteInst,  setRewriteInst]  = useState('')
  const [isRewriting,  startRewriteTrans] = useTransition()
  const [isSending,    startSendTrans]    = useTransition()

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Generate AI draft on mount
  useEffect(() => {
    if (!context && !initialSubject) { setGenerating(false); return }
    void (async () => {
      setGenerating(true)
      const result = await draftEmailFromContext({
        toName,
        subject: initialSubject || 'Follow-up',
        context,
      })
      setGenerating(false)
      if ('error' in result) {
        setGenError(result.error)
      } else {
        setBody(result.draft)
        setTimeout(() => bodyRef.current?.focus(), 50)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSend() {
    if (!to || !subject || !body) return
    setSendResult(null)
    startSendTrans(async () => {
      const result = await sendEmail({ to, cc: cc || undefined, bcc: bcc || undefined, subject, body })
      if (result.error) {
        setSendResult(`Error: ${result.error}`)
      } else {
        setSendResult('Sent!')
        setTimeout(() => { onSent?.(); onClose() }, 1200)
      }
    })
  }

  function handleRewrite() {
    if (!body) return
    startRewriteTrans(async () => {
      const result = await rewriteEmail({
        body,
        instruction: rewriteInst || 'Rewrite this email to be clear, professional, and concise.',
      })
      if (!result.error) { setBody(result.body); setShowRewrite(false); setRewriteInst('') }
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/55 dark:bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:px-6 sm:py-8 pointer-events-none">
        <div className="relative w-full sm:max-w-2xl bg-white dark:bg-[#2a2a2a] rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 dark:border-white/12 flex flex-col pointer-events-auto h-[96vh] sm:h-[calc(100vh-64px)]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b dark:border-white/8 shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Email</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Fields */}
          <div className="px-5 py-3 space-y-2.5 shrink-0 border-b dark:border-white/8">
            {/* To */}
            <div className="flex items-center gap-2 border-b dark:border-white/8 pb-2.5">
              <span className="text-[11px] font-semibold text-gray-400 w-7 shrink-0">To</span>
              <input
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="recipient@email.com"
                className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
              <div className="flex items-center gap-1 shrink-0">
                {!showCc  && <button onClick={() => setShowCc(true)}  className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded transition-colors">Cc</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)} className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded transition-colors">Bcc</button>}
              </div>
            </div>
            {showCc && (
              <div className="flex items-center gap-2 border-b dark:border-white/8 pb-2.5">
                <span className="text-[11px] font-semibold text-gray-400 w-7 shrink-0">Cc</span>
                <input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@email.com"
                  className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none" />
                <button onClick={() => { setShowCc(false); setCc('') }} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-2 border-b dark:border-white/8 pb-2.5">
                <span className="text-[11px] font-semibold text-gray-400 w-7 shrink-0">Bcc</span>
                <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="bcc@email.com"
                  className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none" />
                <button onClick={() => { setShowBcc(false); setBcc('') }} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {/* Subject */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400 w-7 shrink-0">Sub</span>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-hidden px-5 py-3">
            {generating ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4 shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating AI draft…
              </div>
            ) : genError ? (
              <p className="text-xs text-red-500 mb-2 shrink-0">{genError}</p>
            ) : null}
            <textarea
              ref={bodyRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Compose email…"
              className="flex-1 w-full text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 bg-transparent focus:outline-none resize-none leading-relaxed overflow-y-auto"
            />
          </div>

          {/* AI rewrite input */}
          {showRewrite && (
            <div className="flex gap-2 px-5 pb-3 shrink-0">
              <input
                value={rewriteInst}
                onChange={e => setRewriteInst(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRewrite() }}
                placeholder="e.g. make it shorter, more formal…"
                className="flex-1 px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button onClick={handleRewrite} disabled={isRewriting || !body}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Apply
              </button>
              <button onClick={() => setShowRewrite(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-5 py-3 border-t dark:border-white/8 shrink-0">
            <button
              onClick={handleSend}
              disabled={isSending || !to || !subject || !body}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </button>
            <button
              onClick={() => setShowRewrite(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Rewrite
            </button>
            {sendResult && (
              <span className={`text-xs ml-auto ${sendResult.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                {sendResult}
              </span>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
