import type { Metadata } from 'next'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SageToolbar } from '@/components/dashboard/sage-toolbar'
import { BrandingClient } from './branding-client'
import { listFormTemplates } from '@/app/actions/forms'

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
  const admin = createAdminClient()

  const [
    { data: profilesRaw },
    { data: assetsRaw },
    { data: sessionsRaw },
    { data: candidatesRaw },
    templates,
  ] = await Promise.all([
    supabase
      .from('brand_profiles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),

    supabase
      .from('brand_assets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_archived', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    admin
      .from('brand_scan_sessions')
      .select('id, brand_profile_id, website_url, status, is_ecommerce, new_asset_count, scan_summary, created_at, completed_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30),

    admin
      .from('brand_asset_candidates')
      .select('id, brand_profile_id, scan_session_id, asset_type, asset_role, title, value, source_url, metadata, status, created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'candidate')
      .order('created_at', { ascending: false }),

    listFormTemplates(),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SageToolbar pageKey="branding" />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <BrandingClient
          userId={user.id}
          profiles={profilesRaw ?? []}
          assets={assetsRaw ?? []}
          sessions={(sessionsRaw ?? []) as Parameters<typeof BrandingClient>[0]['sessions']}
          candidates={(candidatesRaw ?? []) as Parameters<typeof BrandingClient>[0]['candidates']}
          templates={templates}
        />
      </div>
    </div>
  )
}
