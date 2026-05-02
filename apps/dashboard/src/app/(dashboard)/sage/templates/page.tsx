import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { AutomationTabBar } from '@/components/dashboard/automation-side-tabs'
import { TemplatesClient } from './templates-client'
import { listSageEmailTemplates } from '@/app/actions/sage-email-templates'
import type { WorkspaceMemberRole } from '@/lib/types'
import { ROLE_RANK } from '@/lib/types'

export const metadata: Metadata = { title: 'Templates · Sage' }

export default async function TemplatesPage() {
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

  if (!membershipRaw) redirect('/login')
  const membership = membershipRaw as { workspace_id: string; role: WorkspaceMemberRole }

  const callerRank = ROLE_RANK[membership.role] ?? 0
  const canWrite   = callerRank >= ROLE_RANK.member

  const templates = await listSageEmailTemplates({ includeSystem: true })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SageToolbar pageKey="templates" />
      <AutomationTabBar />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <TemplatesClient
          templates={templates}
          canWrite={canWrite}
        />
      </div>
    </div>
  )
}
