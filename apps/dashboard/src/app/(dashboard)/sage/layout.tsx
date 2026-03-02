import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SageRightPanel } from '@/components/sage/sage-right-panel'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'
import type { Workspace } from '@/lib/types'

export default async function SageLayout({ children }: { children: React.ReactNode }) {
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
      <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center relative overflow-hidden -m-8">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#61c2ad]/[0.06] blur-[120px] dark:block hidden" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-[#61c2ad]/[0.04] blur-[100px] dark:block hidden" />
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-[#61c2ad]/10 border border-brand-200 dark:border-[#61c2ad]/20 flex items-center justify-center mb-6 relative z-10">
          <Sparkles className="w-7 h-7 text-brand-600 dark:text-[#61c2ad]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 relative z-10">Appalix Sage</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mb-8 leading-relaxed relative z-10">
          Turn chat leads into tracked deals, automated follow-ups, and invoices — all powered by AI.
          Available on <strong>Pro</strong> plans and above.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
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
      {/* Center content */}
      <div className="flex-1 h-full overflow-auto bg-gray-50 dark:bg-[#1c1c1c]">
        {children}
      </div>

      {/* Right AI panel */}
      <SageRightPanel workspaceId={workspace.id} />
    </div>
  )
}
