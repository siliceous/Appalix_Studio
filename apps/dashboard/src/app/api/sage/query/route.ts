import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  computeAccessScope,
  classifySageQuery,
  runStructuredRetrieval,
  runSemanticRetrieval,
  composeSageAnswer,
  executeSageAction,
} from '@/lib/sage-intelligence'
import { inferEntityTypesFromCategory } from '@/lib/sage-intelligence/semantic-retrieval'
import type { SageAccessScope, SageQueryClassification, RetrievedContext } from '@/lib/sage-intelligence/types'

/**
 * POST /api/sage/query
 *
 * Body: {
 *   workspace_id: string
 *   query: string
 *   pageContext?: string
 *   entityType?: 'contact' | 'conversation' | 'form_submission'
 *   entityId?: string
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: {
    workspace_id: string
    query: string
    pageContext?: string
    entityType?: 'contact' | 'conversation' | 'form_submission'
    entityId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { workspace_id, query, pageContext = '', entityType, entityId } = body
  if (!workspace_id || !query) {
    return NextResponse.json({ error: 'workspace_id and query are required' }, { status: 400 })
  }

  // Verify plan + get workspace
  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspaces(id, name, plan, subscription_status, trial_ends_at)')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  const ws = (memberRaw as unknown as {
    workspaces: { id: string; name: string; plan: string; subscription_status: string; trial_ends_at: string | null }
  } | null)?.workspaces
  if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const allowedPlans = ['pro', 'team', 'enterprise']
  const isOnTrial    = ws.subscription_status === 'trialing' && ws.trial_ends_at != null && new Date(ws.trial_ends_at) > new Date()
  if (!allowedPlans.includes(ws.plan) && !isOnTrial) {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
  }

  // Get user profile
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()
  const profile  = profileRaw as { first_name: string | null; last_name: string | null } | null
  const userName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : (user.email ?? 'Team member')

  // Access scope
  const scope = await computeAccessScope(workspace_id)
  if (!scope) return NextResponse.json({ error: 'Could not compute access scope' }, { status: 500 })

  // Enrich page context with live record data when viewing a specific entity
  const admin = createAdminClient()
  let enrichedContext = pageContext
  if (entityId && entityType) {
    const liveData = await fetchLiveEntityContext(workspace_id, entityType, entityId, admin)
    if (liveData) enrichedContext = `${pageContext}\n\n${liveData}`
  }

  // Classify query (AI) — then apply regex overrides.
  const classification = await classifySageQuery(query, enrichedContext)
  if (!classification.actionIntent) {
    const regexIntent = detectActionIntent(query)
    if (regexIntent) classification.actionIntent = regexIntent
  }
  // Keyword override for categories the AI model frequently misclassifies.
  if (!classification.actionIntent) {
    const overrideCategory = detectCategoryOverride(query)
    if (overrideCategory) {
      classification.category = overrideCategory
      classification.retrieval = 'structured'
    }
  }

  // Action intent — resolve names → IDs and execute
  if (classification.actionIntent) {
    const result = await resolveAndExecuteAction({
      query,
      classification,
      scope,
      workspaceId: workspace_id,
      currentUserId: user.id,
      entityType,
      entityId,
    })
    return NextResponse.json(result)
  }

  // Non-action: retrieve + compose
  // Route to the right retrieval mode based on classifier output.
  // Existing 'structured' path is unchanged; 'semantic' and 'hybrid' are new.
  let context: RetrievedContext
  // Force structured retrieval for general/briefing/alerts/forms — never leave them with no data
  const mode = (classification.retrieval === 'none' && ['general', 'briefing', 'alerts', 'activities', 'reminders', 'forms'].includes(classification.category))
    ? 'structured'
    : classification.retrieval

  if (mode === 'semantic') {
    const entityTypes = inferEntityTypesFromCategory(classification.category)
    const hits = await runSemanticRetrieval(query, scope, entityTypes)
    context = { semanticHits: hits }
  } else if (mode === 'hybrid') {
    const entityTypes = inferEntityTypesFromCategory(classification.category)
    const [structured, hits] = await Promise.all([
      runStructuredRetrieval(classification, scope),
      runSemanticRetrieval(query, scope, entityTypes),
    ])
    context = { ...structured, semanticHits: hits }
  } else {
    // 'structured' or 'none' — original behaviour, untouched
    context = await runStructuredRetrieval(classification, scope)
  }

  const { reply, followUps } = await composeSageAnswer(query, classification, context, enrichedContext, ws.name, userName)

  // Auto-navigate for category queries that map to a specific page.
  // If the user is already on the main dashboard, open the activity feed section
  // directly (collapse donuts + show the right grid) rather than navigating away.
  const isOnDashboard = pageContext.includes('MAIN DASHBOARD')
  const CATEGORY_NAV: Record<string, string> = {
    pipeline:      '/sage/pipelines',
    deals:         '/sage/pipelines',
    tickets:       isOnDashboard ? '/dashboard?section=tickets' : '/sage/tickets',
    emails:        isOnDashboard ? '/dashboard?section=emails'  : '/dashboard/email',
    conversations: isOnDashboard ? '/dashboard?section=bots'    : '/dashboard/bots',
    contacts:      '/sage/contacts',
    analytics:     '/sage/contacts',
    forms:         '/dashboard?section=forms',
  }
  const navigateTo = CATEGORY_NAV[classification.category]

  return NextResponse.json({ reply, classification, context, suggestedFollowUps: followUps, navigateTo })
}

// ─────────────────────────────────────────────────────────────────────────────
// Regex-based pre-classification (runs AFTER AI classifier as a safety net)
// ─────────────────────────────────────────────────────────────────────────────

type ActionIntentType =
  | 'assign_deal' | 'assign_ticket' | 'move_deal_stage'
  | 'convert_to_deal' | 'create_deal' | 'create_ticket'
  | 'create_reminder' | 'create_task' | 'save_note' | 'draft_reply'
  | 'create_contact'

type SageCategoryOverride = 'forms' | 'conversations' | 'emails' | 'tickets' | 'contacts' | 'deals' | 'reminders'

/**
 * Keyword-based category override — catches cases where the AI classifier
 * returns 'general' for queries that clearly belong to a specific category.
 */
function detectCategoryOverride(query: string): SageCategoryOverride | null {
  const q = query.toLowerCase()
  // Match "form", "forms", "form entry", "forms entry", "form submission", etc.
  if (/\bforms?\b/.test(q) && !/\bformat\b|\binform\b/.test(q)) return 'forms'
  if (/\b(bot\s+(chat|conv|response)|bot\s+activ|chat\s+histor|conversation)\b/.test(q)) return 'conversations'
  if (/\b(my\s+email|inbox|unread\s+email|email\s+from)\b/.test(q)) return 'emails'
  if (/\b(my\s+ticket|open\s+ticket|support\s+ticket)\b/.test(q)) return 'tickets'
  return null
}

function detectActionIntent(query: string): ActionIntentType | null {
  const q = query.toLowerCase()

  // assign_deal — all natural phrasings
  // "assign/reassign/give/transfer/hand [NAME] deal to [X]"
  if (/\b(assign|reassign|give|transfer|hand)\b.{1,50}\b(deal|lead|contact|account|opportunity)\b.{0,30}\bto\b/.test(q)) return 'assign_deal'
  // "assign/give deal [NAME] to [X]"
  if (/\b(assign|reassign|give|transfer|hand)\b.{0,10}\b(deal|lead|contact|account|opportunity)\b.{1,50}\bto\b/.test(q)) return 'assign_deal'
  // "set/make [X] (as) (the) owner of [NAME] deal"
  if (/\b(set|make|change|update)\b.{1,50}\bowner\b.{1,30}\b(deal|lead|contact|opportunity)\b/.test(q)) return 'assign_deal'
  if (/\b(change|update|set)\b.{1,20}\bdeal\b.{0,20}\bowner\b/.test(q)) return 'assign_deal'
  // "[NAME]'s deal should go to [X]"
  if (/\bdeal\b.{1,30}\bgo\b.{0,10}\bto\b/.test(q)) return 'assign_deal'
  // "put [NAME]'s deal under [X]"
  if (/\bput\b.{1,40}\bdeal\b.{0,20}\bunder\b/.test(q)) return 'assign_deal'

  // assign_ticket
  if (/\b(assign|reassign|give|transfer)\b.{1,40}\bticket\b.{0,20}\bto\b/.test(q)) return 'assign_ticket'
  if (/\b(change|update|set)\b.{1,20}\bticket\b.{0,20}\bowner\b/.test(q))           return 'assign_ticket'

  // move_deal_stage
  if (/\bmove\b.{1,40}\bdeal\b.{0,30}\bstage\b/.test(q))            return 'move_deal_stage'
  if (/\bmove\b.{1,40}\bstage\b/.test(q))                            return 'move_deal_stage'
  if (/\badvance\b.{1,30}\bdeal\b/.test(q))                          return 'move_deal_stage'

  // convert_to_deal
  if (/\bconvert\b.{1,40}\b(lead|contact|form|conversation)\b/.test(q)) return 'convert_to_deal'
  if (/\badd\b.{1,30}\bto\b.{1,30}\bpipeline\b/.test(q))               return 'convert_to_deal'
  if (/\b(push|move)\b.{1,30}\bto\b.{1,30}\bpipeline\b/.test(q))       return 'convert_to_deal'

  // create_contact
  if (/\b(add|create|new|register|save)\b.{0,20}\bcontact\b/.test(q))  return 'create_contact'
  if (/\b(add|create|new|register)\b.{0,20}\b(lead|person|client|customer)\b/.test(q)) return 'create_contact'

  // create actions
  if (/\bcreate\b.{1,20}\bdeal\b/.test(q))                           return 'create_deal'
  if (/\b(open|start)\b.{1,20}\bdeal\b/.test(q))                     return 'create_deal'
  if (/\bcreate\b.{1,20}\bticket\b/.test(q))                         return 'create_ticket'
  if (/\b(open|raise|log)\b.{1,20}\bticket\b/.test(q))               return 'create_ticket'
  if (/\b(set|add|create)\b.{1,20}\breminder\b/.test(q))             return 'create_reminder'
  if (/\b(set|add|create)\b.{1,20}\btask\b/.test(q))                 return 'create_task'
  if (/\bsave\b.{1,20}\bnote\b/.test(q))                             return 'save_note'
  return null
}

// All the ways someone can say "assign deal X to Y" — order matters (most specific first)
const ASSIGN_DEAL_PATTERNS: RegExp[] = [
  // possessive: "Saran's deal to Shaurya" / "Saran Kaur's deal to Shaurya"
  /(?:assign|reassign|give|transfer|hand|put)\s+(.+?)'s\s+(?:deal|lead|contact|account|opportunity)\s+to\s+(.+?)(?:\s*$|[,.])/i,
  // name before keyword: "assign Saran Kaur deal to Shaurya"
  /(?:assign|reassign|give|transfer|hand)\s+(.+?)\s+(?:deal|lead|contact|account|opportunity)\s+to\s+(.+?)(?:\s*$|[,.])/i,
  // keyword + preposition + name: "assign deal for Saran to Shaurya"
  /(?:assign|reassign|give|transfer|hand)\s+(?:the\s+)?(?:deal|lead|contact|account|opportunity)\s+(?:for|of|from|belonging to)\s+(.+?)\s+to\s+(.+?)(?:\s*$|[,.])/i,
  // keyword before name: "assign deal Saran Kaur to Shaurya"
  /(?:assign|reassign|give|transfer|hand)\s+(?:the\s+)?(?:deal|lead|contact|account|opportunity)\s+(.+?)\s+to\s+(.+?)(?:\s*$|[,.])/i,
  // change/set/update owner: "change deal owner for Saran to Shaurya"
  /(?:change|update|set)\s+(?:the\s+)?(?:deal|lead|contact|account)\s+owner\s+(?:for|of)\s+(.+?)\s+to\s+(.+?)(?:\s*$|[,.])/i,
  // make X owner of Y: "make Shaurya owner of Saran's deal" — note: assignee is first here
  /(?:make|set)\s+(.+?)\s+(?:as\s+)?(?:the\s+)?owner\s+of\s+(.+?)'s\s+(?:deal|lead|contact)(?:\s*$|[,.])/i,
  // "[NAME]'s deal should go to [X]"
  /(.+?)'s\s+(?:deal|lead)\s+(?:should|needs to|must)\s+go\s+to\s+(.+?)(?:\s*$|[,.])/i,
  // "put [NAME]'s deal under [X]"
  /put\s+(.+?)'s\s+(?:deal|lead)\s+under\s+(.+?)(?:\s*$|[,.])/i,
  // short form: "assign Saran to Shaurya"
  /(?:assign|reassign|give)\s+(.+?)\s+to\s+(.+?)(?:\s*$|[,.])/i,
]

/**
 * Extract contact name + assignee name for an assign_deal intent.
 * Tries patterns in specificity order; returns first match.
 * For "make X owner of Y" pattern the groups are swapped — handled below.
 */
function extractAssignDealNames(query: string): { contactName: string | null; assigneeName: string | null } {
  for (let i = 0; i < ASSIGN_DEAL_PATTERNS.length; i++) {
    const m = query.match(ASSIGN_DEAL_PATTERNS[i])
    if (!m) continue
    // "make [ASSIGNEE] owner of [CONTACT]'s deal" — groups are reversed
    if (i === 5) return { contactName: m[2].trim(), assigneeName: m[1].trim() }
    // "[CONTACT]'s deal should go to [ASSIGNEE]" — groups are already correct
    return { contactName: m[1].trim(), assigneeName: m[2].trim() }
  }
  return { contactName: null, assigneeName: null }
}

/**
 * Extract "assign [NAME] ticket to [ASSIGNEE]" from query text.
 */
function extractAssignTicketNames(query: string): { ticketName: string | null; assigneeName: string | null } {
  const m = query.match(/assign\s+(.+?)\s+ticket\s+to\s+(.+?)(?:\s*$|[,.])/i)
  if (m) return { ticketName: m[1].trim(), assigneeName: m[2].trim() }
  const m2 = query.match(/assign\s+ticket\s+(?:for|of|from)\s+(.+?)\s+to\s+(.+?)(?:\s*$|[,.])/i)
  if (m2) return { ticketName: m2[1].trim(), assigneeName: m2[2].trim() }
  return { ticketName: null, assigneeName: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace member resolver — two-step because workspace_members and
// user_profiles share user_id → auth.users.id (no direct FK between them)
// ─────────────────────────────────────────────────────────────────────────────

interface ResolvedMember {
  userId:    string
  fullName:  string
}

async function resolveWorkspaceMember(
  workspaceId: string,
  nameQuery:   string,
): Promise<ResolvedMember | null> {
  const admin = createAdminClient()
  const q     = nameQuery.toLowerCase().trim()

  // Step 1: get all accepted member user_ids for this workspace
  const { data: members } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .not('accepted_at', 'is', null)

  if (!members || members.length === 0) return null
  const userIds = (members as { user_id: string }[]).map(m => m.user_id)

  // Step 2: fetch profiles for those user_ids
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds)

  if (!profiles || profiles.length === 0) return null

  type ProfileRow = { user_id: string; first_name: string | null; last_name: string | null }

  const match = (profiles as ProfileRow[]).find(p => {
    const fn   = (p.first_name ?? '').toLowerCase()
    const ln   = (p.last_name  ?? '').toLowerCase()
    const full = `${fn} ${ln}`.trim()
    // Require at least one non-empty token to match
    if (!fn && !ln) return false
    return fn === q || ln === q
      || full === q
      || (fn && q.includes(fn))
      || (ln && q.includes(ln))
      || (fn && fn.includes(q))
      || (ln && ln.includes(q))
  })

  if (!match) return null

  return {
    userId:   match.user_id,
    fullName: [match.first_name, match.last_name].filter(Boolean).join(' ') || nameQuery,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Live entity context enrichment — appends structured record data to pageContext
// so Claude can answer questions about the currently-open record
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLiveEntityContext(
  workspaceId: string,
  entityType:  string,
  entityId:    string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin:       any,
): Promise<string | null> {
  try {
    if (entityType === 'contact') {
      const { data: c } = await admin
        .from('sage_contacts')
        .select('name, email, phone, company_name, assigned_to, contact_type, ai_summary, tags')
        .eq('id', entityId)
        .eq('workspace_id', workspaceId)
        .single()
      if (!c) return null

      const { data: deals } = await admin
        .from('sage_deals')
        .select('title, status, value, currency, stage:sage_pipeline_stages(name), owner:user_profiles(first_name, last_name)')
        .eq('contact_id', entityId)
        .eq('workspace_id', workspaceId)
        .neq('status', 'lost')
        .limit(5)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dealLines = ((deals ?? []) as any[]).map(d => {
        const owner = d.owner ? `${d.owner.first_name ?? ''} ${d.owner.last_name ?? ''}`.trim() || 'Unassigned' : 'Unassigned'
        return `  - "${d.title}" | Status: ${d.status} | Stage: ${d.stage?.name ?? '?'} | Owner: ${owner}`
      })

      // Resolve assigned_to user ID to a name
      let assignedName = 'Unassigned'
      if (c.assigned_to) {
        const { data: ap } = await admin
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', c.assigned_to)
          .single()
        if (ap) assignedName = `${ap.first_name ?? ''} ${ap.last_name ?? ''}`.trim() || assignedName
      }

      return [
        'CURRENT PAGE RECORD (Contact):',
        `Name: ${c.name}`,
        `Email: ${c.email ?? 'None'}`,
        `Phone: ${c.phone ?? 'None'}`,
        `Company: ${c.company_name ?? 'None'}`,
        `Type: ${(c.contact_type ?? 'unknown').replace(/_/g, ' ')}`,
        `Assigned to: ${assignedName}`,
        c.tags?.length ? `Tags: ${c.tags.join(', ')}` : '',
        dealLines.length > 0 ? `Open deals:\n${dealLines.join('\n')}` : 'Open deals: None',
        c.ai_summary ? `AI summary: ${(c.ai_summary as string).slice(0, 400)}` : '',
      ].filter(Boolean).join('\n')
    }

    if (entityType === 'ticket') {
      const { data: t } = await admin
        .from('sage_tickets')
        .select('title, status, priority, description, owner_id, contact_id, sage_contacts(name)')
        .eq('id', entityId)
        .eq('workspace_id', workspaceId)
        .single()
      if (!t) return null

      let ownerName = 'Unassigned'
      if (t.owner_id) {
        const { data: ap } = await admin
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', t.owner_id)
          .single()
        if (ap) ownerName = `${ap.first_name ?? ''} ${ap.last_name ?? ''}`.trim() || ownerName
      }

      return [
        'CURRENT PAGE RECORD (Ticket):',
        `Title: ${t.title}`,
        `Status: ${t.status}`,
        `Priority: ${t.priority}`,
        `Assigned to: ${ownerName}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (t as any).sage_contacts?.name ? `Contact: ${(t as any).sage_contacts.name}` : '',
        t.description ? `Description: ${(t.description as string).slice(0, 300)}` : '',
      ].filter(Boolean).join('\n')
    }

    if (entityType === 'pipeline') {
      const { data: p } = await admin
        .from('sage_pipelines')
        .select('name, stages:sage_pipeline_stages(name, position)')
        .eq('id', entityId)
        .eq('workspace_id', workspaceId)
        .single()
      if (!p) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stages = ((p.stages ?? []) as any[]).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      return [
        'CURRENT PAGE RECORD (Pipeline):',
        `Pipeline: ${p.name}`,
        `Stages: ${stages.map((s: { name: string }) => s.name).join(' → ')}`,
      ].join('\n')
    }

    if (entityType === 'form_submission') {
      const { data: s } = await admin
        .from('sage_form_submissions')
        .select('fields, ai_summary, ai_priority, assigned_to')
        .eq('id', entityId)
        .eq('workspace_id', workspaceId)
        .single()
      if (!s) return null

      const fields = typeof s.fields === 'object' && s.fields !== null
        ? Object.entries(s.fields as Record<string, string>).map(([k, v]) => `  ${k}: ${v}`).join('\n')
        : ''

      let assignedName = 'Unassigned'
      if (s.assigned_to) {
        const { data: ap } = await admin
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', s.assigned_to)
          .single()
        if (ap) assignedName = `${ap.first_name ?? ''} ${ap.last_name ?? ''}`.trim() || assignedName
      }

      return [
        'CURRENT PAGE RECORD (Form Submission):',
        fields ? `Fields:\n${fields}` : '',
        `Priority: ${s.ai_priority ?? 'unknown'}`,
        `Assigned to: ${assignedName}`,
        s.ai_summary ? `AI summary: ${(s.ai_summary as string).slice(0, 300)}` : '',
      ].filter(Boolean).join('\n')
    }
  } catch {
    // Best-effort — never block the query on context enrichment failure
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution layer — turns natural language into resolved IDs, then executes
// ─────────────────────────────────────────────────────────────────────────────

interface ResolveArgs {
  query:          string
  classification: SageQueryClassification
  scope:          SageAccessScope
  workspaceId:    string
  currentUserId:  string
  entityType?:    string
  entityId?:      string
}

async function resolveAndExecuteAction(args: ResolveArgs) {
  const { query, classification, scope, workspaceId } = args
  const admin = createAdminClient()
  const intent = classification.actionIntent!

  // ── assign_deal ──────────────────────────────────────────────────────────
  if (intent === 'assign_deal') {
    // 1. Resolve the contact/deal subject — AI classifier first, regex fallback
    const regexNames  = extractAssignDealNames(query)
    let contactName   = classification.filters.entity?.name ?? regexNames.contactName
    const assigneeName = classification.filters.assignee ?? regexNames.assigneeName

    if (!contactName) {
      return errorReply('I couldn\'t work out which contact\'s deal to assign. Try: "Assign [contact name] deal to [person]".')
    }
    if (!assigneeName) {
      return errorReply('I couldn\'t work out who to assign the deal to. Try: "Assign [contact name] deal to [person name]".')
    }

    // Extract email if embedded in the contact name — e.g. "Shaurya Kapoor (shaurya@gmail.com)"
    // This happens when the user clicks a disambiguation follow-up suggestion.
    const emailInName = contactName.match(/\(([^)]+@[^)]+)\)/)
    const emailFilter: string | null = emailInName ? emailInName[1].trim() : null
    if (emailInName) contactName = contactName.replace(emailInName[0], '').trim()

    // 2. Find contact(s) by name (fuzzy); if email was embedded, pin to that one contact
    let contacts: unknown[] | null = null
    if (emailFilter) {
      const { data } = await admin
        .from('sage_contacts')
        .select('id, name, email, source, created_at, company_name, business_goal')
        .eq('workspace_id', workspaceId)
        .ilike('email', emailFilter)
        .limit(1)
      contacts = data
    } else {
      const { data } = await admin
        .from('sage_contacts')
        .select('id, name, email, source, created_at, company_name, business_goal')
        .eq('workspace_id', workspaceId)
        .ilike('name', `%${contactName}%`)
        .limit(6)
      contacts = data
    }

    type ContactRow = { id: string; name: string; email: string | null; source: string | null; created_at: string; company_name: string | null; business_goal: string | null }
    type DealRow = {
      id: string
      title: string
      status: string
      created_at: string
      stage_id: string | null
      pipeline_id: string | null
      owner_id: string | null
      contact_id: string | null
      sage_pipeline_stages: { name: string } | null
      sage_pipelines: { name: string } | null
    }

    let contact: ContactRow | null = null
    let deal: DealRow | null = null

    const contactRows = (contacts ?? []) as unknown as ContactRow[]

    if (contactRows.length > 1) {
      // Disambiguate — multiple contacts match the name; embed email in suggestions
      // so follow-up clicks produce a unique, email-resolvable query
      const options = contactRows
        .map((c, i) => `${i + 1}. **${contactLabel(c)}**${c.email ? ` (${c.email})` : ''}`)
        .join('\n')
      return {
        reply: `I found ${contactRows.length} contacts matching "${contactName}". Which one did you mean?\n\n${options}\n\nClick a suggestion below or reply with the email to continue.`,
        classification,
        action:             null,
        navigateTo:         undefined,
        suggestedFollowUps: contactRows.slice(0, 4).map(c =>
          c.email
            ? `Assign ${contactLabel(c)} (${c.email}) deal to ${assigneeName}`
            : `Assign ${contactLabel(c)} deal to ${assigneeName}`
        ),
      }
    }

    if (contactRows.length === 1) {
      contact = contactRows[0]
    }

    // 3a. If we have a contact, find their open deal
    if (contact) {
      const { data: unassigned } = await admin
        .from('sage_deals')
        .select('id, title, status, created_at, stage_id, pipeline_id, owner_id, contact_id, sage_pipeline_stages(name), sage_pipelines(name)')
        .eq('workspace_id', workspaceId)
        .eq('contact_id', contact.id)
        .neq('status', 'lost')
        .is('owner_id', null)
        .order('created_at', { ascending: false })
        .limit(1)

      deal = unassigned && unassigned.length > 0
        ? (unassigned as unknown as DealRow[])[0]
        : null

      if (!deal) {
        const { data: anyDeals } = await admin
          .from('sage_deals')
          .select('id, title, status, created_at, stage_id, pipeline_id, owner_id, contact_id, sage_pipeline_stages(name), sage_pipelines(name)')
          .eq('workspace_id', workspaceId)
          .eq('contact_id', contact.id)
          .neq('status', 'lost')
          .order('created_at', { ascending: false })
          .limit(1)

        deal = anyDeals && anyDeals.length > 0
          ? (anyDeals as unknown as DealRow[])[0]
          : null
      }
    }

    // 3b. No contact found (or no deal on the contact) — try matching the query
    //     term as a deal title directly
    if (!deal) {
      const { data: dealsByTitle } = await admin
        .from('sage_deals')
        .select('id, title, status, created_at, stage_id, pipeline_id, owner_id, contact_id, sage_pipeline_stages(name), sage_pipelines(name)')
        .eq('workspace_id', workspaceId)
        .neq('status', 'lost')
        .ilike('title', `%${contactName}%`)
        .order('created_at', { ascending: false })
        .limit(6)

      const dealMatches = (dealsByTitle ?? []) as unknown as DealRow[]

      if (dealMatches.length > 1) {
        const options = dealMatches
          .map((d, i) => `${i + 1}. **${d.title}**`)
          .join('\n')
        return {
          reply: `I found ${dealMatches.length} deals matching "${contactName}". Which one did you mean?\n\n${options}\n\nReply with the exact deal title, e.g. "assign deal ${dealMatches[0].title} to ${assigneeName}".`,
          classification,
          action:             null,
          navigateTo:         undefined,
          suggestedFollowUps: dealMatches.slice(0, 4).map(d => `Assign deal ${d.title} to ${assigneeName}`),
        }
      }

      deal = dealMatches[0] ?? null

      // If the deal has a contact_id, fetch that contact for the reply/navigation
      if (deal?.contact_id) {
        const { data: cRow } = await admin
          .from('sage_contacts')
          .select('id, name, email, source, created_at')
          .eq('id', deal.contact_id)
          .single()
        contact = (cRow as ContactRow | null)
      }
    }

    if (!deal) {
      return errorReply(
        contact
          ? `${contactLabel(contact)} doesn't have any open deals to assign.`
          : `Could not find a contact or deal matching "${contactName}". Check the spelling and try again.`
      )
    }

    // 4. Find assignee by name in workspace members (two-step lookup)
    const member = await resolveWorkspaceMember(workspaceId, assigneeName)

    if (!member) {
      return errorReply(`Could not find a team member matching "${assigneeName}". Make sure they are a member of this workspace.`)
    }

    // 5. Execute assign
    const result = await executeSageAction(
      { type: 'assign_deal', params: { dealId: deal.id, assigneeId: member.userId } },
      scope,
      query,
    )

    if (!result.success) {
      return errorReply(`Could not assign the deal: ${result.error ?? 'unknown error'}.`)
    }

    // 6. Compose rich reply
    const dealDate     = formatDate(deal.created_at)
    const stageName    = deal.sage_pipeline_stages?.name ?? ''
    const pipeName     = deal.sage_pipelines?.name ?? ''
    const wasUnassigned = !deal.owner_id
    const subjectLabel = contact ? `**${contactLabel(contact)}**'s ` : ''
    const source       = contact?.source ?? null

    const reply = [
      `✓ Assigned ${subjectLabel}${wasUnassigned ? 'unassigned ' : ''}deal to **${member.fullName}**.`,
      '',
      `**Deal:** ${deal.title}`,
      pipeName ? `**Pipeline:** ${pipeName}${stageName ? ` → ${stageName}` : ''}` : '',
      source ? `**Source:** ${source}` : '',
      `**Created:** ${dealDate}`,
    ].filter(Boolean).join('\n')

    // Prefer navigating to the source form submission (shows "Assigned to X" pill).
    // Fall back to contact profile if available, else omit navigation.
    let navigateTo: string | undefined = contact ? `/sage/contacts/${contact.id}` : undefined
    const emailForLookup = contact?.email ?? null
    if (emailForLookup) {
      const { data: formSubs } = await admin
        .from('sage_form_submissions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .filter('fields->>email', 'eq', emailForLookup)
        .order('created_at', { ascending: false })
        .limit(1)
      const subId = ((formSubs ?? []) as { id: string }[])[0]?.id
      if (subId) {
        navigateTo = `/dashboard/forms/${subId}`
        // Sync assigned_to on the form submission so both dropdowns reflect the new owner
        await admin
          .from('sage_form_submissions')
          .update({ assigned_to: member.userId } as never)
          .eq('id', subId)
          .eq('workspace_id', workspaceId)
      }
    }

    return {
      reply,
      classification,
      action:    result,
      navigateTo,
      suggestedFollowUps: [
        'Show unassigned deals',
        deal.pipeline_id ? 'Open pipeline view' : 'Add deal to a pipeline',
      ],
    }
  }

  // ── assign_ticket ────────────────────────────────────────────────────────
  if (intent === 'assign_ticket') {
    const regexNames  = extractAssignTicketNames(query)
    const ticketName  = classification.filters.entity?.name ?? regexNames.ticketName
    const assigneeName = classification.filters.assignee ?? regexNames.assigneeName

    if (!ticketName || !assigneeName) {
      return errorReply('Please specify both the ticket (by title or contact name) and the person to assign it to.')
    }

    const { data: tickets } = await admin
      .from('sage_tickets')
      .select('id, title, status, priority, created_at, contact_id, sage_contacts(name)')
      .eq('workspace_id', workspaceId)
      .ilike('title', `%${ticketName}%`)
      .neq('status', 'closed')
      .limit(1)

    if (!tickets || tickets.length === 0) {
      return errorReply(`Could not find an open ticket matching "${ticketName}".`)
    }

    type TicketRow = {
      id: string; title: string; status: string; priority: string; created_at: string
      contact_id: string | null; sage_contacts: { name: string } | null
    }
    const ticket = (tickets as unknown as TicketRow[])[0]

    const member = await resolveWorkspaceMember(workspaceId, assigneeName)

    if (!member) {
      return errorReply(`Could not find a team member matching "${assigneeName}".`)
    }

    const result = await executeSageAction(
      { type: 'assign_ticket', params: { ticketId: ticket.id, assigneeId: member.userId } },
      scope,
      query,
    )

    if (!result.success) {
      return errorReply(`Could not assign the ticket: ${result.error ?? 'unknown error'}.`)
    }

    const reply = [
      `✓ Assigned ticket to **${member.fullName}**.`,
      '',
      `**Ticket:** ${ticket.title}`,
      `**Priority:** ${ticket.priority}  **Status:** ${ticket.status}`,
      ticket.sage_contacts?.name ? `**Contact:** ${ticket.sage_contacts.name}` : '',
      `**Created:** ${formatDate(ticket.created_at)}`,
    ].filter(Boolean).join('\n')

    return {
      reply,
      classification,
      action:             result,
      navigateTo:         '/sage/tickets',
      suggestedFollowUps: ['Show open tickets', 'Show unassigned tickets'],
    }
  }

  // ── move_deal_stage ──────────────────────────────────────────────────────
  if (intent === 'move_deal_stage') {
    const contactName = classification.filters.entity?.name ?? null
    const stageName   = classification.filters.status ?? classification.filters.entity?.name ?? null

    if (!contactName) {
      return errorReply('Please specify whose deal to move and which stage to move it to.')
    }

    const { data: contacts } = await admin
      .from('sage_contacts')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .ilike('name', `%${contactName}%`)
      .limit(1)

    if (!contacts || contacts.length === 0) {
      return errorReply(`Could not find a contact matching "${contactName}".`)
    }
    const contact = (contacts as { id: string; name: string }[])[0]

    const { data: deals } = await admin
      .from('sage_deals')
      .select('id, title, pipeline_id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contact.id)
      .neq('status', 'lost')
      .limit(1)

    if (!deals || deals.length === 0) {
      return errorReply(`${contact.name} doesn't have an open deal to move.`)
    }
    const deal = (deals as { id: string; title: string; pipeline_id: string | null }[])[0]

    if (!stageName) {
      return errorReply('Please specify the stage name to move the deal to.')
    }

    const { data: stages } = await admin
      .from('sage_pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', deal.pipeline_id!)
      .ilike('name', `%${stageName}%`)
      .limit(1)

    if (!stages || stages.length === 0) {
      return errorReply(`Could not find a stage matching "${stageName}" in this deal's pipeline.`)
    }
    const stage = (stages as { id: string; name: string }[])[0]

    const result = await executeSageAction(
      { type: 'move_deal_stage', params: { dealId: deal.id, stageId: stage.id } },
      scope,
      query,
    )

    if (!result.success) {
      return errorReply(`Could not move the deal: ${result.error ?? 'unknown error'}.`)
    }

    return {
      reply:              `✓ Moved **${contact.name}**'s deal "${deal.title}" to stage **${stage.name}**.`,
      classification,
      action:             result,
      navigateTo:         deal.pipeline_id ? `/sage/pipelines/${deal.pipeline_id}` : `/sage/contacts/${contact.id}`,
      suggestedFollowUps: ['Show pipeline', `Show ${contact.name}'s profile`],
    }
  }

  // ── convert_to_deal ──────────────────────────────────────────────────────
  if (intent === 'convert_to_deal') {
    const result = await executeSageAction(
      {
        type:       'convert_to_deal',
        entityType: args.entityType as 'contact' | 'conversation' | 'form_submission' | undefined,
        entityId:   args.entityId,
        params: {
          entityType:   args.entityType,
          entityId:     args.entityId,
          pipelineName: classification.filters.entity?.type === 'pipeline' ? classification.filters.entity.name : undefined,
        },
      },
      scope,
      query,
    )

    const reply = result.success ? `✓ ${result.message}` : `⚠️ ${result.message}`
    return {
      reply,
      classification,
      action:             result,
      navigateTo:         result.success ? '/sage/pipelines' : undefined,
      suggestedFollowUps: result.success
        ? ['Open pipeline view', 'Show all deals']
        : ['Try a different pipeline'],
    }
  }

  // ── create_contact ───────────────────────────────────────────────────────
  if (intent === 'create_contact') {
    // Extract name, email, phone, company from the query
    const nameMatch    = query.match(/(?:named?|called|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
    const emailMatch   = query.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)
    const phoneMatch   = query.match(/(?:phone|mobile|tel|number)[:\s]+([+\d\s()-]{7,})/i)
    const companyMatch = query.match(/(?:from|at|company|business)[:\s]+([^,.\n]+)/i)

    const extractedName    = classification.filters.entity?.name ?? nameMatch?.[1]?.trim() ?? null
    const extractedEmail   = emailMatch?.[0]   ?? null
    const extractedPhone   = phoneMatch?.[1]?.trim()   ?? null
    const extractedCompany = companyMatch?.[1]?.trim() ?? null

    if (!extractedName && !extractedEmail) {
      return errorReply('Please include at least a name or email address. E.g. "Add contact Jane Smith, jane@example.com".')
    }

    const result = await executeSageAction(
      {
        type:   'create_contact',
        params: {
          name:        extractedName    ?? extractedEmail ?? 'Unknown',
          email:       extractedEmail   ?? null,
          phone:       extractedPhone   ?? null,
          companyName: extractedCompany ?? null,
        },
      },
      scope,
      query,
    )

    if (!result.success) {
      return errorReply(`Could not create contact: ${result.error ?? 'unknown error'}.`)
    }

    const parts = [
      `✓ Contact **${extractedName ?? extractedEmail}** created.`,
      extractedEmail   ? `**Email:** ${extractedEmail}`      : '',
      extractedPhone   ? `**Phone:** ${extractedPhone}`      : '',
      extractedCompany ? `**Company:** ${extractedCompany}`  : '',
    ].filter(Boolean).join('\n')

    return {
      reply:              parts,
      classification,
      action:             result,
      navigateTo:         result.entityId ? `/sage/contacts/${result.entityId}` : '/sage/contacts',
      suggestedFollowUps: ['Create a deal for this contact', 'Add a note', 'Show all contacts'],
    }
  }

  // ── create_deal / create_task / create_reminder / etc. ──────────────────
  // For simpler create actions, pass extracted filters directly as params
  const result = await executeSageAction(
    {
      type:   intent,
      params: {
        title:     classification.filters.entity?.name ?? query.slice(0, 80),
        contactId: undefined,
        dueAt:     classification.filters.dateRange?.to ?? undefined,
        priority:  classification.filters.priority ?? undefined,
        body:      query,
      },
    },
    scope,
    query,
  )

  const reply = result.success ? `✓ ${result.message}` : `⚠️ ${result.message}`
  return {
    reply,
    classification,
    action: result,
    suggestedFollowUps: result.success ? ['What\'s on my plate today?'] : [],
  }
}

/**
 * Display name for a contact — personal name first, then company + business goal,
 * so contacts captured without a personal name still show something meaningful.
 */
function contactLabel(c: { name: string; company_name?: string | null; business_goal?: string | null }): string {
  if (c.name && c.name !== 'Unknown') return c.name
  return [c.company_name, c.business_goal].filter(Boolean).join(' — ') || c.name
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

function errorReply(message: string) {
  return {
    reply:              `⚠️ ${message}`,
    classification:     null,
    action:             null,
    suggestedFollowUps: [],
  }
}
