import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { BrandingClient } from './branding-client'

export const metadata: Metadata = { title: 'Branding · Sage' }

export default async function BrandingPage() {
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

  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const workspaceId = membership.workspace_id

  // Fetch all brand profiles for this workspace (workspace brand + client brands)
  const { data: profilesRaw } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  // Fetch all brand assets for this workspace (non-archived, non-deleted)
  // The client filters by brand_profile_id when rendering each profile
  const { data: assetsRaw } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SageToolbar pageKey="branding" />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <BrandingClient
          userId={user.id}
          profiles={profilesRaw ?? []}
          assets={assetsRaw ?? []}
        />
      </div>
    </div>
  )
}
