import { createClient }   from '@/lib/supabase/server'
import { redirect }        from 'next/navigation'
import { EmailInbox }      from '@/components/sage/email-inbox'
import type { Metadata }   from 'next'
import type { WorkspaceMember, SageEmail } from '@/lib/types'

export const metadata: Metadata = { title: 'Emails · Sage' }

export default async function SageEmailsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(plan)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership = membershipRaw as (Pick<WorkspaceMember, 'workspace_id'> & { workspaces: { plan: string } }) | null
  if (!membership) redirect('/login')

  // Pro+ gate
  const allowedPlans = ['pro', 'scale', 'enterprise']
  if (!allowedPlans.includes(membership.workspaces?.plan ?? '')) redirect('/settings/upgrade')

  const { data: emailsRaw } = await supabase
    .from('sage_emails')
    .select('*, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', membership.workspace_id)
    .order('received_at', { ascending: false })
    .limit(100)

  const emails = (emailsRaw ?? []) as SageEmail[]

  return <EmailInbox initialEmails={emails} workspaceId={membership.workspace_id} />
}
