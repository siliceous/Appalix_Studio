import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, SageEmail, SageMeeting } from '@/lib/types'
import { EmailTriageDashboard, type TriageEmail, type TriageRecommendation } from '@/components/dashboard/email-triage-dashboard'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'

export const metadata: Metadata = { title: 'Email Triage' }

function getDateRange(preset: SubpagePreset): { from: string | null; to: string | null } {
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }
  if (preset === 'yesterday') {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to   = new Date(now); to.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: null }
  }
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30)
    return { from: from.toISOString(), to: null }
  }
  return { from: null, to: null }
}

const CONSUMER_DOMAINS = new Set([
  'gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com',
  'live.com','msn.com','me.com','aol.com','protonmail.com',
  'pm.me','fastmail.com','zoho.com','ymail.com','googlemail.com',
])

function emailDomain(address: string): string | null {
  const parts = address.toLowerCase().split('@')
  if (parts.length !== 2) return null
  return CONSUMER_DOMAINS.has(parts[1]) ? null : parts[1]
}

function deriveRecommendation(
  email:          SageEmail,
  matchedContact: { id: string } | null,
  openDeal:       { id: string } | null,
  closedDeal:     { id: string; title: string } | null,
): TriageRecommendation {
  if (email.ai_priority === 'low') return 'ignore'
  const action = email.ai_action
  if (action === 'create_ticket') return 'create_ticket'
  if (action === 'ignore')        return 'ignore'
  if (matchedContact) {
    if (openDeal)   return 'update_lead'
    if (closedDeal) return 'reopen_account'
    return 'reopen_account'
  }
  if (action === 'create_lead')  return 'create_lead'
  if (action === 'reply_draft')  return 'create_lead'
  return 'create_lead'
}

export default async function EmailTriagePage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const params = await searchParams
  const preset = (['today','yesterday','7d','30d'].includes(params.preset ?? '') ? params.preset : 'all') as SubpagePreset
  const { from: dateFrom, to: dateTo } = getDateRange(preset)
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
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let emailQuery = (supabase as any)
    .from('sage_emails')
    .select('*, contact:sage_contacts(id, name, email)')
    .eq('workspace_id', workspaceId)
    .eq('direction', 'inbound')
    .eq('is_trashed', false)
    .eq('is_read', false)
  if (dateFrom) emailQuery = emailQuery.gte('received_at', dateFrom)
  if (dateTo)   emailQuery = emailQuery.lt('received_at', dateTo)
  emailQuery = emailQuery.order('received_at', { ascending: false }).limit(50)

  const [emailsRes, contactsRes] = await Promise.all([
    emailQuery,
    supabase
      .from('sage_contacts')
      .select('id, name, email')
      .eq('workspace_id', workspaceId)
      .not('email', 'is', null),
  ])

  const rawEmails   = (emailsRes.data   ?? []) as SageEmail[]
  const rawContacts = (contactsRes.data ?? []) as { id: string; name: string; email: string | null }[]

  const contactByEmail  = new Map<string, { id: string; name: string; email: string | null }>()
  const contactByDomain = new Map<string, { id: string; name: string; email: string | null }>()
  for (const c of rawContacts) {
    if (!c.email) continue
    const addr = c.email.toLowerCase()
    contactByEmail.set(addr, c)
    const domain = emailDomain(addr)
    if (domain && !contactByDomain.has(domain)) contactByDomain.set(domain, c)
  }
  function findContact(fromAddress: string) {
    const addr  = fromAddress.toLowerCase()
    const exact = contactByEmail.get(addr)
    if (exact) return exact
    const domain = emailDomain(addr)
    return domain ? (contactByDomain.get(domain) ?? null) : null
  }

  const matchedContactIds = Array.from(new Set(
    rawEmails.map(e => findContact(e.from_address)?.id).filter((id): id is string => Boolean(id)),
  ))
  const openDealsByContactId:   Map<string, { id: string; title: string }> = new Map()
  const closedDealsByContactId: Map<string, { id: string; title: string }> = new Map()
  if (matchedContactIds.length > 0) {
    const { data: dealsRaw } = await supabase
      .from('sage_deals')
      .select('id, title, contact_id, status')
      .eq('workspace_id', workspaceId)
      .in('status', ['open', 'won', 'lost'])
      .in('contact_id', matchedContactIds)
    for (const d of (dealsRaw ?? []) as { id: string; title: string; contact_id: string; status: string }[]) {
      if (d.status === 'open') { if (!openDealsByContactId.has(d.contact_id)) openDealsByContactId.set(d.contact_id, { id: d.id, title: d.title }) }
      else                     { if (!closedDealsByContactId.has(d.contact_id)) closedDealsByContactId.set(d.contact_id, { id: d.id, title: d.title }) }
    }
  }

  const emailIds = rawEmails.map(e => e.id)
  const meetingsByEmailId = new Map<string, SageMeeting>()
  if (emailIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meetingsRaw } = await (supabase as any).from('sage_meetings').select('*').in('email_id', emailIds)
    for (const m of (meetingsRaw ?? []) as SageMeeting[]) {
      if (m.email_id) meetingsByEmailId.set(m.email_id, m)
    }
  }

  let triageEmails: TriageEmail[] = rawEmails.map(email => {
    const matchedContact = findContact(email.from_address)
    const openDeal       = matchedContact ? (openDealsByContactId.get(matchedContact.id)   ?? null) : null
    const closedDeal     = matchedContact ? (closedDealsByContactId.get(matchedContact.id) ?? null) : null
    return { email, recommendation: deriveRecommendation(email, matchedContact, openDeal, closedDeal), matchedContact, matchedDeal: openDeal ?? closedDeal ?? null, meeting: meetingsByEmailId.get(email.id) ?? null }
  })

  const CALENDAR_RE      = /^(Accepted|Declined|Tentative|Cancelled|Updated Invitation|Invitation):?\s/i
  const CALENDAR_SENDERS = new Set(['calendar-notification@google.com','calendar-notification@googlemail.com','noreply@calendar.google.com','calendar@google.com','invitations@microsoft.com'])
  const isCalendar = (e: { subject: string | null; from_address: string; ai_category?: string | null; ai_action?: string | null }) =>
    CALENDAR_RE.test(e.subject ?? '') || CALENDAR_SENDERS.has((e.from_address ?? '').toLowerCase()) || (e.ai_category === 'Meeting' && e.ai_action === 'ignore')

  const calendarIds = triageEmails.filter(t => isCalendar(t.email)).map(t => t.email.id)
  triageEmails = triageEmails.filter(t => !isCalendar(t.email))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (calendarIds.length > 0) void (supabase as any).from('sage_emails').update({ is_read: true }).in('id', calendarIds)

  const P: Record<string, number> = { high: 0, medium: 1, low: 2 }
  triageEmails.sort((a, b) => (a.email.ai_priority ? (P[a.email.ai_priority] ?? 3) : 3) - (b.email.ai_priority ? (P[b.email.ai_priority] ?? 3) : 3))

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar title="Email Triage" sourceKey="email" preset={preset} />
      <div className="flex flex-1 overflow-hidden">
        <EmailTriageDashboard triageEmails={triageEmails} workspaceId={workspaceId} emailProvider={emailProvider} />
      </div>
    </div>
  )
}
