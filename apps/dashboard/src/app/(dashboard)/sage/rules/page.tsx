import { createClient } from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import type { Metadata } from 'next'
import { getRules }      from '@/app/actions/sage-rules'
import { RulesManager }  from '@/components/dashboard/rules-manager'

export const metadata: Metadata = { title: 'Automation Rules' }

export default async function RulesPage() {
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

  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) redirect('/login')

  const [rules, pipelinesRes] = await Promise.all([
    getRules(),
    supabase
      .from('sage_pipelines')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
  ])

  type Pipeline = { id: string; name: string }
  const pipelines = (pipelinesRes.data ?? []) as Pipeline[]

  return <RulesManager initialRules={rules} pipelines={pipelines} />
}
