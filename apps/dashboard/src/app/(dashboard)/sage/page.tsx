import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CopilotChat } from '@/components/copilot/copilot-chat'
import type { Workspace } from '@/lib/types'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'

export default async function SagePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const raw       = membership as unknown as { workspaces: Workspace } | null
  const workspace = raw?.workspaces ?? null

  if (!workspace) redirect('/dashboard')

  // Plan gate
  const allowedPlans = ['pro', 'scale', 'enterprise']
  const isPro        = allowedPlans.includes(workspace.plan)

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center relative overflow-hidden">
        {/* Green ambient bubbles (dark mode only) */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#61c2ad]/[0.06] blur-[120px] dark:block hidden" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-[#61c2ad]/[0.04] blur-[100px] dark:block hidden" />

        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-[#61c2ad]/10 border border-brand-200 dark:border-[#61c2ad]/20 flex items-center justify-center mb-6 relative z-10">
          <Sparkles className="w-7 h-7 text-brand-600 dark:text-[#61c2ad]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 relative z-10">Appalix Sage</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mb-8 leading-relaxed relative z-10">
          Give your team an AI assistant that knows your business — searches your knowledge base, drafts documents, and helps everyone work faster.
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
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Load user profile for greeting
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()

  const profile = profileRaw as { first_name: string | null; last_name: string | null } | null

  const userName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : (user.email ?? 'there')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 relative overflow-hidden">
      {/* Green ambient bubbles (dark mode only) */}
      <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[400px] rounded-full bg-[#61c2ad]/[0.05] blur-[140px] dark:block hidden" />
      <div className="pointer-events-none absolute bottom-20 left-0 w-[400px] h-[300px] rounded-full bg-[#61c2ad]/[0.04] blur-[120px] dark:block hidden" />

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white dark:bg-[#232323] dark:border-white/8 shrink-0 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-[#61c2ad]/10 border border-brand-200 dark:border-[#61c2ad]/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-brand-600 dark:text-[#61c2ad]" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sage</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">{workspace.name} · AI assistant for your team</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#1c1c1c] relative z-10">
        <CopilotChat
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          userName={userName}
        />
      </div>
    </div>
  )
}
