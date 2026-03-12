import { createClient }   from '@/lib/supabase/server'
import { redirect }        from 'next/navigation'
import { EmailInbox }      from '@/components/sage/email-inbox'
import type { Metadata }   from 'next'
import type { WorkspaceMember, SageEmail } from '@/lib/types'

export const metadata: Metadata = { title: 'Emails · Sage' }

export default async function SageEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ autoSync?: string; syncing?: string }>
}) {
  const { autoSync, syncing } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(plan)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const membership = membershipRaw as (Pick<WorkspaceMember, 'workspace_id'> & { workspaces: { plan: string } }) | null
  if (!membership) redirect('/login')

  // Pro+ gate
  const allowedPlans = ['pro', 'scale', 'enterprise']
  if (!allowedPlans.includes(membership.workspaces?.plan ?? '')) redirect('/settings/upgrade')

  const workspaceId = membership.workspace_id

  // Fetch emails for this user only
  const { data: emailsRaw } = await supabase
    .from('sage_emails')
    .select('*, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .order('received_at', { ascending: false })
    .limit(100)

  const emails = (emailsRaw ?? []) as SageEmail[]

  // Detect connected email provider for this user
  const { data: emailIntegration } = await supabase
    .from('sage_integrations')
    .select('provider')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .in('provider', ['gmail', 'microsoft'])
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle()
  const emailProvider = ((emailIntegration as { provider?: string } | null)?.provider ?? null) as 'gmail' | 'microsoft' | null

  // Check if Stripe is connected (workspace-level)
  const { data: stripeIntegration } = await supabase
    .from('sage_integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('provider', 'stripe')
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle()

  const stripeConnected = !!stripeIntegration

  // Build contact → deals map for proposal generation
  const { data: dealsRaw } = await supabase
    .from('sage_deals')
    .select('id, title, contact_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'open')
    .not('contact_id', 'is', null)

  const contactDeals: Record<string, { id: string; title: string }[]> = {}
  for (const d of (dealsRaw ?? []) as { id: string; title: string; contact_id: string }[]) {
    if (!contactDeals[d.contact_id]) contactDeals[d.contact_id] = []
    contactDeals[d.contact_id].push({ id: d.id, title: d.title })
  }

  return (
    <EmailInbox
      initialEmails={emails}
      workspaceId={workspaceId}
      stripeConnected={stripeConnected}
      contactDeals={contactDeals}
      emailProvider={emailProvider}
      autoSync={autoSync === '1' || syncing === '1'}
    />
  )
}
