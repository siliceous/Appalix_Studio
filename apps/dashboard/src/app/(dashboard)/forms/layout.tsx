import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Inbox, Zap } from 'lucide-react'
import { SageRightPanel } from '@/components/sage/sage-right-panel'
import type { Workspace } from '@/lib/types'

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const raw       = membershipRaw as unknown as { workspaces: Workspace } | null
  const workspace = raw?.workspaces ?? null
  if (!workspace) redirect('/dashboard')

  const isPro = ['pro', 'scale', 'enterprise'].includes(workspace.plan)

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-[#61c2ad]/10 border border-brand-200 dark:border-[#61c2ad]/20 flex items-center justify-center mb-6">
          <Inbox className="w-7 h-7 text-brand-600 dark:text-[#61c2ad]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Lead Ad Forms</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
          Capture leads from Meta, Google Ads, and more — automatically scored and pushed into your CRM pipeline.
          Available on <strong>Pro</strong> plans and above.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/settings/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors text-sm"
          >
            <Zap className="w-4 h-4" />
            Upgrade to Pro
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium rounded-xl transition-colors text-sm"
          >
            Back to overview
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-0px)] -m-8 overflow-hidden">
      <div className="flex-1 h-full overflow-auto bg-gray-50 dark:bg-[#1c1c1c]">
        {children}
      </div>
      <SageRightPanel workspaceId={workspace.id} />
    </div>
  )
}
