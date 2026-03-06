import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Mail, Phone, Tag, Activity, Clock } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { ContactActionsClient } from '@/components/sage/contact-actions-client'
import type { WorkspaceMember, SageContact, SageActivityLog, SageDeal, SagePipelineStage, SagePipeline } from '@/lib/types'

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership  = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const [
    { data: contactRaw },
    { data: activityRaw },
    { data: dealsRaw },
    { data: pipelinesRaw },
  ] = await Promise.all([
    supabase.from('sage_contacts').select('*').eq('id', id).eq('workspace_id', workspaceId).single(),
    supabase.from('sage_activity_log').select('*').eq('entity_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('sage_deals')
      .select('id, title, value, currency, status, pipeline_id, stage:sage_pipeline_stages(name, color), created_at')
      .eq('contact_id', id).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('sage_pipelines')
      .select('id, name, stages:sage_pipeline_stages(id, name, color, position)')
      .eq('workspace_id', workspaceId).order('created_at', { ascending: true }),
  ])

  if (!contactRaw) notFound()

  const contact  = contactRaw as SageContact
  const activity = (activityRaw ?? []) as SageActivityLog[]
  const deals    = (dealsRaw ?? []) as (SageDeal & { pipeline_id: string | null; stage: { name: string; color: string } | null })[]

  const firstPipeline  = (pipelinesRaw?.[0] ?? null) as ({ id: string; name: string; stages: SagePipelineStage[] } | null)
  const allPipelines   = ((pipelinesRaw ?? []) as { id: string; name: string }[]).map(p => ({ id: p.id, name: p.name })) as Pick<SagePipeline, 'id' | 'name'>[]
  const firstStages    = firstPipeline
    ? ([...(firstPipeline.stages ?? [])] as SagePipelineStage[]).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : []

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

  function formatCurrency(value: number | null, currency: string) {
    if (!value) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  }

  const statusColor: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    won:  'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/sage/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        All Contacts
      </Link>

      {/* Contact card */}
      <div className="bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-[#61c2ad]/15 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-brand-700 dark:text-[#61c2ad]">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{contact.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-[#61c2ad] transition-colors">
                  <Phone className="w-3.5 h-3.5" /> {contact.phone}
                </a>
              )}
            </div>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {contact.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400">
                    <Tag className="w-2.5 h-2.5" /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xs text-gray-400">Added {timeAgo(contact.created_at)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 capitalize">
              {contact.source}
            </span>
            <ContactActionsClient
              contact={contact}
              pipelineId={firstPipeline?.id ?? null}
              stages={firstStages}
              allPipelines={allPipelines}
              ownerName={user.email ?? ''}
            />
          </div>
        </div>
        {contact.notes && (
          <div className="mt-4 pt-4 border-t dark:border-white/8">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{contact.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Deals ({deals.length})</h2>
          </div>
          <div className="divide-y dark:divide-white/8">
            {deals.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No deals linked to this contact.</p>
            ) : deals.map(deal => (
              <Link
                key={deal.id}
                href={deal.pipeline_id ? `/sage/pipelines/${deal.pipeline_id}` : '#'}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[deal.status] ?? ''}`}>
                    {deal.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity timeline */}
        <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity</h2>
          </div>
          <div className="divide-y dark:divide-white/8 max-h-80 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No activity recorded yet.</p>
            ) : activity.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-[#61c2ad] mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{eventLabel(a.event_type)}</p>
                  <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                    <Clock className="w-2.5 h-2.5" /> {timeAgo(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
