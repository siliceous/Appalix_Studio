import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CopilotChat } from '@/components/copilot/copilot-chat'
import type { Workspace } from '@/lib/types'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'

export default async function CopilotPage() {
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
      <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mb-6">
          <Sparkles className="w-7 h-7 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Internal AI Copilot</h1>
        <p className="text-gray-500 text-sm max-w-md mb-8 leading-relaxed">
          Give your team an AI assistant that knows your business — searches your knowledge base, drafts documents, and helps everyone work faster.
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
            className="px-6 py-3 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 font-medium rounded-xl transition-colors text-sm"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Load user profile for greeting
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()

  const userName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : (user.email ?? 'there')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-brand-600" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Internal Copilot</h1>
          <p className="text-xs text-gray-400">{workspace.name} · AI assistant for your team</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <CopilotChat
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          userName={userName}
        />
      </div>
    </div>
  )
}
