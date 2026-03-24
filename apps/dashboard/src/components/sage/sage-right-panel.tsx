'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sparkles, Send, Mic, MicOff, X, Maximize2, Minimize2, Paperclip, Bell, CalendarDays, Calendar } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface SageAlert {
  id:         string
  alertType:  string
  title:      string
  body?:      string
  priority:   'high' | 'medium' | 'low'
  createdAt:  string
}

interface BriefingSection {
  title: string
  items: string[]
  icon?: string
}

interface SageBriefing {
  type:     'daily' | 'weekly'
  content:  string
  sections: BriefingSection[]
  stats:    Record<string, number | string>
}

type PanelTab = 'chat' | 'alerts' | 'today' | 'week'

const PRO_PLANS = ['pro', 'team', 'enterprise']

interface SageRightPanelProps {
  workspaceId: string
  plan?:        string
  trialEndsAt?: string | null
}

type PanelState = 'closed' | 'open' | 'expanded'

const ALERT_PRIORITY_COLOR: Record<string, string> = {
  high:   'text-red-400 bg-red-500/10 border-red-500/20',
  medium: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  low:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

function getContextLabel(pathname: string): string {
  if (pathname.includes('/sage/contacts/')) return 'Contact detail'
  if (pathname.includes('/sage/pipelines/')) return 'Pipeline detail'
  if (pathname.includes('/sage/tickets/'))  return 'Ticket detail'
  if (pathname.includes('/conversations/')) return 'Conversation detail'
  if (pathname.includes('/dashboard/forms/')) return 'Form submission detail'
  if (pathname === '/dashboard')             return 'Dashboard overview'
  if (pathname === '/dashboard/email')       return 'Email triage'
  if (pathname === '/dashboard/bots')        return 'Bot conversations'
  if (pathname === '/dashboard/forms')       return 'Form submissions'
  if (pathname === '/dashboard/tickets')     return 'Ticket triage'
  if (pathname === '/sage/contacts')         return 'Contacts'
  if (pathname === '/sage/pipelines')        return 'Pipelines / CRM'
  if (pathname === '/sage/tickets')          return 'Tickets'
  if (pathname === '/sage/emails')           return 'Email inbox'
  if (pathname === '/sage/integrations')     return 'Integrations'
  if (pathname === '/sage/rules')            return 'Automation rules'
  if (pathname === '/sage/roi')              return 'ROI analytics'
  if (pathname === '/analytics')             return 'Analytics'
  if (pathname === '/my-activity')           return 'My activity'
  if (pathname === '/bots')                  return 'Bot management'
  if (pathname === '/forms')                 return 'Forms'
  if (pathname === '/conversations')         return 'Conversations'
  if (pathname.startsWith('/settings'))      return 'Settings'
  if (pathname.startsWith('/integrations'))  return 'Integrations setup'
  return 'Workspace'
}

function buildPageContext(pathname: string): string {
  // Detail pages
  if (pathname.includes('/sage/contacts/')) {
    return `You are on a CONTACT DETAIL page. The user is viewing a specific contact's profile including their name, email, phone, company, AI-generated summary, open deals, tickets, and activity history. You can help them understand this contact, suggest next actions, or navigate elsewhere. To navigate: /sage/contacts (all contacts), /sage/pipelines (deals).`
  }
  if (pathname.includes('/sage/pipelines/')) {
    return `You are on a PIPELINE DETAIL page showing a specific sales pipeline as a Kanban board with deal cards organized by stage. The user can move deals between stages, open deal details, and manage their pipeline. You can help interpret deal status or suggest next steps.`
  }
  if (pathname.includes('/sage/tickets/')) {
    return `You are on a TICKET DETAIL page showing a specific support ticket including its status, priority, contact info, description, and activity log. You can help triage, suggest responses, or navigate to related contacts/deals.`
  }
  if (pathname.includes('/conversations/')) {
    return `You are on a CONVERSATION DETAIL page showing a full chat transcript between a bot and a visitor. The right panel shows AI triage insights, detected contact details, and action buttons (Create Lead, Create Ticket, Reply by Email). You can help interpret the conversation or suggest the right action.`
  }
  if (pathname.includes('/dashboard/forms/')) {
    return `You are on a FORM SUBMISSION DETAIL page showing a specific form submission with all submitted fields, AI analysis, priority, and action buttons (Add a Deal, Add Ticket, Reply by Email). You can help interpret the submission or guide the user to take action.`
  }

  // Main section pages
  switch (pathname) {
    case '/dashboard':
      return `You are on the MAIN DASHBOARD — the central hub showing: an activity feed of recent emails, bot conversations, form submissions and tickets; quick-action cards; Sage Auto settings (auto-create leads/tickets from emails); an upcoming meetings panel; and pipeline/deal summaries. The user can manage their whole workspace from here. Available quick navigations: /dashboard/email, /dashboard/bots, /dashboard/forms, /sage/contacts, /sage/pipelines, /sage/tickets.`

    case '/dashboard/email':
      return `You are on the EMAIL TRIAGE page. This shows all unread inbound emails sorted by AI priority (high/medium/low). For each email the AI has suggested an action: Create Lead, Update Lead, Create Ticket, or Ignore. The user can also filter by date range (today/yesterday/7d/30d), sync new emails, and view a team activity sidebar. Managers can use "View as" to see a team member's inbox.`

    case '/dashboard/bots':
      return `You are on the BOT CONVERSATIONS TRIAGE page. It shows a 3-column layout: bot list on the left, conversation list in the middle, and a detail card on the right when a conversation is selected. Each conversation has an AI summary, extracted contact details, priority badge, and action buttons (Create Lead with pipeline picker, Create Ticket, Ignore). The user can also bulk-delete conversations and trigger AI analysis.`

    case '/dashboard/forms':
      return `You are on the FORM SUBMISSIONS TRIAGE page. It shows forms on the left, submissions in the middle, and a detail panel on the right. Each submission has AI analysis, priority, extracted fields, and action buttons (Create Lead with pipeline picker, Create Ticket, Email, Ignore). Submissions can be embedded on any website to capture leads automatically.`

    case '/dashboard/tickets':
      return `You are on the TICKET TRIAGE DASHBOARD showing support tickets that need attention, sorted by priority. The user can filter, assign, and manage tickets here.`

    case '/sage/contacts':
      return `You are on the CONTACTS page — a CRM list of all contacts (leads, customers, prospects) in the workspace. Each contact shows name, email, company, lead score, and tags. The user can search, filter by source/tag/score, add new contacts manually, and click any contact to open their full profile. Related pages: /sage/pipelines (deals), /sage/tickets (support).`

    case '/sage/pipelines':
      return `You are on the PIPELINES page showing all sales pipelines as Kanban boards. Each pipeline has stages (e.g. New Lead → Qualified → Proposal → Won). Deal cards show contact name, value, and age. The user can drag deals between stages, create new deals, open deal details, and manage pipeline stages. Related: /sage/contacts.`

    case '/sage/tickets':
      return `You are on the TICKETS page — a list of all support tickets across the workspace. Each ticket shows title, priority (low/medium/high/urgent), status (open/in-progress/resolved/closed), contact, and created date. The user can filter, sort, open ticket details, and create new tickets. Related: /sage/contacts.`

    case '/sage/emails':
      return `You are on the EMAIL INBOX — redirects to /dashboard/email for the full triage experience.`

    case '/sage/integrations':
      return `You are on the INTEGRATIONS page where the user can connect Gmail, Microsoft Outlook, Slack, WhatsApp, Facebook, Stripe, and other platforms. Each integration shows its connection status and setup instructions. Connected integrations power email sync, lead capture, and billing features.`

    case '/sage/rules':
      return `You are on the AUTOMATION RULES page. The user can create rules that automatically trigger actions when conditions are met — e.g. "When a new email arrives from a domain, auto-create a lead" or "When a deal reaches a stage, send a notification". Rules reduce manual triage work.`

    case '/sage/roi':
      return `You are on the ROI ANALYTICS page showing the business value Sage has generated: leads captured, deals created, tickets resolved, time saved, and revenue influenced. Charts show trends over time.`

    case '/analytics':
      return `You are on the ANALYTICS page showing workspace-wide metrics: message volume, bot performance, form conversion rates, email response times, and deal velocity. The user can filter by date range and export data.`

    case '/my-activity':
      return `You are on the MY ACTIVITY page showing a personal log of all actions the current user has taken: deals created, tickets resolved, emails sent, contacts added. Useful for reviewing personal productivity.`

    case '/bots':
      return `You are on the BOT MANAGEMENT page — a list of all AI bots in the workspace. Each bot has a name, type (sales/support/FAQ), connected platforms, and performance stats. The user can create new bots, edit bot training content, and manage platform connections. Bot conversations appear at /dashboard/bots.`

    case '/forms':
      return `You are on the FORMS MANAGEMENT page showing all embedded contact forms. The user can create new forms, get embed codes for their website, view analytics, and manage form fields. Submissions appear at /dashboard/forms.`

    case '/conversations':
      return `You are on the CONVERSATIONS page — a list of all bot chat conversations across all bots and platforms. The user can filter by bot, platform, date, and priority. Click any conversation to see the full transcript and take action.`

    default:
      if (pathname.startsWith('/settings')) {
        return `You are on a SETTINGS page (${pathname}). Settings include: profile, team members, workspace branding, billing/upgrade, notification preferences, and API keys. Navigate: /settings/profile, /settings/upgrade.`
      }
      if (pathname.startsWith('/integrations')) {
        return `You are on an INTEGRATIONS SETUP page (${pathname}) for connecting a specific platform to the workspace.`
      }
      return `You are in the Appalix workspace dashboard (${pathname}). You can help the user navigate to any section, answer questions about their data, or take actions.`
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Render **bold** markers and line breaks inside a chat bubble */
function renderContent(text: string): React.ReactNode {
  return text.split('\n').map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={li}>
        {li > 0 && <br />}
        {parts.map((p, pi) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={pi} className="font-semibold text-inherit">{p.slice(2, -2)}</strong>
            : p,
        )}
      </span>
    )
  })
}

const STARTER_PROMPTS = [
  "What's on my plate today?",
  'Show high-priority open deals',
  'Which deals are closing this week?',
  'Find contact by name or email',
]

// ── Navigation intent detection ───────────────────────────────────────────────
const NAV_INTENTS: [RegExp, string][] = [
  [/\b(contacts?|people)\b/i,                '/sage/contacts'],
  [/\b(pipeline|pipelines|crm|deals?)\b/i,   '/sage/pipelines'],
  [/\b(tickets?|support)\b/i,                '/sage/tickets'],
  [/\b(email|emails|inbox)\b/i,              '/dashboard/email'],
  [/\b(bot|bots|conversations?)\b/i,         '/dashboard/bots'],
  [/\b(forms?|submissions?)\b/i,             '/dashboard/forms'],
  [/\b(dashboard|home|overview)\b/i,         '/dashboard'],
  [/\b(analytics|reports?|stats?)\b/i,       '/analytics'],
  [/\b(activity|my.activity)\b/i,            '/my-activity'],
  [/\b(settings?|profile)\b/i,               '/settings/profile'],
  [/\b(integrations?)\b/i,                   '/sage/integrations'],
  [/\b(rules?|automations?)\b/i,             '/sage/rules'],
]

const NAV_TRIGGER = /\b(go|take me|navigate|open|show me|bring me|redirect|visit|switch)\b.{0,30}\b(to|the|my)?\b/i

function detectNavTarget(text: string): string | null {
  if (!NAV_TRIGGER.test(text)) return null
  for (const [pattern, route] of NAV_INTENTS) {
    if (pattern.test(text)) return route
  }
  return null
}

/** Extract the entity type and ID from the current pathname for live context */
function extractPageEntity(pathname: string): { entityType: string | null; entityId: string | null } {
  const contactMatch = pathname.match(/\/sage\/contacts\/([^/?#]+)/)
  if (contactMatch) return { entityType: 'contact', entityId: contactMatch[1] }

  const ticketMatch = pathname.match(/\/sage\/tickets\/([^/?#]+)/)
  if (ticketMatch) return { entityType: 'ticket', entityId: ticketMatch[1] }

  const pipelineMatch = pathname.match(/\/sage\/pipelines\/([^/?#]+)/)
  if (pipelineMatch) return { entityType: 'pipeline', entityId: pipelineMatch[1] }

  const formMatch = pathname.match(/\/dashboard\/forms\/([^/?#]+)/)
  if (formMatch) return { entityType: 'form_submission', entityId: formMatch[1] }

  const convMatch = pathname.match(/\/conversations\/([^/?#]+)/)
  if (convMatch) return { entityType: 'conversation', entityId: convMatch[1] }

  return { entityType: null, entityId: null }
}

const PAGE_LABELS: Record<string, string> = {
  '/sage/contacts':     'Contacts',
  '/sage/pipelines':    'Pipelines',
  '/sage/tickets':      'Tickets',
  '/dashboard/email':   'Email Inbox',
  '/dashboard/bots':    'Bot Conversations',
  '/dashboard/forms':   'Form Submissions',
  '/dashboard':         'Dashboard',
  '/analytics':         'Analytics',
  '/my-activity':       'Activity',
  '/settings/profile':  'Settings',
  '/sage/integrations': 'Integrations',
  '/sage/rules':        'Rules',
}

export function SageRightPanel({ workspaceId, plan = 'starter', trialEndsAt }: SageRightPanelProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const isTrialActive = trialEndsAt != null && new Date(trialEndsAt) > new Date()
  const isLocked      = !PRO_PLANS.includes(plan) && !isTrialActive

  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [activeTab,  setActiveTab]  = useState<PanelTab>('chat')
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [listening,  setListening]  = useState(false)
  const [panelSize,  setPanelSize]  = useState({ w: 380, h: 560 })

  // Alerts tab
  const [alerts,        setAlerts]        = useState<SageAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsFetched, setAlertsFetched] = useState(false)

  // Briefings
  const [dailyBriefing,   setDailyBriefing]   = useState<SageBriefing | null>(null)
  const [weeklyBriefing,  setWeeklyBriefing]  = useState<SageBriefing | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [followUps,       setFollowUps]       = useState<string[]>([])

  const bottomRef      = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    // Panel is anchored bottom-right, so dragging top-left corner changes w/h
    const startX = e.clientX
    const startY = e.clientY
    const startW = panelSize.w
    const startH = panelSize.h
    function onMove(ev: MouseEvent) {
      const newW = Math.max(300, Math.min(window.innerWidth  - 48, startW - (ev.clientX - startX)))
      const newH = Math.max(400, Math.min(window.innerHeight - 100, startH - (ev.clientY - startY)))
      setPanelSize({ w: newW, h: newH })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (panelState === 'closed') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'm' || e.key === 'M') toggleVoice()
      if (e.key === 'Escape') setPanelState('closed')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelState, listening])

  useEffect(() => {
    function onSageOpen(e: Event) {
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt ?? ''
      setPanelState('open')
      if (prompt) setTimeout(() => setInput(prompt), 150)
    }
    window.addEventListener('sage:open', onSageOpen)
    return () => window.removeEventListener('sage:open', onSageOpen)
  }, [])

  const fetchAlerts = useCallback(async () => {
    if (alertsFetched || alertsLoading) return
    setAlertsLoading(true)
    try {
      const res  = await fetch(`/api/sage/alerts?workspace_id=${workspaceId}`)
      const data = await res.json()
      setAlerts(data.alerts ?? [])
      setAlertsFetched(true)
    } catch {
      // silently fail
    } finally {
      setAlertsLoading(false)
    }
  }, [workspaceId, alertsFetched, alertsLoading])

  const fetchBriefing = useCallback(async (type: 'daily' | 'weekly') => {
    if (briefingLoading) return
    setBriefingLoading(true)
    try {
      const res  = await fetch(`/api/sage/briefing/${type}?workspace_id=${workspaceId}`)
      const data = await res.json()
      if (type === 'daily')  setDailyBriefing(data.briefing ?? null)
      if (type === 'weekly') setWeeklyBriefing(data.briefing ?? null)
    } catch {
      // silently fail
    } finally {
      setBriefingLoading(false)
    }
  }, [workspaceId, briefingLoading])

  // Auto-load alerts / briefing when tab is opened
  useEffect(() => {
    if (activeTab === 'alerts' && !alertsFetched) fetchAlerts()
    if (activeTab === 'today'  && !dailyBriefing)  fetchBriefing('daily')
    if (activeTab === 'week'   && !weeklyBriefing)  fetchBriefing('weekly')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    // Numbered disambiguation: if user types "1"–"9" and follow-ups exist,
    // silently remap to the corresponding follow-up query
    let effectiveQuery = trimmed
    if (/^[1-9]$/.test(trimmed) && followUps.length >= parseInt(trimmed, 10)) {
      effectiveQuery = followUps[parseInt(trimmed, 10) - 1]
    }

    const now = new Date().toISOString()
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: now }])
    setInput('')
    setLoading(true)
    setFollowUps([])
    setActiveTab('chat')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Navigation shortcut — handle client-side before hitting AI
    const navTarget = detectNavTarget(effectiveQuery)
    if (navTarget) {
      router.push(navTarget)
      setMessages(prev => [...prev, { role: 'assistant', content: `Navigating you to ${PAGE_LABELS[navTarget] ?? navTarget}…`, timestamp: new Date().toISOString() }])
      setLoading(false)
      return
    }

    const { entityType, entityId } = extractPageEntity(pathname)

    try {
      const res  = await fetch('/api/sage/query', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          workspace_id: workspaceId,
          query:        effectiveQuery,
          pageContext:  buildPageContext(pathname),
          entityType:   entityType ?? undefined,
          entityId:     entityId   ?? undefined,
        }),
      })
      if (!res.ok) {
        // Fall back to /api/copilot for non-intelligence responses (e.g. plan gate)
        const errData = await res.json()
        if (errData.error === 'upgrade_required') {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Sage Intelligence requires a Pro plan or above. Upgrade at Settings → Billing.', timestamp: new Date().toISOString() }])
          setLoading(false)
          return
        }
        throw new Error(errData.error ?? 'Query failed')
      }
      const data = await res.json() as { reply: string; navigateTo?: string; suggestedFollowUps?: string[] }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'No response.', timestamp: new Date().toISOString() }])
      if (data.suggestedFollowUps?.length) setFollowUps(data.suggestedFollowUps)
      // After action: refresh in place if on the same page, otherwise navigate
      if (data.navigateTo) {
        setTimeout(() => {
          const target = data.navigateTo!
          // Strip query params/hash for comparison
          const currentBase = pathname.split('?')[0].split('#')[0]
          const targetBase  = target.split('?')[0].split('#')[0]
          if (targetBase === currentBase) {
            router.refresh()
          } else {
            router.push(target)
          }
        }, 1800)
      }
    } catch {
      // Last-resort fallback to /api/copilot (Fastify proxy or direct Claude)
      try {
        const fallbackRes  = await fetch('/api/copilot', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ workspaceId, messages: [{ role: 'user', content: trimmed }], context: buildPageContext(pathname) }),
        })
        const fallbackData = await fallbackRes.json()
        setMessages(prev => [...prev, { role: 'assistant', content: fallbackData.reply ?? 'No response.', timestamp: new Date().toISOString() }])
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', timestamp: new Date().toISOString() }])
      }
    } finally {
      setLoading(false)
    }
  }, [loading, pathname, workspaceId, router])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 512000) { setInput(prev => prev + (prev ? ' ' : '') + '[File too large — max 500 KB]'); return }
    setInput(prev => prev + (prev ? ' ' : '') + '[File: ' + file.name + ']')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  function toggleVoice() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' + t : t))
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
      }
    }
    rec.onend   = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  // ── Locked ────────────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <a
        href="/settings/upgrade"
        title="Sage AI — Pro feature. Upgrade to unlock."
        className="fixed bottom-6 right-6 z-[100] w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 shadow-lg flex items-center justify-center opacity-60 hover:opacity-80 transition-opacity"
      >
        <Sparkles className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </a>
    )
  }

  const isExpanded = panelState === 'expanded'

  return (
    <>
      {/* ── Launcher button (always visible) ─────────────────────────── */}
      <button
        onClick={() => setPanelState(s => s === 'closed' ? 'open' : 'closed')}
        title="Open Sage AI"
        className="fixed bottom-6 right-6 z-[101] w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 bg-gradient-to-br from-[#15A4AE] to-[#0d7a83] hover:scale-110"
      >
        <Sparkles className="w-5 h-5 text-white" />
      </button>

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      {panelState !== 'closed' && (
        <div
          className="fixed z-[100] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#232323] transition-all duration-200"
          style={{
            bottom:   80,
            right:    24,
            width:    panelSize.w,
            height:   panelSize.h,
            fontFamily: 'var(--font-poppins), sans-serif',
          }}
        >
          {/* Top-left resize handle */}
          <div
            onMouseDown={startResize}
            title="Drag to resize"
            className="absolute top-0 left-0 w-6 h-6 z-10 cursor-nw-resize flex items-start justify-start p-1.5 group"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/30 group-hover:text-[#15A4AE] transition-colors">
              <line x1="1" y1="9" x2="9" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="5" x2="5" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Header */}
          <div className="bg-[#141c2b] shrink-0">
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#15A4AE] to-[#0d7a83] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-white leading-tight">Sage AI</p>
                <p className="text-[11px] text-white/50 truncate">{getContextLabel(pathname)}</p>
              </div>
              <button
                onClick={() => {
                  if (isExpanded) {
                    setPanelSize({ w: 380, h: 560 })
                    setPanelState('open')
                  } else {
                    setPanelSize({ w: 560, h: 680 })
                    setPanelState('expanded')
                  }
                }}
                title={isExpanded ? 'Restore' : 'Expand'}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                {isExpanded
                  ? <Minimize2 className="w-4 h-4 text-white/80" />
                  : <Maximize2 className="w-4 h-4 text-white/80" />
                }
              </button>
              <button
                onClick={() => setPanelState('closed')}
                title="Close"
                className="p-1.5 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <X className="w-4 h-4 text-white/80 hover:text-red-300" />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex border-t border-white/10">
              {([
                { id: 'chat',   label: 'Chat',    icon: <Sparkles className="w-3 h-3" /> },
                { id: 'alerts', label: 'Alerts',  icon: <Bell className="w-3 h-3" /> },
                { id: 'today',  label: 'Today',   icon: <CalendarDays className="w-3 h-3" /> },
                { id: 'week',   label: 'Week',    icon: <Calendar className="w-3 h-3" /> },
              ] as { id: PanelTab; label: string; icon: React.ReactNode }[]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#15A4AE] border-b-2 border-[#15A4AE]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col mx-2 mt-2 mb-0 rounded-xl border-y border-gray-200 dark:border-white/10 border-x-[3px] border-x-[#15A4AE]/30 bg-[#f8f7f4] dark:bg-[#1e1e1e]">

            {/* ── CHAT TAB ── */}
            {activeTab === 'chat' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[12px] text-gray-400 dark:text-gray-500 px-1">Quick questions</p>
                    {STARTER_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => send(prompt)}
                        className="w-full text-left text-[13px] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/8 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                    <div className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#141c2b] dark:bg-white/10 text-white'
                        : 'bg-white dark:bg-white/8 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200'
                    }`}>
                      {m.role === 'assistant' ? renderContent(m.content) : m.content}
                    </div>
                    <span className="text-[11px] text-gray-400/80 dark:text-gray-500/80 mt-1 px-1">
                      {formatTime(m.timestamp)}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex flex-col items-start">
                    <div className="bg-white dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested follow-ups */}
                {!loading && followUps.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1">Suggested</p>
                    {followUps.map((fu, i) => (
                      <button
                        key={`${fu}-${i}`}
                        onClick={() => send(fu)}
                        className="w-full text-left text-[12px] px-3 py-1.5 rounded-lg border border-[#15A4AE]/20 text-[#15A4AE] hover:bg-[#15A4AE]/10 transition-colors"
                      >
                        {fu}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}

            {/* ── ALERTS TAB ── */}
            {activeTab === 'alerts' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {alertsLoading && (
                  <div className="flex justify-center pt-8">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                {!alertsLoading && alerts.length === 0 && (
                  <div className="text-center pt-10">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-3 opacity-40" />
                    <p className="text-[13px] text-gray-400">No active alerts</p>
                    <p className="text-[11px] text-gray-500 mt-1">Sage will surface stale deals, overdue tasks, and more here.</p>
                  </div>
                )}
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border px-3 py-2.5 ${ALERT_PRIORITY_COLOR[alert.priority] ?? ALERT_PRIORITY_COLOR.low}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-[13px] font-medium leading-snug">{alert.title}</p>
                        {alert.body && <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{alert.body}</p>}
                      </div>
                      <span className="text-[10px] opacity-60 shrink-0 pt-0.5 capitalize">{alert.priority}</span>
                    </div>
                  </div>
                ))}
                {!alertsLoading && alertsFetched && (
                  <button
                    onClick={() => { setAlertsFetched(false); setAlerts([]) }}
                    className="w-full text-[11px] text-gray-500 hover:text-gray-300 py-2 transition-colors"
                  >
                    Refresh alerts
                  </button>
                )}
              </div>
            )}

            {/* ── TODAY TAB ── */}
            {activeTab === 'today' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {briefingLoading && (
                  <div className="flex justify-center pt-8">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                {!briefingLoading && !dailyBriefing && (
                  <div className="text-center pt-10">
                    <CalendarDays className="w-8 h-8 text-gray-400 mx-auto mb-3 opacity-40" />
                    <p className="text-[13px] text-gray-400">No daily briefing yet</p>
                    <button
                      onClick={() => fetchBriefing('daily')}
                      className="mt-3 text-[12px] px-4 py-1.5 rounded-lg bg-[#15A4AE]/20 text-[#15A4AE] hover:bg-[#15A4AE]/30 transition-colors"
                    >
                      Generate Today&apos;s Briefing
                    </button>
                  </div>
                )}
                {dailyBriefing && (
                  <>
                    {dailyBriefing.sections.map((section, i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                        <p className="text-[12px] font-semibold text-white mb-1.5">
                          {section.icon && <span className="mr-1">{section.icon}</span>}{section.title}
                        </p>
                        <ul className="space-y-1">
                          {section.items.map((item, j) => (
                            <li key={j} className="text-[12px] text-gray-400 leading-snug flex gap-1.5">
                              <span className="text-[#15A4AE] mt-0.5 shrink-0">·</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {dailyBriefing.stats && Object.keys(dailyBriefing.stats).length > 0 && (
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                        <p className="text-[12px] font-semibold text-white mb-1.5">Stats</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(dailyBriefing.stats).map(([k, v]) => (
                            <div key={k} className="text-center">
                              <p className="text-[16px] font-bold text-[#15A4AE]">{v}</p>
                              <p className="text-[10px] text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { setDailyBriefing(null); fetchBriefing('daily') }}
                      className="w-full text-[11px] text-gray-500 hover:text-gray-300 py-2 transition-colors"
                    >
                      Refresh briefing
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── WEEK TAB ── */}
            {activeTab === 'week' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {briefingLoading && (
                  <div className="flex justify-center pt-8">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-[#15A4AE] rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                {!briefingLoading && !weeklyBriefing && (
                  <div className="text-center pt-10">
                    <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-3 opacity-40" />
                    <p className="text-[13px] text-gray-400">No weekly briefing yet</p>
                    <button
                      onClick={() => fetchBriefing('weekly')}
                      className="mt-3 text-[12px] px-4 py-1.5 rounded-lg bg-[#15A4AE]/20 text-[#15A4AE] hover:bg-[#15A4AE]/30 transition-colors"
                    >
                      Generate This Week&apos;s Briefing
                    </button>
                  </div>
                )}
                {weeklyBriefing && (
                  <>
                    {weeklyBriefing.sections.map((section, i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                        <p className="text-[12px] font-semibold text-white mb-1.5">
                          {section.icon && <span className="mr-1">{section.icon}</span>}{section.title}
                        </p>
                        <ul className="space-y-1">
                          {section.items.map((item, j) => (
                            <li key={j} className="text-[12px] text-gray-400 leading-snug flex gap-1.5">
                              <span className="text-[#15A4AE] mt-0.5 shrink-0">·</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {weeklyBriefing.stats && Object.keys(weeklyBriefing.stats).length > 0 && (
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                        <p className="text-[12px] font-semibold text-white mb-1.5">This Week</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(weeklyBriefing.stats).map(([k, v]) => (
                            <div key={k} className="text-center">
                              <p className="text-[16px] font-bold text-[#15A4AE]">{v}</p>
                              <p className="text-[10px] text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { setWeeklyBriefing(null); fetchBriefing('weekly') }}
                      className="w-full text-[11px] text-gray-500 hover:text-gray-300 py-2 transition-colors"
                    >
                      Refresh briefing
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Input — always visible; sending from a non-chat tab switches to chat */}
          <div className="px-3 pb-3 pt-2 bg-white dark:bg-[#1c1c1c] shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/8 px-3 py-2 focus-within:border-[#15A4AE]/50 focus-within:ring-2 focus-within:ring-[#15A4AE]/10 transition-all">
              <button
                onClick={toggleVoice}
                title={listening ? 'Stop listening' : 'Speak to Sage'}
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  listening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'text-gray-500 hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKey}
                placeholder={listening ? 'Listening…' : 'Ask Sage…'}
                disabled={loading}
                className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none outline-none leading-relaxed max-h-[120px]"
                style={{ fontFamily: 'var(--font-poppins), sans-serif' }}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-gray-500 hover:text-[#15A4AE] hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 rounded-lg bg-[#141c2b] hover:bg-[#1e2d45] dark:bg-[#15A4AE] dark:hover:bg-[#0d7a83] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center mt-1.5">
              Press <kbd className="font-mono bg-gray-200 dark:bg-white/10 px-0.5 rounded">M</kbd> for mic · Enter to send · Esc to close
            </p>
          </div>
        </div>
      )}
    </>
  )
}
