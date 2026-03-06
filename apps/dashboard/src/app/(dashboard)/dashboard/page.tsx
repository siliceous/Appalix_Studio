import { createClient } from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageEmail, SageTicket, SageContact, SageMeeting, Bot as BotRow, Conversation } from '@/lib/types'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'
import { EmailTriageDashboard, type TriageEmail, type TriageRecommendation } from '@/components/dashboard/email-triage-dashboard'
import { BotTriageDashboard, type TriageConversation } from '@/components/dashboard/bots-triage-dashboard'
import { TicketsDashboard } from '@/components/dashboard/tickets-dashboard'
import { FormsDashboard }   from '@/components/dashboard/forms-dashboard'
import { OverviewTabBar }   from '@/components/dashboard/overview-tab-bar'

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
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // ── Per-tab data fetching ─────────────────────────────────────────────────

  // Detect connected email provider for calendar link generation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailIntegration } = await (supabase as any)
    .from('sage_integrations')
    .select('provider')
    .eq('workspace_id', workspaceId)
    .in('provider', ['gmail', 'microsoft'])
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle()
  const emailProvider = ((emailIntegration as { provider?: string } | null)?.provider ?? null) as 'gmail' | 'microsoft' | null

  let triageEmails:        TriageEmail[] = []
  let triageConversations: TriageConversation[] = []
  let tickets: (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[] = []
  let forms:       SageForm[] = []
  let submissions: SageFormSubmission[] = []

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
        .eq('is_read', false)      // exclude emails already replied-to / actioned
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

    // Layer 3: permanently suppress calendar notifications that slipped through
    // Covers: subject pattern, known sender addresses, and AI classification
    const CALENDAR_SUBJECT_RE3 = /^(Accepted|Declined|Tentative|Cancelled|Updated Invitation|Invitation):?\s/i
    const CALENDAR_SENDERS_RE3 = new Set([
      'calendar-notification@google.com',
      'calendar-notification@googlemail.com',
      'noreply@calendar.google.com',
      'calendar@google.com',
      'invitations@microsoft.com',
    ])
    const isCalendarEmail = (e: { subject: string | null; from_address: string; ai_category?: string | null; ai_action?: string | null }) =>
      CALENDAR_SUBJECT_RE3.test(e.subject ?? '') ||
      CALENDAR_SENDERS_RE3.has((e.from_address ?? '').toLowerCase()) ||
      (e.ai_category === 'Meeting' && e.ai_action === 'ignore')

    const calendarIds = triageEmails.filter(t => isCalendarEmail(t.email)).map(t => t.email.id)
    triageEmails = triageEmails.filter(t => !isCalendarEmail(t.email))

    // Mark the suppressed emails as read so they never resurface — fire-and-forget
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (calendarIds.length > 0) void (supabase as any).from('sage_emails').update({ is_read: true }).in('id', calendarIds)

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
        .select('id, name, bot_type')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      // Use '*' so the query succeeds even if ai_* columns don't exist yet
      // (they're added by migration 00036 — optional fields in Conversation type)
      supabase
        .from('conversations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_activity_at', { ascending: false })
        .limit(300),
    ])
    const rawBots  = (botsRes.data  ?? []) as Pick<BotRow, 'id' | 'name' | 'bot_type'>[]
    const rawConvs = (convsRes.data ?? []) as Conversation[]
    const botMap   = new Map(rawBots.map(b => [b.id, b]))

    triageConversations = rawConvs
      .filter(c => c.bot_id && botMap.has(c.bot_id))
      .map(c => {
        const bot = botMap.get(c.bot_id!)!
        return { conversation: c, botName: bot.name, botType: bot.bot_type }
      })

  } else if (tab === 'tickets') {
    const { data } = await supabase
      .from('sage_tickets')
      .select('*, contact:sage_contacts(id, name, email)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50)
    tickets = (data ?? []) as (SageTicket & { contact: Pick<SageContact, 'id' | 'name' | 'email'> | null })[]
  } else if (tab === 'forms') {
    const [formsRes, submissionsRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('sage_forms')
        .select('id, name, description, is_active, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('sage_form_submissions')
        .select('id, form_id, fields, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, ai_analyzed_at, actioned_at, action_type, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    forms       = (formsRes.data       ?? []) as SageForm[]
    submissions = (submissionsRes.data ?? []) as SageFormSubmission[]
  }

  return (
    // Break out of the layout's p-8 to claim the full viewport height
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <OverviewTabBar activeTab={tab} />

      <div className="flex flex-1 overflow-hidden">
        {tab === 'email' && (
          <EmailTriageDashboard triageEmails={triageEmails} workspaceId={workspaceId} emailProvider={emailProvider} />
        )}
        {tab === 'bots' && (
          <BotTriageDashboard triageConversations={triageConversations} />
        )}
        {tab === 'tickets' && (
          <TicketsDashboard tickets={tickets} />
        )}
        {tab === 'forms' && (
          <FormsDashboard forms={forms} submissions={submissions} />
        )}
      </div>
    </div>
  )
}
