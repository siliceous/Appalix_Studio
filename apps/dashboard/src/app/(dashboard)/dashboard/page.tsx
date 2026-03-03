import { createClient } from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageEmail, SageTicket, SageContact, Bot as BotRow } from '@/lib/types'
import { EmailTriageDashboard, type TriageEmail, type TriageRecommendation } from '@/components/dashboard/email-triage-dashboard'
import { BotsDashboard }    from '@/components/dashboard/bots-dashboard'
import { TicketsDashboard } from '@/components/dashboard/tickets-dashboard'
import { FormsDashboard }   from '@/components/dashboard/forms-dashboard'
import { OverviewTabBar }   from '@/components/dashboard/overview-tab-bar'
import { SageRightPanel }   from '@/components/sage/sage-right-panel'

export const metadata: Metadata = { title: 'Overview' }

// Support keywords used to classify an email as a ticket instead of a lead
const SUPPORT_RE = /\b(not working|bug|issue|problem|access|billing|error|broken|down|outage|crash|fail)\b/i

function deriveRecommendation(
  email:          SageEmail,
  matchedContact: { id: string } | null,
  matchedDeal:    { id: string } | null,
): TriageRecommendation {
  // Explicitly low priority → ignore; null/unknown priority treated as medium
  if (email.ai_priority === 'low') return 'ignore'
  const text = `${email.subject} ${email.body_text ?? ''}`
  if (SUPPORT_RE.test(text)) return 'create_ticket'
  if (matchedContact && matchedDeal)  return 'update_lead'
  if (matchedContact && !matchedDeal) return 'reopen_account'
  return 'create_lead'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'email' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Workspace lookup
  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // ── Per-tab data fetching ─────────────────────────────────────────────────

  let triageEmails: TriageEmail[] = []
  let bots:    BotRow[] = []
  let tickets: (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[] = []

  if (tab === 'email') {
    // Parallel data fetches
    const [emailsRes, contactsRes] = await Promise.all([
      // Top 20 inbound emails — any priority (null included), not trashed
      // Uses 'as any' because sage_emails is not yet in the generated Database types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('sage_emails')
        .select('*, contact:sage_contacts(id, name, email)')
        .eq('workspace_id', workspaceId)
        .eq('direction', 'inbound')
        .neq('ai_priority', 'low')           // exclude explicitly low-priority
        .order('ai_priority', { ascending: true, nullsFirst: false })  // high, medium, null
        .order('received_at', { ascending: false })
        .limit(20),

      // All workspace contacts (for email matching)
      supabase
        .from('sage_contacts')
        .select('id, name, email')
        .eq('workspace_id', workspaceId)
        .not('email', 'is', null),
    ])

    const rawEmails   = (emailsRes.data   ?? []) as SageEmail[]
    const rawContacts = (contactsRes.data ?? []) as { id: string; name: string; email: string | null }[]

    // Build email → contact map (lowercase for matching)
    const contactByEmail = new Map<string, { id: string; name: string; email: string | null }>()
    for (const c of rawContacts) {
      if (c.email) contactByEmail.set(c.email.toLowerCase(), c)
    }

    // Find which matched contact ids have open deals
    const matchedContactIds = Array.from(
      new Set(
        rawEmails
          .map(e => contactByEmail.get(e.from_address.toLowerCase())?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    )

    const openDealsByContactId = new Map<string, { id: string; title: string }>()
    if (matchedContactIds.length > 0) {
      const { data: dealsRaw } = await supabase
        .from('sage_deals')
        .select('id, title, contact_id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'open')
        .in('contact_id', matchedContactIds)
      const deals = (dealsRaw ?? []) as { id: string; title: string; contact_id: string }[]
      for (const d of deals) {
        if (!openDealsByContactId.has(d.contact_id)) {
          openDealsByContactId.set(d.contact_id, { id: d.id, title: d.title })
        }
      }
    }

    // Build TriageEmail[]
    triageEmails = rawEmails.map(email => {
      const matchedContact = contactByEmail.get(email.from_address.toLowerCase()) ?? null
      const matchedDeal    = matchedContact ? (openDealsByContactId.get(matchedContact.id) ?? null) : null
      const recommendation = deriveRecommendation(email, matchedContact, matchedDeal)
      return { email, recommendation, matchedContact, matchedDeal }
    })

    // Sort: high first, then medium
    triageEmails.sort((a, b) => {
      if (a.email.ai_priority === 'high' && b.email.ai_priority !== 'high') return -1
      if (b.email.ai_priority === 'high' && a.email.ai_priority !== 'high') return  1
      return 0
    })

  } else if (tab === 'bots') {
    const { data } = await supabase
      .from('bots')
      .select('*, integrations(count)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    bots = (data ?? []) as BotRow[]

  } else if (tab === 'tickets') {
    const { data } = await supabase
      .from('sage_tickets')
      .select('*, contact:sage_contacts(id, name, email)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50)
    tickets = (data ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]
  }
  // tab === 'forms' → no data needed (placeholder)

  return (
    // Break out of the layout's p-8 to claim the full viewport height
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <OverviewTabBar activeTab={tab} />

      <div className="flex flex-1 overflow-hidden">
        {tab === 'email' && (
          <EmailTriageDashboard triageEmails={triageEmails} workspaceId={workspaceId} />
        )}
        {tab === 'bots' && (
          <BotsDashboard bots={bots} />
        )}
        {tab === 'tickets' && (
          <TicketsDashboard tickets={tickets} />
        )}
        {tab === 'forms' && (
          <FormsDashboard />
        )}
        <SageRightPanel workspaceId={workspaceId} />
      </div>
    </div>
  )
}
