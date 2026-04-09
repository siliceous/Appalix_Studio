import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { NewSourceForm, type SourceType } from './new-source-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add source' }

// Which source types each plan tier unlocks (cumulative)
const PLAN_ALLOWED: Record<string, SourceType[]> = {
  starter:    ['url'],
  core:       ['url', 'text'],
  pro:        ['url', 'text', 'file', 'excel', 'csv', 'notion', 'gitbook', 'google_drive', 'dropbox', 'onedrive', 'sharepoint'],
  scale:      ['url', 'text', 'file', 'excel', 'csv', 'notion', 'gitbook', 'google_drive', 'dropbox', 'onedrive', 'sharepoint'],
  enterprise: ['url', 'text', 'file', 'excel', 'csv', 'notion', 'gitbook', 'google_drive', 'dropbox', 'onedrive', 'sharepoint'],
}

export default async function NewSourcePage() {
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

  const { data: workspaceRaw } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', membership.workspace_id)
    .single()
  const plan = (workspaceRaw as { plan: string } | null)?.plan ?? 'starter'

  const allowedTypes: SourceType[] = PLAN_ALLOWED[plan] ?? ['url']

  // Check if user has connected Google Drive via OAuth
  const admin = createAdminClient()
  const { data: gdriveRow } = await admin
    .from('sage_integrations' as never)
    .select('status, config')
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', user.id)
    .eq('provider', 'google_drive')
    .maybeSingle() as unknown as { data: { status: string; config: { google_email?: string } } | null }
  const gdriveConnected = gdriveRow?.status === 'connected'
  const gdriveEmail     = gdriveRow?.config?.google_email ?? null

  return (
    <div className="max-w-2xl mx-auto">
      <Header
        title="Add source"
        description="Train your bot with a website, document, or custom text"
      />
      <NewSourceForm
        allowedTypes={allowedTypes}
        gdriveConnected={gdriveConnected}
        gdriveEmail={gdriveEmail}
      />
    </div>
  )
}
