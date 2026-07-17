import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember } from '@/lib/types'
import { getRoiMetrics, type RoiPeriod } from '@/app/actions/roi-metrics'
import { ROIDashboard } from '@/components/dashboard/roi-dashboard'

export const metadata: Metadata = { title: 'ROI & Performance' }

export default async function RoiPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id' | 'role'> | null
  if (!membership) redirect('/login')

  const { period: rawPeriod } = await searchParams
  const period = (['7d', '30d', '90d', 'all'].includes(rawPeriod ?? '') ? rawPeriod : '30d') as RoiPeriod

  const metrics = await getRoiMetrics(membership.workspace_id, period)

  return <ROIDashboard metrics={metrics} />
}
