import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { SageRightPanel } from '@/components/sage/sage-right-panel'
import { createWorkspace } from '@/app/actions/workspace'
import type { Workspace } from '@/lib/types'

// All dashboard pages are user-specific and require live DB access — never statically render.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Confirm user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load the first workspace this user belongs to
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const raw = membership as unknown as { workspaces: Workspace } | null
  const workspace = raw?.workspaces ?? null

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Set up your workspace</h2>
          <p className="text-sm text-gray-500 mb-6">
            Create a workspace to start building your AI chatbots.
          </p>
          <form action={createWorkspace} className="flex flex-col gap-3">
            <input
              name="name"
              type="text"
              defaultValue="My Workspace"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
            <button
              type="submit"
              className="bg-gray-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Create workspace
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#dce3f5] dark:bg-[#1c1c1c] relative">
      {/* Subtle green ambient glow in dark mode */}
      <div className="pointer-events-none fixed top-0 left-60 right-0 h-[300px] dark:bg-[#61c2ad]/[0.03] blur-[80px] hidden dark:block" />
      <Sidebar workspace={workspace} />
      <main className="flex-1 p-8 overflow-auto bg-[#dce3f5] dark:bg-[#1c1c1c]">
        {children}
      </main>
      <SageRightPanel workspaceId={workspace.id} />
    </div>
  )
}
