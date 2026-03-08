import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember } from '@/lib/types'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'
import { FormsDashboard } from '@/components/dashboard/forms-dashboard'
import Link from 'next/link'
import { LayoutDashboard, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Forms' }

export default async function FormsPage() {
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

  const [formsRes, submissionsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('sage_forms').select('id, name, description, is_active, created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('sage_form_submissions').select('id, form_id, fields, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, ai_analyzed_at, actioned_at, action_type, created_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(200),
  ])
  const forms       = (formsRes.data       ?? []) as SageForm[]
  const submissions = (submissionsRes.data ?? []) as SageFormSubmission[]

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <nav className="px-6 py-2.5 border-b dark:border-white/8 bg-white dark:bg-[#1c1c1c] flex items-center gap-1.5 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Overview
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Forms</span>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <FormsDashboard forms={forms} submissions={submissions} />
      </div>
    </div>
  )
}
