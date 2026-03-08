import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageTicket, SageContact } from '@/lib/types'
import { TicketsDashboard } from '@/components/dashboard/tickets-dashboard'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'

export const metadata: Metadata = { title: 'Tickets' }

function getDateRange(preset: SubpagePreset, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  if (preset === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : null,
      to:   customTo   ? new Date(customTo + 'T23:59:59').toISOString() : null,
    }
  }
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }
  if (preset === 'yesterday') {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to   = new Date(now); to.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: null }
  }
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30)
    return { from: from.toISOString(), to: null }
  }
  return { from: null, to: null }
}

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ preset?: string; from?: string; to?: string }> }) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as SubpagePreset
  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)
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
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  let ticketsQuery = supabase
    .from('sage_tickets')
    .select('*, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
  if (dateFrom) ticketsQuery = ticketsQuery.gte('created_at', dateFrom)
  if (dateTo)   ticketsQuery = ticketsQuery.lt('created_at', dateTo)
  ticketsQuery = ticketsQuery.order('created_at', { ascending: false }).limit(50)

  const { data } = await ticketsQuery
  const tickets = (data ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar sourceKey="tickets" preset={preset} customFrom={params.from} customTo={params.to} autoEnabled={autoSettings.tickets_auto_enabled} />
      <div className="flex flex-1 overflow-hidden">
        <TicketsDashboard tickets={tickets} />
      </div>
    </div>
  )
}
