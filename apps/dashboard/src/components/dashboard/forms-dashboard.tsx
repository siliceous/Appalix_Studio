'use client'

import React, { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Plus, Sparkles, Loader2, X, Check,
  UserPlus, Ticket, Brain, Trash2, ChevronRight,
  Mail, Phone, Building2, MessageSquare, Tag,
} from 'lucide-react'
import {
  deleteForm, analyzeFormSubmissions,
  formSubmissionCreateLead, formSubmissionCreateTicket, markSubmissionActioned,
  type SageForm, type SageFormSubmission,
} from '@/app/actions/sage-forms'
import { timeAgo, cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  high:   'bg-[#61c2ad]',
  medium: 'bg-amber-400',
  low:    'bg-gray-300 dark:bg-gray-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-[#61c2ad]/10 dark:bg-[#61c2ad]/15 text-[#3a9e8a] dark:text-[#61c2ad] border border-[#61c2ad]/30',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/18',
  low:    'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10',
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function sortSubmissions(a: SageFormSubmission, b: SageFormSubmission) {
  const pa = a.ai_priority ? (PRIORITY_ORDER[a.ai_priority] ?? 3) : 3
  const pb = b.ai_priority ? (PRIORITY_ORDER[b.ai_priority] ?? 3) : 3
  if (pa !== pb) return pa - pb
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

interface Props {
  forms:       SageForm[]
  submissions: SageFormSubmission[]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FormsDashboard({ forms: initialForms, submissions: initialSubmissions }: Props) {
  const router  = useRouter()
  const [forms,          setForms]          = useState<SageForm[]>(initialForms)
  const [submissions]                       = useState<SageFormSubmission[]>(initialSubmissions)
  const [selectedFormId, setSelectedFormId] = useState<string | null>(initialForms[0]?.id ?? null)
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [done,           setDone]           = useState<Set<string>>(new Set())
  const [showEmbed,      setShowEmbed]       = useState<string | null>(null)
  const [isPending,      startTransition]    = useTransition()
  const [isAnalyzing,    setIsAnalyzing]     = useState(false)
  const [actionResult,   setActionResult]    = useState<Map<string, string>>(new Map())
  const detailRef = useRef<HTMLDivElement>(null)

  const formSubmissions = submissions
    .filter(s => s.form_id === selectedFormId && !done.has(s.id))
    .sort(sortSubmissions)

  const pendingAnalysis = formSubmissions.filter(s => !s.ai_analyzed_at).length
  const selected = formSubmissions.find(s => s.id === selectedId) ?? null

  // Auto-select first submission when form changes
  useEffect(() => {
    setSelectedId(formSubmissions[0]?.id ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId])

  // Click outside to deselect
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (detailRef.current && !detailRef.current.contains(e.target as Node)) {
      setSelectedId(null)
    }
  }, [])
  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [handleOutsideClick])

  // Auto-analyze pending submissions on load
  useEffect(() => {
    if (pendingAnalysis > 0 && selectedFormId) void runAnalyze()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId])

  async function runAnalyze() {
    setIsAnalyzing(true)
    await analyzeFormSubmissions(selectedFormId ?? undefined)
    router.refresh()
    setIsAnalyzing(false)
  }

  async function handleDeleteForm(formId: string) {
    if (!confirm('Delete this form and all its submissions?')) return
    await deleteForm(formId)
    setForms(prev => prev.filter(f => f.id !== formId))
    if (selectedFormId === formId) setSelectedFormId(forms.find(f => f.id !== formId)?.id ?? null)
  }

  async function handleCreateLead() {
    if (!selected) return
    startTransition(async () => {
      const res = await formSubmissionCreateLead(selected)
      if (res.error) {
        setActionResult(prev => new Map(prev).set(selected.id, `Error: ${res.error}`))
      } else {
        setDone(prev => new Set(prev).add(selected.id))
        setActionResult(prev => new Map(prev).set(selected.id, 'Lead created'))
        setSelectedId(formSubmissions.find(s => s.id !== selected.id)?.id ?? null)
      }
    })
  }

  async function handleCreateTicket() {
    if (!selected) return
    startTransition(async () => {
      const res = await formSubmissionCreateTicket(selected)
      if (res.error) {
        setActionResult(prev => new Map(prev).set(selected.id, `Error: ${res.error}`))
      } else {
        setDone(prev => new Set(prev).add(selected.id))
        setActionResult(prev => new Map(prev).set(selected.id, 'Ticket created'))
        setSelectedId(formSubmissions.find(s => s.id !== selected.id)?.id ?? null)
      }
    })
  }

  async function handleIgnore() {
    if (!selected) return
    await markSubmissionActioned(selected.id, 'ignored')
    setDone(prev => new Set(prev).add(selected.id))
    setSelectedId(formSubmissions.find(s => s.id !== selected.id)?.id ?? null)
  }

  const apiBase    = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.appalix.ai'
  const embedCode  = (formId: string) =>
    `<!-- Appalix Contact Form -->\n<script>\n  window.AppalixFormId = '${formId}';\n</script>\n<script src="${apiBase}/form-widget.js" async></script>`

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ── Left panel — form list ─────────────────────────────── */}
      <aside className="w-[220px] shrink-0 flex flex-col border-r border-gray-200 dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/8 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Forms</h2>
          <button
            onClick={() => router.push('/forms/sources')}
            className="w-5 h-5 rounded-md flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>


        <div className="flex-1 overflow-y-auto">
          {forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <ClipboardList className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">No forms yet</p>
              <button onClick={() => router.push('/forms/sources')} className="mt-2 text-xs text-brand-600 dark:text-[#61c2ad] hover:underline">
                Create your first form
              </button>
            </div>
          ) : forms.map(form => {
            const count  = submissions.filter(s => s.form_id === form.id && !done.has(s.id)).length
            const active = selectedFormId === form.id
            return (
              <div
                key={form.id}
                onClick={() => setSelectedFormId(form.id)}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-gray-100 dark:border-white/5 transition-colors',
                  active ? 'bg-white dark:bg-[#1e1e1e]' : 'hover:bg-gray-100/60 dark:hover:bg-white/3'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium truncate', active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>
                    {form.name}
                  </p>
                  {count > 0 && <p className="text-[10px] text-gray-400 mt-0.5">{count} submission{count !== 1 ? 's' : ''}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setShowEmbed(form.id) }}
                    title="Get embed code"
                    className="p-0.5 text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] rounded"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); void handleDeleteForm(form.id) }}
                    title="Delete form"
                    className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* ── Centre panel — submission list ──────────────────────── */}
      <div className="w-[240px] shrink-0 flex flex-col border-r border-gray-200 dark:border-white/8 bg-gray-50/40 dark:bg-[#191919] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
              {forms.find(f => f.id === selectedFormId)?.name ?? 'Submissions'}
            </span>
            {formSubmissions.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500">
                {formSubmissions.length}
              </span>
            )}
          </div>
          <button
            onClick={() => void runAnalyze()}
            disabled={isAnalyzing || !selectedFormId}
            className="flex items-center gap-1 text-[10px] font-medium text-brand-600 dark:text-[#61c2ad] hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Analyse
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedFormId || forms.length === 0 ? (
            <div className="flex items-center justify-center h-full"><p className="text-xs text-gray-400">Select a form</p></div>
          ) : formSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <ClipboardList className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">No submissions yet</p>
              <button onClick={() => setShowEmbed(selectedFormId)} className="mt-2 text-xs text-brand-600 dark:text-[#61c2ad] hover:underline">
                Get embed code →
              </button>
            </div>
          ) : formSubmissions.map(sub => {
            const name  = sub.ai_entities?.name  ?? sub.fields.name  ?? 'Anonymous'
            const email = sub.ai_entities?.email ?? sub.fields.email ?? null
            return (
              <div
                key={sub.id}
                onClick={() => setSelectedId(sub.id)}
                className={cn(
                  'px-3 py-2.5 border-b border-gray-100 dark:border-white/5 cursor-pointer transition-colors',
                  selectedId === sub.id ? 'bg-white dark:bg-[#1e1e1e]' : 'hover:bg-gray-100/60 dark:hover:bg-white/3'
                )}
              >
                <div className="flex items-start gap-2">
                  {sub.ai_priority
                    ? <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', PRIORITY_DOT[sub.ai_priority])} />
                    : <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-gray-200 dark:bg-white/10 animate-pulse" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
                    {email && <p className="text-[10px] text-gray-400 truncate">{email}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                      {sub.ai_priority && (
                        <span className={cn('text-[9px] font-semibold px-1 py-0.5 rounded uppercase', PRIORITY_BADGE[sub.ai_priority])}>
                          {sub.ai_priority}
                        </span>
                      )}
                      {!sub.ai_analyzed_at && <span className="text-[9px] text-gray-400 italic">pending…</span>}
                      <span className="text-[9px] text-gray-400 ml-auto">{timeAgo(sub.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right panel — detail ─────────────────────────────────── */}
      <div ref={detailRef} className="flex-1 bg-white dark:bg-[#1a1a1a] flex flex-col overflow-hidden">

        {!selected ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xs">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              </div>
              {forms.length === 0 ? (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Create your first form</h3>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                    Embed it on your website to capture leads. Submissions are AI-triaged automatically — just like email.
                  </p>
                  <button onClick={() => router.push('/forms/sources')} className="px-4 py-2 text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors">
                    New Form
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Select a submission</h3>
                  <p className="text-xs text-gray-400">Click a submission to review it and take action.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b dark:border-white/8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selected.ai_entities?.name ?? selected.fields.name ?? 'Anonymous Submission'}
                    </h2>
                    {selected.ai_priority && (
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase', PRIORITY_BADGE[selected.ai_priority])}>
                        {selected.ai_priority}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(selected.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {' · '}{forms.find(f => f.id === selected.form_id)?.name}
                  </p>
                </div>
                {selected.actioned_at && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 font-medium shrink-0 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {selected.action_type === 'lead' ? 'Lead created' : selected.action_type === 'ticket' ? 'Ticket created' : 'Ignored'}
                  </span>
                )}
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Submitted fields */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Form Data</p>
                <div className="space-y-2">
                  {selected.fields.name && (
                    <div className="flex items-center gap-2 text-xs">
                      <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Name</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{selected.fields.name}</span>
                    </div>
                  )}
                  {selected.fields.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Email</span>
                      <span className="text-gray-900 dark:text-gray-100">{selected.fields.email}</span>
                    </div>
                  )}
                  {selected.fields.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Phone</span>
                      <span className="text-gray-900 dark:text-gray-100">{selected.fields.phone}</span>
                    </div>
                  )}
                  {selected.fields.company && (
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Company</span>
                      <span className="text-gray-900 dark:text-gray-100">{selected.fields.company}</span>
                    </div>
                  )}
                  {selected.fields.message && (
                    <div className="flex items-start gap-2 text-xs">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Message</span>
                      <span className="text-gray-900 dark:text-gray-100 leading-relaxed">{selected.fields.message}</span>
                    </div>
                  )}
                  {Object.entries(selected.fields)
                    .filter(([k]) => !['name','email','phone','company','message'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="flex items-start gap-2 text-xs">
                        <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0 capitalize">{k}</span>
                        <span className="text-gray-900 dark:text-gray-100">{v}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* AI Analysis */}
              {!selected.ai_analyzed_at ? (
                <div className="rounded-xl border border-dashed dark:border-white/10 p-4 flex items-center gap-3">
                  <Brain className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">AI analysis pending</p>
                    <button onClick={() => void runAnalyze()} className="text-xs text-brand-600 dark:text-[#61c2ad] hover:underline mt-0.5">
                      Analyse now →
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {selected.ai_summary && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">AI Summary</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-white/3 rounded-xl px-4 py-3 border dark:border-white/5">
                        {selected.ai_summary}
                      </p>
                    </div>
                  )}
                  {selected.ai_insights && selected.ai_insights.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Key Insights</p>
                      <ul className="space-y-1.5">
                        {selected.ai_insights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                            <span className="text-[#61c2ad] shrink-0 mt-0.5">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Action buttons */}
              {!selected.actioned_at && (
                <div className="pt-1 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">What would you like to do?</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => void handleCreateLead()}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Create Lead
                    </button>
                    <button
                      onClick={() => void handleCreateTicket()}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      Create Ticket
                    </button>
                    <button
                      onClick={() => void handleIgnore()}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Ignore
                    </button>
                  </div>
                  {actionResult.get(selected.id) && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />{actionResult.get(selected.id)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Embed code overlay ───────────────────────────────────── */}
      {showEmbed && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/8">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Embed this form</h3>
              <button onClick={() => setShowEmbed(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Add this snippet to any webpage. A styled contact form will appear and submissions will arrive here, AI-triaged automatically.
              </p>
              <pre className="text-xs bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-xl p-4 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
                {embedCode(showEmbed)}
              </pre>
              <button
                onClick={() => { void navigator.clipboard.writeText(embedCode(showEmbed!)); setShowEmbed(null) }}
                className="w-full px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
              >
                Copy to clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
