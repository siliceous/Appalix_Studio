import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }                        from 'next/navigation'
import { CalendarClient }                  from './calendar-client'
import type { Metadata }                   from 'next'

export const metadata: Metadata = { title: 'Calendar · Sage' }

export default async function CalendarPage() {
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

  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) redirect('/login')

  const admin = createAdminClient()

  type CalRow = { config: { google_email?: string }; status: string } | null
  const { data: calRow } = await (admin as ReturnType<typeof createAdminClient>)
    .from('sage_integrations' as never)
    .select('config, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .maybeSingle() as unknown as { data: CalRow }

  const isConnected = calRow?.status === 'connected'
  const googleEmail = calRow?.config?.google_email ?? ''

  return (
    <CalendarClient
      isConnected={isConnected}
      googleEmail={googleEmail}
    />
  )
}
