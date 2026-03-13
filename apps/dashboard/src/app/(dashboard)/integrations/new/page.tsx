import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewIntegrationForm } from './new-integration-form'
import type { Metadata } from 'next'
import type { Platform } from '@/lib/types'

export const metadata: Metadata = { title: 'Add integration' }

export default async function NewIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>
}) {
  const { platform: qp } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: rawBots } = await supabase
    .from('bots').select('id, name').eq('workspace_id', membership.workspace_id).order('created_at', { ascending: false })
  const bots = (rawBots ?? []) as { id: string; name: string }[]

  const validPlatforms = ['web_widget','custom_api','slack','wordpress','facebook_messenger','whatsapp','google_chat','telegram']
  const selected = (validPlatforms.includes(qp ?? '') ? qp : 'web_widget') as Platform

  return <NewIntegrationForm bots={bots} defaultPlatform={selected} />
}
