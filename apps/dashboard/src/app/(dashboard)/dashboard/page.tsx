import { createClient } from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageEmail, SageTicket, SageContact, SageMeeting, Bot as BotRow } from '@/lib/types'
import { EmailTriageDashboard, type TriageEmail, type TriageRecommendation } from '@/components/dashboard/email-triage-dashboard'
import { BotsDashboard, type BotConversation } from '@/components/dashboard/bots-dashboard'
import { TicketsDashboard } from '@/components/dashboard/tickets-dashboard'
import { FormsDashboard }   from '@/components/dashboard/forms-dashboard'
import { OverviewTabBar }   from '@/components/dashboard/overview-tab-bar'
import { SageRightPanel }   from '@/components/sage/sage-right-panel'

export const metadata: Metadata = { title: 'Overview' }

// Consumer email domains — don't use these for company domain matching
const CONSUMER_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'live.com', 'msn.com', 'me.com', 'aol.com', 'protonmail.com',
  'pm.me', 'fastmail.com', 'zoho.com', 'ymail.com', 'googlemail.com',
])

function emailDomain(address: string): string | null {
  const parts = address.toLowerCase().split('@')
  if (parts.length !== 2) return null
  const domain = parts[1]
  return CONSUMER_DOMAINS.has(domain) ? null : domain
}

function deriveRecommendation(
  email:            SageEmail,
  matchedContact:   { id: string } | null,
  openDeal:         { id: string } | null,
  closedDeal:       { id: string; title: string } | null,
): TriageRecommendation {
  // Low priority → always ignore (AI is authoritative)
  if (email.ai_priority === 'low') return 'ignore'

  // Use Claude's action recommendation, enriched with CRM match data
  const action = email.ai_action

  if (action === 'create_ticket') return 'create_ticket'
  if (action === 'ignore')        return 'ignore'

  // CRM-aware routing: override create_lead/reply_draft when we have a match
  if (matchedContact) {
    if (openDeal)   return 'update_lead'    // active deal → add note + move bucket
    if (closedDeal) return 'reopen_account' // won/lost → offer to reopen
    return 'reopen_account'                 // known contact, no deal → re-engage
  }

  if (action === 'create_lead')  return 'create_lead'
  if (action === 'reply_draft')  return 'create_lead'  // no CRM match → create lead

  return 'create_lead'  // sensible default for high/medium with no CRM match
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

  let triageEmails:  TriageEmail[] = []
  let bots:          BotRow[] = []
  let conversations: BotConversation[] = []
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
        .eq('is_trashed', false)   // exclude user-deleted emails
        .order('received_at', { ascending: false })
        .limit(50),

      // All workspace contacts (for email matching)
      supabase
        .from('sage_contacts')
        .select('id, name, email')
        .eq('workspace_id', workspaceId)
        .not('email', 'is', null),
    ])

    const rawEmails   = (emailsRes.data   ?? []) as SageEmail[]
    const rawContacts = (contactsRes.data ?? []) as { id: string; name: string; email: string | null }[]

    // ── Contact matching: email-exact + company-domain ─────────────────────
    // Primary: exact email address match
    const contactByEmail  = new Map<string, { id: string; name: string; email: string | null }>()
    // Secondary: non-consumer email domain → company match
    const contactByDomain = new Map<string, { id: string; name: string; email: string | null }>()

    for (const c of rawContacts) {
      if (!c.email) continue
      const addr = c.email.toLowerCase()
      contactByEmail.set(addr, c)
      const domain = emailDomain(addr)
      if (domain && !contactByDomain.has(domain)) contactByDomain.set(domain, c)
    }

    function findContact(fromAddress: string) {
      const addr   = fromAddress.toLowerCase()
      const exact  = contactByEmail.get(addr)
      if (exact) return exact
      const domain = emailDomain(addr)
      return domain ? (contactByDomain.get(domain) ?? null) : null
    }

    // ── Deal lookup: open + closed (won/lost) for matched contacts ──────────
    const matchedContactIds = Array.from(
      new Set(
        rawEmails
          .map(e => findContact(e.from_address)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    )

    const openDealsByContactId:   Map<string, { id: string; title: string }> = new Map()
    const closedDealsByContactId: Map<string, { id: string; title: string }> = new Map()

    if (matchedContactIds.length > 0) {
      const { data: dealsRaw } = await supabase
        .from('sage_deals')
        .select('id, title, contact_id, status')
        .eq('workspace_id', workspaceId)
        .in('status', ['open', 'won', 'lost'])
        .in('contact_id', matchedContactIds)
      const deals = (dealsRaw ?? []) as { id: string; title: string; contact_id: string; status: string }[]
      for (const d of deals) {
        if (d.status === 'open') {
          if (!openDealsByContactId.has(d.contact_id))
            openDealsByContactId.set(d.contact_id, { id: d.id, title: d.title })
        } else {
          if (!closedDealsByContactId.has(d.contact_id))
            closedDealsByContactId.set(d.contact_id, { id: d.id, title: d.title })
        }
      }
    }

    // Fetch meetings for these email IDs
    const emailIds = rawEmails.map(e => e.id)
    const meetingsByEmailId = new Map<string, SageMeeting>()
    if (emailIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: meetingsRaw } = await (supabase as any)
        .from('sage_meetings')
        .select('*')
        .in('email_id', emailIds)
      for (const m of (meetingsRaw ?? []) as SageMeeting[]) {
        if (m.email_id) meetingsByEmailId.set(m.email_id, m)
      }
    }

    // Build TriageEmail[]
    triageEmails = rawEmails.map(email => {
      const matchedContact = findContact(email.from_address)
      const openDeal       = matchedContact ? (openDealsByContactId.get(matchedContact.id)   ?? null) : null
      const closedDeal     = matchedContact ? (closedDealsByContactId.get(matchedContact.id) ?? null) : null
      const recommendation = deriveRecommendation(email, matchedContact, openDeal, closedDeal)
      const matchedDeal    = openDeal ?? closedDeal ?? null
      const meeting        = meetingsByEmailId.get(email.id) ?? null
      return { email, recommendation, matchedContact, matchedDeal, meeting }
    })

    // Sort: high → medium → low → pending (unanalyzed)
    const P: Record<string, number> = { high: 0, medium: 1, low: 2 }
    triageEmails.sort((a, b) => {
      const pa = a.email.ai_priority ? (P[a.email.ai_priority] ?? 3) : 3
      const pb = b.email.ai_priority ? (P[b.email.ai_priority] ?? 3) : 3
      return pa - pb
    })

  } else if (tab === 'bots') {
    const [botsRes, convsRes] = await Promise.all([
      supabase
        .from('bots')
        .select('*, integrations(count)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      // Fetch all conversations for this workspace so we can group by bot_id
      supabase
        .from('conversations')
        .select('id, title, platform, status, message_count, last_activity_at, bot_id')
        .eq('workspace_id', workspaceId)
        .order('last_activity_at', { ascending: false })
        .limit(300),
    ])
    bots          = (botsRes.data  ?? []) as BotRow[]
    conversations = (convsRes.data ?? []) as BotConversation[]

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
          <BotsDashboard bots={bots} conversations={conversations} />
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
