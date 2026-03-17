'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { MessageSquare, Plus, Inbox, CheckCircle, X, Mail } from 'lucide-react'
import { timeAgo, PLATFORM_META } from '@/lib/utils'
import type { Bot as BotRow } from '@/lib/types'
import { triageCreateLead, triageCreateTicket } from '@/app/actions/sage-triage'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'

export type BotConversation = {
  id: string
  title: string | null
  platform: string | null
  status: string | null
  message_count: number | null
  last_activity_at: string | null
  bot_id: string | null
}

type Priority = 'high' | 'medium' | 'low'
type Rec      = 'create_lead' | 'create_ticket' | 'ignore'

const SUPPORT_RE =
  /\b(not working|bug|issue|problem|access|billing|error|broken|down|outage|crash|fail)\b/i

function derivePriority(msgCount: number | null): Priority {
  const n = msgCount ?? 0
  if (n >= 10) return 'high'
  if (n >= 5)  return 'medium'
  return 'low'
}

function deriveRec(title: string | null, priority: Priority): Rec {
  if (priority === 'low') return 'ignore'
  if (SUPPORT_RE.test(title ?? '')) return 'create_ticket'
  return 'create_lead'
}

const PRIORITY_DOT: Record<Priority, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-400',
  low:    'bg-gray-300 dark:bg-gray-600',
}

const PRIORITY_TEXT: Record<Priority, string> = {
  high:   'text-red-500',
  medium: 'text-amber-500',
  low:    'text-gray-400',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
}

type ModalMode = 'lead' | 'ticket' | null

export function BotsDashboard({
  bots,
  conversations,
}: {
  bots: BotRow[]
  conversations: BotConversation[]
}) {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(bots[0]?.id ?? null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [actioned, setActioned]   = useState<Map<string, string>>(new Map())
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [activeConv, setActiveConv] = useState<BotConversation | null>(null)
  const [emailConv,  setEmailConv]  = useState<BotConversation | null>(null)
  const [emailFromModal, setEmailFromModal] = useState<{ to: string; toName: string; context: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Lead form
  const [leadName, setLeadName]       = useState('')
  const [leadEmail, setLeadEmail]     = useState('')
  const [leadCompany, setLeadCompany] = useState('')
  const [leadTitle, setLeadTitle]     = useState('')
  const [leadNotes, setLeadNotes]     = useState('')

  // Ticket form
  const [ticketTitle, setTicketTitle]       = useState('')
  const [ticketDesc, setTicketDesc]         = useState('')
  const [ticketEmail, setTicketEmail]       = useState('')
  const [ticketName, setTicketName]         = useState('')
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [formError, setFormError] = useState('')

  const selectedBot = bots.find(b => b.id === selectedBotId) ?? null
  const botConvs    = conversations
    .filter(c => c.bot_id === selectedBotId && !dismissed.has(c.id))

  function openLead(conv: BotConversation, bot: BotRow) {
    setActiveConv(conv)
    setLeadName('')
    setLeadEmail('')
    setLeadCompany('')
    setLeadTitle(conv.title ?? `Lead from ${bot.name}`)
    setLeadNotes(
      `Captured via ${bot.name}${conv.platform ? ` on ${conv.platform}` : ''}. ${conv.message_count ?? 0} messages.`,
    )
    setFormError('')
    setModalMode('lead')
  }

  function openTicket(conv: BotConversation, bot: BotRow) {
    setActiveConv(conv)
    setTicketTitle(conv.title ?? `Support – ${bot.name}`)
    setTicketDesc(
      `Received via ${bot.name}${conv.platform ? ` on ${conv.platform}` : ''}. ${conv.message_count ?? 0} messages exchanged.`,
    )
    setTicketEmail('')
    setTicketName('')
    const p = derivePriority(conv.message_count)
    setTicketPriority(p === 'high' ? 'urgent' : p === 'medium' ? 'high' : 'medium')
    setFormError('')
    setModalMode('ticket')
  }

  function submitLead() {
    if (!activeConv) return
    setFormError('')
    startTransition(async () => {
      const res = await triageCreateLead({
        name:      leadName  || 'Unknown',
        email:     leadEmail || '',
        company:   leadCompany || undefined,
        dealTitle: leadTitle,
        notes:     leadNotes  || undefined,
      })
      if (res.error) { setFormError(res.error); return }
      setActioned(m => new Map(m).set(activeConv.id, 'Lead created'))
      setModalMode(null)
    })
  }

  function submitTicket() {
    if (!activeConv) return
    setFormError('')
    startTransition(async () => {
      const res = await triageCreateTicket({
        title:        ticketTitle,
        description:  ticketDesc,
        contactEmail: ticketEmail || '',
        contactName:  ticketName  || 'Unknown',
        priority:     ticketPriority,
      })
      if (res.error) { setFormError(res.error); return }
      setActioned(m => new Map(m).set(activeConv.id, 'Ticket created'))
      setModalMode(null)
    })
  }

  if (bots.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#1c1c1c]">
        <div className="text-center">
          <Image src="/favicon.png" alt="Bots" width={40} height={40} className="w-10 h-10 mx-auto mb-3 opacity-30 dark:opacity-20" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No bots yet</p>
          <p className="text-xs text-gray-400 mb-5">Create your first bot to start capturing leads.</p>
          <a
            href="/bots/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create bot
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ── Left: Bot triage list ──────────────────────────── */}
      <aside className="w-[280px] shrink-0 flex flex-col border-r border-gray-200 dark:border-white/8 bg-gray-50/80 dark:bg-[#161616] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/8 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Bots
          </h2>
          <span className="text-xs bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 font-medium">
            {bots.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {bots.map(bot => {
            const isSelected = bot.id === selectedBotId
            const total   = conversations.filter(c => c.bot_id === bot.id).length
            const highCnt = conversations.filter(
              c => c.bot_id === bot.id && derivePriority(c.message_count) === 'high',
            ).length

            return (
              <button
                key={bot.id}
                onClick={() => setSelectedBotId(bot.id)}
                className={[
                  'w-full text-left px-4 py-3 transition-colors',
                  isSelected
                    ? 'bg-white dark:bg-[#1e1e1e]'
                    : 'hover:bg-gray-100/70 dark:hover:bg-white/4',
                ].join(' ')}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white dark:bg-white/5">
                    <Image src="/favicon.png" alt="Bot" width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-5">
                      {bot.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {total} lead{total !== 1 ? 's' : ''}
                      {highCnt > 0 && (
                        <span className="ml-1 text-red-500 font-medium">· {highCnt} high</span>
                      )}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Right: Leads from selected bot ─────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">
        {!selectedBot ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Select a bot to view its leads</p>
          </div>
        ) : botConvs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No leads from {selectedBot.name}
              </p>
              <p className="text-xs text-gray-400">Leads appear here when visitors chat with this bot.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-white/8 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white dark:bg-white/5">
                  <Image src="/favicon.png" alt="Bot" width={12} height={12} className="w-3 h-3 object-contain" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedBot.name}
                </span>
                <span className="text-xs text-gray-400">— {botConvs.length} leads</span>
              </div>
              <a
                href={`/bots/${selectedBot.id}`}
                className="text-xs text-brand-600 dark:text-[#ec732e] hover:underline"
              >
                View bot →
              </a>
            </div>

            {/* Lead rows */}
            <div className="flex-1 overflow-y-auto">
              {botConvs.map(conv => {
                const priority = derivePriority(conv.message_count)
                const rec      = deriveRec(conv.title, priority)
                const done     = actioned.get(conv.id)
                const platform = conv.platform
                  ? PLATFORM_META[conv.platform as keyof typeof PLATFORM_META]
                  : null

                return (
                  <div key={conv.id} className="px-5 py-3.5 flex items-start gap-3">
                    {/* Priority dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-2 ${PRIORITY_DOT[priority]}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {conv.title ?? 'Untitled conversation'}
                        </p>
                        {platform && (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${platform.color}`}>
                            {platform.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className={`font-medium ${PRIORITY_TEXT[priority]}`}>
                          {PRIORITY_LABEL[priority]}
                        </span>
                        <span>·</span>
                        <MessageSquare className="w-3 h-3" />
                        <span>{conv.message_count ?? 0} msgs</span>
                        {conv.last_activity_at && (
                          <>
                            <span>·</span>
                            <span>{timeAgo(conv.last_activity_at)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {done ? (
                        <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {done}
                        </span>
                      ) : rec === 'ignore' ? (
                        <button
                          onClick={() => setDismissed(s => new Set(s).add(conv.id))}
                          className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          Dismiss
                        </button>
                      ) : (
                        <>
                          {rec === 'create_lead' ? (
                            <button
                              onClick={() => openLead(conv, selectedBot)}
                              className="text-[11px] px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Create Lead
                            </button>
                          ) : (
                            <button
                              onClick={() => openTicket(conv, selectedBot)}
                              className="text-[11px] px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Create Ticket
                            </button>
                          )}
                          {/* Secondary action: opposite of primary */}
                          <button
                            onClick={() => rec === 'create_lead'
                              ? openTicket(conv, selectedBot)
                              : openLead(conv, selectedBot)
                            }
                            className="text-[11px] px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-white/10 rounded-lg transition-colors"
                          >
                            {rec === 'create_lead' ? 'Ticket' : 'Lead'}
                          </button>
                          <button
                            onClick={() => setEmailConv(conv)}
                            className="p-1 text-gray-400 hover:text-[#15A4AE] transition-colors"
                            title="Reply via email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDismissed(s => new Set(s).add(conv.id))}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            title="Ignore"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Modal: Create Lead ─────────────────────────────── */}
      {modalMode === 'lead' && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/20 dark:bg-black/40">
          <div className="w-full max-w-lg bg-white dark:bg-[#232323] rounded-t-2xl shadow-2xl p-6 border-t border-x border-gray-200 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Create Lead</h3>
            {formError && (
              <p className="text-xs text-red-500 mb-3 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">{formError}</p>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
                  <input
                    value={leadName} onChange={e => setLeadName(e.target.value)}
                    placeholder="Contact name"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
                  <input
                    value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                    type="email" placeholder="email@example.com"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Company</label>
                <input
                  value={leadCompany} onChange={e => setLeadCompany(e.target.value)}
                  placeholder="Company name"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Deal Title</label>
                <input
                  value={leadTitle} onChange={e => setLeadTitle(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
                <textarea
                  value={leadNotes} onChange={e => setLeadNotes(e.target.value)} rows={2}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={submitLead} disabled={isPending}
                className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isPending ? 'Creating…' : 'Create Lead'}
              </button>
              {leadEmail && (
                <button
                  onClick={() => setEmailFromModal({ to: leadEmail, toName: leadName, context: `Conversation: ${activeConv?.title ?? ''}\n${leadNotes}` })}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#15A4AE]/40 text-[#3a9e8a] dark:text-[#15A4AE] rounded-lg hover:bg-[#15A4AE]/8 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Reply
                </button>
              )}
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Email Reply (from row) ──────────────────── */}
      {emailConv && (
        <EmailComposeModal
          subject={`Re: ${emailConv.title ?? 'Bot conversation'}`}
          context={[
            emailConv.title    ? `Conversation: ${emailConv.title}` : '',
            emailConv.platform ? `Platform: ${emailConv.platform}` : '',
            `Messages exchanged: ${emailConv.message_count ?? 0}`,
          ].filter(Boolean).join('\n')}
          onClose={() => setEmailConv(null)}
          onSent={() => setActioned(m => new Map(m).set(emailConv.id, 'Email sent'))}
        />
      )}

      {/* ── Modal: Email Reply (from lead/ticket modal) ─────── */}
      {emailFromModal && (
        <EmailComposeModal
          to={emailFromModal.to}
          toName={emailFromModal.toName}
          subject="Following up on your enquiry"
          context={emailFromModal.context}
          onClose={() => setEmailFromModal(null)}
        />
      )}

      {/* ── Modal: Create Ticket ───────────────────────────── */}
      {modalMode === 'ticket' && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/20 dark:bg-black/40">
          <div className="w-full max-w-lg bg-white dark:bg-[#232323] rounded-t-2xl shadow-2xl p-6 border-t border-x border-gray-200 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Create Ticket</h3>
            {formError && (
              <p className="text-xs text-red-500 mb-3 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">{formError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Title</label>
                <input
                  value={ticketTitle} onChange={e => setTicketTitle(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Contact Name</label>
                  <input
                    value={ticketName} onChange={e => setTicketName(e.target.value)}
                    placeholder="Unknown"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Contact Email</label>
                  <input
                    value={ticketEmail} onChange={e => setTicketEmail(e.target.value)}
                    type="email" placeholder="email@example.com"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Priority</label>
                <select
                  value={ticketPriority}
                  onChange={e => setTicketPriority(e.target.value as typeof ticketPriority)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} rows={2}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={submitTicket} disabled={isPending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isPending ? 'Creating…' : 'Create Ticket'}
              </button>
              {ticketEmail && (
                <button
                  onClick={() => setEmailFromModal({ to: ticketEmail, toName: ticketName, context: `Ticket: ${ticketTitle}\n${ticketDesc}` })}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#15A4AE]/40 text-[#3a9e8a] dark:text-[#15A4AE] rounded-lg hover:bg-[#15A4AE]/8 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Reply
                </button>
              )}
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
