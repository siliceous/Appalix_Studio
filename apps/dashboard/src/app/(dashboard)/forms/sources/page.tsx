import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { SourcesClient } from './sources-client'
import type { WorkspaceMember, LeadAdSource } from '@/lib/types'

export default async function SourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const { data: sourcesRaw } = await supabase
    .from('lead_ad_sources')
    .select('*')
    .eq('workspace_id', workspaceId)

  const sources = (sourcesRaw ?? []) as LeadAdSource[]

  // Build webhook base URL from request host
  const headersList = await headers()
  const host  = headersList.get('host') ?? 'appalix.ai'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 bg-white dark:bg-[#232323] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sources</h1>
          <p className="text-xs text-gray-400 mt-0.5">Connect ad platforms to receive leads automatically</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <SourcesClient
          sources={sources}
          workspaceId={workspaceId}
          baseUrl={baseUrl}
        />
      </div>
    </div>
  )
}
