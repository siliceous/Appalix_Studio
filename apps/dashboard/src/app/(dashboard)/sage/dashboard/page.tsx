import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Kanban, Ticket, TrendingUp, Activity, Clock, Mail } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageDeal, SageActivityLog, SageEmail } from '@/lib/types'

export const metadata: Metadata = { title: 'Sage Dashboard' }

export default async function SageDashboardPage() {
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalContacts },
    { count: newContactsToday },
    { count: openTickets },
    { count: totalDeals },
    { count: unreadEmails },
    { data: recentDealsRaw },
    { data: recentActivityRaw },
    { data: recentEmailsRaw },
  ] = await Promise.all([
    supabase.from('sage_contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('sage_contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', today.toISOString()),
    supabase.from('sage_tickets').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'open'),
    supabase.from('sage_deals').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'open'),
    supabase.from('sage_emails').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('direction', 'inbound').eq('is_read', false).eq('is_trashed', false),
    supabase.from('sage_deals').select('id, title, value, currency, status, created_at, stage:sage_pipeline_stages(name, color)').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(5),
    supabase.from('sage_activity_log').select('id, entity_type, event_type, payload, created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(8),
    supabase.from('sage_emails').select('id, subject, from_name, from_address, received_at, ai_priority, is_read').eq('workspace_id', workspaceId).eq('direction', 'inbound').eq('is_trashed', false).order('received_at', { ascending: false }).limit(5),
  ])

  const recentDeals    = (recentDealsRaw    ?? []) as (SageDeal & { stage: { name: string; color: string } | null })[]
  const recentActivity = (recentActivityRaw ?? []) as SageActivityLog[]
  const recentEmails   = (recentEmailsRaw   ?? []) as Pick<SageEmail, 'id' | 'subject' | 'from_name' | 'from_address' | 'received_at' | 'ai_priority' | 'is_read'>[]

  const stats = [
    { label: 'Total Contacts', value: totalContacts    ?? 0, icon: Users,     color: 'text-blue-600',   bg: 'bg-blue-50  dark:bg-blue-500/10'   },
    { label: 'New Today',      value: newContactsToday ?? 0, icon: TrendingUp, color: 'text-brand-600 dark:text-[#61c2ad]', bg: 'bg-brand-50 dark:bg-[#61c2ad]/10' },
    { label: 'Open Deals',     value: totalDeals       ?? 0, icon: Kanban,    color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Open Tickets',   value: openTickets      ?? 0, icon: Ticket,    color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10' },
    { label: 'Unread Emails',  value: unreadEmails     ?? 0, icon: Mail,      color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-500/10'  },
  ]

  function formatCurrency(value: number | null, currency: string) {
    if (!value) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  }

  function eventLabel(eventType: string) {
    const map: Record<string, string> = {
      contact_created: 'New contact added',
      contact_updated: 'Contact updated',
      deal_created:    'New deal created',
      stage_changed:   'Deal moved to new stage',
      status_changed:  'Status updated',
      ticket_created:  'New ticket opened',
      note_added:      'Note added',
    }
    return map[eventType] ?? eventType.replace(/_/g, ' ')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sage Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your leads and pipeline at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
              <div className={`${s.bg} ${s.color} p-2 rounded-lg`}>
                <s.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
        {/* Recent deals */}
        <div className="xl:col-span-3 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Deals</h2>
            <Link href="/sage/pipelines" className="text-xs text-brand-600 dark:text-[#61c2ad] hover:underline">
              View pipelines
            </Link>
          </div>
          <div className="divide-y dark:divide-white/8">
            {recentDeals.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-400">No deals yet.</p>
                <Link href="/sage/pipelines" className="text-xs text-brand-600 dark:text-[#61c2ad] hover:underline mt-1 block">
                  Create your first pipeline →
                </Link>
              </div>
            )}
            {recentDeals.map(deal => (
              <div key={deal.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{deal.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {deal.stage && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: deal.stage.color }} />
                        {deal.stage.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(deal.value, deal.currency)}
                  </p>
                  <p className="text-xs text-gray-400">{timeAgo(deal.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="xl:col-span-2 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
          <div className="px-5 py-4 border-b dark:border-white/8 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
          </div>
          <div className="divide-y dark:divide-white/8">
            {recentActivity.length === 0 && (
              <p className="px-5 py-10 text-sm text-gray-400 text-center">No activity yet.</p>
            )}
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-[#61c2ad] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300">{eventLabel(a.event_type)}</p>
                  <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Emails */}
      <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 mb-6">
        <div className="px-5 py-4 border-b dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Emails</h2>
            {(unreadEmails ?? 0) > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400">
                {unreadEmails} unread
              </span>
            )}
          </div>
          <Link href="/sage/emails" className="text-xs text-brand-600 dark:text-[#61c2ad] hover:underline">
            Open inbox
          </Link>
        </div>
        <div className="divide-y dark:divide-white/8">
          {recentEmails.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No emails yet.</p>
              <Link href="/sage/integrations" className="text-xs text-brand-600 dark:text-[#61c2ad] hover:underline mt-1 block">
                Connect Gmail or Outlook →
              </Link>
            </div>
          )}
          {recentEmails.map(email => (
            <Link key={email.id} href="/sage/emails" className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${!email.is_read ? 'bg-green-500' : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${!email.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  {email.from_name ?? email.from_address}
                </p>
                <p className="text-xs text-gray-400 truncate">{email.subject}</p>
              </div>
              <p className="text-[11px] text-gray-400 shrink-0">{timeAgo(email.received_at)}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/sage/contacts',  label: 'Add Contact',    icon: Users   },
          { href: '/sage/pipelines', label: 'View Pipelines', icon: Kanban  },
          { href: '/sage/tickets',   label: 'Open Tickets',   icon: Ticket  },
          { href: '/sage/emails',    label: 'Open Inbox',     icon: Mail    },
        ].map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 hover:border-brand-200 dark:hover:border-[#61c2ad]/30 transition-colors group"
          >
            <a.icon className="w-4 h-4 text-gray-400 group-hover:text-brand-600 dark:group-hover:text-[#61c2ad] transition-colors" />
            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
