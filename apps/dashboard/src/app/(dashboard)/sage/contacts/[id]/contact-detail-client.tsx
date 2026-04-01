'use client'

import { useState } from 'react'
import {
  Mail, Phone, Building2, Briefcase, Globe, MapPin, Tag,
  ChevronLeft, PanelRight, Plus, Clock, Activity,
  DollarSign, Ticket as TicketIcon,
} from 'lucide-react'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'
import { ContactActionsClient } from '@/components/sage/contact-actions-client'
import { ContactAiAnalysis } from '@/components/sage/contact-ai-analysis'
import { DealSlideOver } from '@/components/sage/deal-slide-over'
import { TicketSlideOver } from '@/components/dashboard/ticket-slide-over'
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
  contact:      SageContact
  activity:     SageActivityLog[]
  deals:        DealWithStage[]
  tickets:      TicketWithContact[]
  firstPipeline: { id: string; name: string; stages: SagePipelineStage[] } | null
  allPipelines: Pick<SagePipeline, 'id' | 'name'>[]
  members:      WorkspaceMemberSummary[]
  ownerEmail:   string
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
  urgent: 'bg-red-50 text-red-700',
  high:   'bg-orange-50 text-orange-700',
  medium: 'bg-amber-50 text-amber-700',
  low:    'bg-gray-100 text-gray-600',
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
}: Props) {
  const [activityOpen, setActivityOpen]   = useState(false)
  const [selectedDealId, setSelectedDealId]     = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  const firstStages = firstPipeline
    ? [...(firstPipeline.stages ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : []

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) ?? null

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Left panel: Contact info ──────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r dark:border-white/8 bg-white dark:bg-[#1a1a1a] overflow-y-auto flex flex-col">
        {/* Back */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/sage/contacts"
            className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> All Contacts
          </Link>
        </div>

        {/* Avatar + name */}
        <div className="px-4 py-4 border-b dark:border-white/8">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#15A4AE]/15 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-[#15A4AE]">
                {contact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{contact.name}</h1>
              {contact.title && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{contact.title}</p>}
              {contact.company_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" /> {contact.company_name}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3">
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

        {/* Contact details */}
        <div className="px-4 py-4 border-b dark:border-white/8 space-y-3">
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
        <div className="px-4 py-4 border-b dark:border-white/8 space-y-3">
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
          <div className="px-4 py-4 border-b dark:border-white/8">
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
          <div className="px-4 py-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{contact.notes}</p>
          </div>
        )}
      </aside>

      {/* ── Center: main content ──────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#141414]">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1a1a1a] border-b dark:border-white/8 px-6 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{contact.name}</h2>
          <button
            onClick={() => setActivityOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <PanelRight className="w-4 h-4" />
            {activityOpen ? 'Hide Activity' : 'Activity'}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Analysis */}
          <ContactAiAnalysis
            contactId={contact.id}
            initialSummary={contact.ai_summary ?? null}
            analyzedAt={contact.ai_analyzed_at ?? null}
          />

          {/* Deals */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
            <div className="px-5 py-3.5 border-b dark:border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Deals ({deals.length})</h3>
              </div>
              <button className="flex items-center gap-1 text-xs text-[#15A4AE] hover:text-[#129aa4] transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="divide-y dark:divide-white/8">
              {deals.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No deals linked yet.</p>
              ) : deals.map(deal => (
                <button
                  key={deal.id}
                  onClick={() => setSelectedDealId(deal.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{deal.title}</p>
                    {deal.stage && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: deal.stage.color }} />
                        {deal.stage.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
          <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
            <div className="px-5 py-3.5 border-b dark:border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TicketIcon className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tickets ({tickets.length})</h3>
              </div>
              <button className="flex items-center gap-1 text-xs text-[#15A4AE] hover:text-[#129aa4] transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="divide-y dark:divide-white/8">
              {tickets.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No tickets linked yet.</p>
              ) : tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(ticket.created_at)}</p>
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
      </main>

      {/* ── Right panel: Activity feed ─────────────────────────────── */}
      {activityOpen && (
        <aside className="w-80 shrink-0 border-l dark:border-white/8 bg-white dark:bg-[#1a1a1a] overflow-y-auto flex flex-col">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity</h3>
          </div>
          <div className="divide-y dark:divide-white/8">
            {activity.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No activity recorded yet.</p>
            ) : activity.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{eventLabel(a.event_type)}</p>
                  {a.payload && typeof a.payload === 'object' && 'note' in a.payload && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{String((a.payload as Record<string, unknown>).note)}</p>
                  )}
                  <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                    <Clock className="w-2.5 h-2.5" /> {timeAgo(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
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
    </div>
  )
}
