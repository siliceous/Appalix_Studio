import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
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
    .order('created_at', { ascending: true })
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
    <div className="max-w-5xl mx-auto">
      <Header
        title="All Leads"
        description="Leads captured from connected ad platforms"
        action={
          <Link
            href="/forms/sources"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Connect Platform
          </Link>
        }
      />

      <LeadsClient leads={leads} />
    </div>
  )
}
