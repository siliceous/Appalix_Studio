'use client'

import { useState } from 'react'
import { Send, Edit2, X, CheckCircle2, Mail, MessageSquare, Loader2 } from 'lucide-react'
import { approveDraft, dismissDraft, editDraft } from '@/app/actions/ai-guidance'
import type { AiDraft } from '@/lib/ai-guidance/types'

interface DraftActionPanelProps {
  drafts: AiDraft[]
  onDraftActioned: () => void  // called after approve/dismiss so parent can refresh
}

export function DraftActionPanel({ drafts, onDraftActioned }: DraftActionPanelProps) {
  if (drafts.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {drafts.map(draft => (
        <DraftCard key={draft.id} draft={draft} onActioned={onDraftActioned} />
      ))}
    </div>
  )
}

function DraftCard({ draft, onActioned }: { draft: AiDraft; onActioned: () => void }) {
  const [editing, setEditing]   = useState(false)
  const [editedBody, setEditedBody] = useState(draft.body)
  const [editedSubject, setEditedSubject] = useState(draft.subject ?? '')
  const [busy, setBusy]         = useState(false)
  const [done, setDone]         = useState(false)

  const Icon = draft.channel === 'email' ? Mail : MessageSquare
  const channelLabel = draft.channel === 'email' ? 'Email draft' : 'SMS draft'
  const purposeLabel = formatPurpose(draft.purpose)

  async function handleApprove() {
    setBusy(true)
    const result = await approveDraft(draft.id)
    setBusy(false)
    if (result.ok) { setDone(true); setTimeout(onActioned, 800) }
  }

  async function handleDismiss() {
    setBusy(true)
    await dismissDraft(draft.id)
    setBusy(false)
    onActioned()
  }

  async function handleSaveEdit() {
    setBusy(true)
    await editDraft(draft.id, editedBody, editedSubject || undefined)
    setBusy(false)
    setEditing(false)
    onActioned()
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#15A4AE]/10 border border-[#15A4AE]/30">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#15A4AE]" />
        <span className="text-xs font-semibold text-[#3a9e8a] dark:text-[#15A4AE]">Draft approved for review</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
      {/* Draft header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
        <Icon className="w-3.5 h-3.5 text-[#15A4AE]" />
        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex-1">
          {channelLabel} · {purposeLabel}
        </span>
        <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
          Awaiting review
        </span>
      </div>

      {/* Draft body */}
      <div className="px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            {draft.channel === 'email' && (
              <input
                type="text"
                value={editedSubject}
                onChange={e => setEditedSubject(e.target.value)}
                placeholder="Subject"
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-[#15A4AE]/50"
              />
            )}
            <textarea
              value={editedBody}
              onChange={e => setEditedBody(e.target.value)}
              rows={6}
              className="w-full text-xs px-2.5 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 resize-none outline-none focus:border-[#15A4AE]/50 leading-relaxed"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {draft.subject && (
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{draft.subject}</p>
            )}
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{draft.body}</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
        {editing ? (
          <>
            <button onClick={handleSaveEdit} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save edit
            </button>
            <button onClick={() => { setEditing(false); setEditedBody(draft.body); setEditedSubject(draft.subject ?? '') }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={handleApprove} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a7d6e] hover:bg-[#1f6157] text-white rounded-xl transition-colors disabled:opacity-50">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Approve for send
            </button>
            <button onClick={() => setEditing(true)} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-white/8 hover:bg-gray-100 dark:hover:bg-white/12 rounded-xl border border-gray-200 dark:border-white/10 transition-colors disabled:opacity-50">
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <div className="flex-1" />
            <button onClick={handleDismiss} disabled={busy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <X className="w-3 h-3" /> Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function formatPurpose(purpose: string): string {
  const map: Record<string, string> = {
    intro:             'Introduction',
    follow_up:         'Follow-up',
    meeting_confirm:   'Meeting confirmation',
    recap:             'Recap',
    check_in:          'Check-in',
    stakeholder_aware: 'Stakeholder message',
    soft_urgency:      'Momentum message',
  }
  return map[purpose] ?? purpose.replace(/_/g, ' ')
}
