import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageTicket, SageContact } from '@/lib/types'
import { TicketsDashboard } from '@/components/dashboard/tickets-dashboard'
import Link from 'next/link'
import { LayoutDashboard, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Tickets' }

export default async function TicketsPage() {
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

  const { data } = await supabase
    .from('sage_tickets')
    .select('*, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50)
  const tickets = (data ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <nav className="px-6 py-2.5 border-b dark:border-white/8 bg-white dark:bg-[#1c1c1c] flex items-center gap-1.5 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Overview
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Tickets</span>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <TicketsDashboard tickets={tickets} />
      </div>
    </div>
  )
}
