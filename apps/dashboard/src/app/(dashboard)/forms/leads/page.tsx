import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LeadsClient } from './leads-client'
import type { WorkspaceMember, Lead } from '@/lib/types'

export default async function AllLeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const { data: leadsRaw } = await supabase
    .from('leads')
    .select('*, source:lead_ad_sources(id, platform, name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  const leads = (leadsRaw ?? []) as Lead[]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 bg-white dark:bg-[#232323] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">All Leads</h1>
          <p className="text-xs text-gray-400 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} captured</p>
        </div>
        <Link
          href="/forms/sources"
          className="px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
        >
          + Connect Platform
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <LeadsClient leads={leads} />
      </div>
    </div>
  )
}
