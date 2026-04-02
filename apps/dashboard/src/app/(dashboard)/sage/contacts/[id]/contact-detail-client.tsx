'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail, Phone, Building2, Briefcase, Globe, MapPin, Tag,
  ChevronLeft, ChevronRight, Plus,
  DollarSign, Ticket as TicketIcon, CheckCircle2,
  ChevronUp, ChevronDown as ChevronDownIcon,
} from 'lucide-react'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'
import { ContactActionsClient } from '@/components/sage/contact-actions-client'
import { ContactAiAnalysis } from '@/components/sage/contact-ai-analysis'
import { DealSlideOver } from '@/components/sage/deal-slide-over'
import { TicketSlideOver } from '@/components/dashboard/ticket-slide-over'
import { TicketModal } from '@/components/sage/ticket-modal'
import { EmailComposeModal } from '@/components/dashboard/email-compose-modal'
import type {
  SageContact, SageActivityLog, SageDeal, SagePipelineStage,
  SagePipeline, WorkspaceMemberSummary, SageTicket,
} from '@/lib/types'

type DealWithStage = SageDeal & {
  pipeline_id: string | null
  stage: { name: string; color: string } | null
}

type TicketWithContact = SageTicket & {
  contact: Pick<SageContact, 'id' | 'name' | 'email'> | null
}

interface Props {
  contact:       SageContact
  activity:      SageActivityLog[]
  deals:         DealWithStage[]
  tickets:       TicketWithContact[]
  firstPipeline: { id: string; name: string; stages: SagePipelineStage[] } | null
  allPipelines:  Pick<SagePipeline, 'id' | 'name'>[]
  members:       WorkspaceMemberSummary[]
  ownerEmail:    string
  prevId:        string | null
  nextId:        string | null
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  won:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
}

const TICKET_STATUS_COLOR: Record<string, string> = {
  open:        'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  in_progress: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  pending:     'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  resolved:    'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  closed:      'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',
}

const TICKET_PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  high:   'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  low:    'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400',
}

function formatCurrency(value: number | null, currency: string) {
  if (!value) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function eventLabel(eventType: string) {
  const map: Record<string, string> = {
    contact_created: 'Contact was created',
    contact_updated: 'Contact details updated',
    deal_created:    'Deal created',
    stage_changed:   'Deal moved to a new stage',
    ticket_created:  'Ticket opened',
    note_added:      'Note added',
  }
  return map[eventType] ?? eventType.replace(/_/g, ' ')
}

export function ContactDetailClient({
  contact, activity, deals, tickets,
  firstPipeline, allPipelines, members, ownerEmail,
  prevId, nextId,
}: Props) {
  const router = useRouter()
  const [activityOpen, setActivityOpen]         = useState(true)
  const [selectedDealId, setSelectedDealId]     = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [emailOpen, setEmailOpen]               = useState(false)
  const [newTicketOpen, setNewTicketOpen]       = useState(false)

  const firstStages = firstPipeline
    ? [...(firstPipeline.stages ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : []

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) ?? null
  const hasDeal = deals.length > 0

  return (
    <div className="flex h-[calc(100vh-57px)] w-full gap-3 p-3 bg-[#f5f4f1] dark:bg-[#1c1c1c]">

      {/* ── Left info panel ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8 overflow-hidden">
        <div className="px-4 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{contact.name}</h2>
            <Link href="/sage/contacts" className="text-sm text-white hover:opacity-70 transition-opacity">← Back</Link>
          </div>
          {contact.company_name && (
            <p className="text-sm text-white mt-0.5">{contact.company_name}</p>
          )}
        </div>

        {/* Contact details list */}
        <div className="px-4 py-3 border-b dark:border-white/8 space-y-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Contact Info</p>
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 hover:text-[#15A4AE] transition-colors">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 hover:text-[#15A4AE] transition-colors">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{contact.phone}</span>
            </a>
          )}
          {contact.company_name && (
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{contact.company_name}</span>
            </div>
          )}
          {contact.title && (
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{contact.title}</span>
            </div>
          )}
          {contact.website_url && (
            <a href={contact.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 hover:text-[#15A4AE] transition-colors">
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{contact.website_url.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {(contact.city || contact.country) && (
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Key info */}
        <div className="px-4 py-3 border-b dark:border-white/8 space-y-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Key Information</p>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Contact Type</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 capitalize">{(contact.contact_type ?? 'potential_customer').replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Source</p>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {contact.source === 'mailchimp'      ? 'Mailchimp' :
               contact.source === 'activecampaign' ? 'ActiveCampaign' :
               contact.source === 'chat'           ? 'Chat / Bot' :
               contact.source === 'import'         ? 'CSV Import' : 'Manual'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Assigned To</p>
            {(() => {
              const m = members.find(m => m.user_id === contact.assigned_to)
              return m
                ? <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{m.name || m.email}</p>
                : <p className="text-xs text-gray-400 italic">Unassigned</p>
            })()}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Created</p>
            <p className="text-xs text-gray-700 dark:text-gray-300">{timeAgo(contact.created_at)}</p>
          </div>
          {contact.last_contacted_at && (
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Last Contacted</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{timeAgo(contact.last_contacted_at)}</p>
            </div>
          )}
          {contact.value != null && (
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Deal Value</p>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(contact.value, 'USD')}</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="px-4 py-3 border-b dark:border-white/8">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400">
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* ── Center: main content ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#232323] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8">
        {/* Toolbar */}
        <div className="shrink-0 bg-[#141c2b] border-b border-white/10 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">Contacts</span>
            <span className="text-sm text-white/50">/</span>
            <span className="text-sm font-medium text-white">{contact.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Prev / Next navigation */}
            <div className="flex items-center border border-white/20 rounded-lg overflow-hidden">
              <button
                onClick={() => prevId && router.push(`/sage/contacts/${prevId}`)}
                disabled={!prevId}
                title="Previous contact"
                className="p-1.5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-white/20"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nextId && router.push(`/sage/contacts/${nextId}`)}
                disabled={!nextId}
                title="Next contact"
                className="p-1.5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── Name / company hero card ── */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-[#15A4AE]">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">{contact.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  {contact.title && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{contact.title}</span>
                  )}
                  {contact.company_name && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Building2 className="w-3 h-3" /> {contact.company_name}
                    </span>
                  )}
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {contact.email && (
                  <button
                    onClick={() => setEmailOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                  </button>
                )}
                <ContactActionsClient
                  contact={contact}
                  pipelineId={firstPipeline?.id ?? null}
                  stages={firstStages}
                  allPipelines={allPipelines}
                  ownerName={ownerEmail}
                  members={members}
                />
              </div>
            </div>

            {/* Source badge */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t dark:border-white/8">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                contact.source === 'mailchimp'      ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' :
                contact.source === 'activecampaign' ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' :
                contact.source === 'chat'           ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-400'
              }`}>
                {contact.source === 'mailchimp' ? 'Mailchimp' :
                 contact.source === 'activecampaign' ? 'ActiveCampaign' :
                 contact.source === 'chat' ? 'Chat / Bot' :
                 contact.source === 'import' ? 'CSV Import' : 'Manual'}
              </span>
              <span className="text-[10px] text-gray-400">Added {timeAgo(contact.created_at)}</span>
              {contact.source_conversation_id && (
                <a href={`/conversations/${contact.source_conversation_id}`} className="text-[10px] text-[#15A4AE] hover:underline ml-auto">
                  View conversation →
                </a>
              )}
            </div>
          </div>

          {/* ── AI Analysis ── */}
          <ContactAiAnalysis
            contactId={contact.id}
            initialSummary={contact.ai_summary ?? null}
            analyzedAt={contact.ai_analyzed_at ?? null}
          />

          {/* ── Deals + Tickets row ── */}
          <div className="grid grid-cols-2 gap-5">
            {/* Deals */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
              <div className="px-4 py-3 border-b dark:border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Deals ({deals.length})</h3>
                </div>
                {hasDeal ? (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const d = deals[0]
                      const pipeline = allPipelines.find(p => p.id === d.pipeline_id)
                      return (
                        <>
                          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {d.status === 'won' && <CheckCircle2 className="w-3 h-3" />}
                            {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                          </span>
                          {pipeline && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{pipeline.name}</span>
                          )}
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <button className="flex items-center gap-0.5 text-[10px] text-[#15A4AE] hover:text-[#129aa4] transition-colors font-medium">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              <div className="divide-y dark:divide-white/8 flex-1">
                {deals.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-gray-400 text-center">No deals linked yet.</p>
                ) : deals.map(deal => (
                  <button
                    key={deal.id}
                    onClick={() => setSelectedDealId(deal.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{deal.title}</p>
                      {deal.stage && (
                        <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: deal.stage.color }} />
                          {deal.stage.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(deal.value, deal.currency)}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[deal.status] ?? ''}`}>
                        {deal.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col">
              <div className="px-4 py-3 border-b dark:border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TicketIcon className="w-3.5 h-3.5 text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Tickets ({tickets.length})</h3>
                </div>
                <button
                  onClick={() => setNewTicketOpen(true)}
                  className="flex items-center gap-0.5 text-[10px] text-[#15A4AE] hover:text-[#129aa4] transition-colors font-medium"
                >
                  <Plus className="w-3 h-3" /> Add ticket
                </button>
              </div>
              <div className="divide-y dark:divide-white/8 flex-1">
                {tickets.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-gray-400 text-center">No tickets linked yet.</p>
                ) : tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{ticket.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(ticket.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TICKET_STATUS_COLOR[ticket.status] ?? ''}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TICKET_PRIORITY_COLOR[ticket.priority] ?? ''}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Right panel: Activity feed ─────────────────────────────── */}
      {activityOpen ? (
        <div className="w-64 shrink-0 flex flex-col overflow-hidden bg-white dark:bg-[#242424] rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/8">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#141c2b] border-b border-white/10 shrink-0">
              <span className="text-sm font-semibold text-white">Activity</span>
              <button
                onClick={() => setActivityOpen(false)}
                title="Collapse activity"
                className="p-1 rounded text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {/* Feed */}
            <div className="flex-1 overflow-y-auto px-3 py-1">
              {activity.length === 0 ? (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-8">No activity yet.</p>
              ) : activity.map(a => {
                const source =
                  a.event_type.startsWith('deal')   || a.event_type === 'stage_changed' ? 'deal' :
                  a.event_type.startsWith('ticket')  ? 'ticket' :
                  a.event_type === 'note_added'      ? 'note' : 'contact'
                const sourceCls =
                  source === 'deal'    ? 'bg-[#15A4AE]/10 text-[#15A4AE]' :
                  source === 'ticket'  ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                  source === 'note'    ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300' :
                                        'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
                const time = new Date(a.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                return (
                  <div key={a.id} className="flex items-start gap-2 py-2 border-b dark:border-white/6 last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${sourceCls}`}>
                        {source}
                      </span>
                      <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-snug mt-0.5">
                        {eventLabel(a.event_type)}
                      </p>
                      {a.payload && typeof a.payload === 'object' && 'note' in a.payload && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                          {String((a.payload as Record<string, unknown>).note)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">{time}</span>
                  </div>
                )
              })}
            </div>
        </div>
      ) : (
        <div
          className="w-8 shrink-0 flex flex-col items-center py-4 gap-3 cursor-pointer hover:bg-[#ede9e2] dark:hover:bg-white/4 transition-colors rounded-2xl bg-white dark:bg-[#242424] border border-gray-200/60 dark:border-white/8 shadow-xl"
          onClick={() => setActivityOpen(true)}
          title="Show activity"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-180" />
          <span
            className="text-[10px] text-gray-400 font-medium select-none"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.05em' }}
          >
            Activity
          </span>
        </div>
      )}

      {/* Deal slide-over */}
      <DealSlideOver
        dealId={selectedDealId}
        onClose={() => setSelectedDealId(null)}
      />

      {/* Ticket slide-over */}
      {selectedTicket && (
        <TicketSlideOver
          ticket={selectedTicket}
          onClose={() => setSelectedTicketId(null)}
        />
      )}

      {/* New ticket modal */}
      {newTicketOpen && (
        <TicketModal
          contacts={[{ id: contact.id, name: contact.name }]}
          onClose={() => setNewTicketOpen(false)}
        />
      )}

      {/* Email compose modal */}
      {emailOpen && contact.email && (
        <EmailComposeModal
          to={contact.email}
          toName={contact.name}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </div>
  )
}
