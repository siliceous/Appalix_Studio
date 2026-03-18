'use client'

import { useState } from 'react'

/* ─── Tooltip ───────────────────────────────────────────────────────────── */
function Tip({ label, children, dir = 'top', clickable = false }: {
  label: string; children: React.ReactNode; dir?: 'top' | 'bottom' | 'right' | 'left'; clickable?: boolean
}) {
  const [show, setShow] = useState(false)
  const wrapPos =
    dir === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-[9px]'
    : dir === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-[9px]'
    : dir === 'left'  ? 'right-full top-1/2 -translate-y-1/2 mr-[9px]'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-[9px]'
  const arrowEl =
    dir === 'bottom' ? <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
    : dir === 'right' ? <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-gray-200 rotate-45" />
    : dir === 'left'  ? <span className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-r border-t border-gray-200 rotate-45" />
    : <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45" />
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`pointer-events-none absolute ${wrapPos} z-50 w-max max-w-[200px]`}>
          <div className="relative px-3 py-2 rounded-lg bg-white text-gray-900 text-[11px] font-medium leading-snug shadow-lg border border-gray-200">
            {arrowEl}
            {clickable && <span className="text-[#15A4AE] font-bold mr-1">●</span>}{label}
          </div>
        </div>
      )}
      {clickable && show && <span className="pointer-events-none absolute -inset-0.5 rounded-lg border border-[#15A4AE]/50" />}
    </div>
  )
}

/* ─── Types & data ──────────────────────────────────────────────────────── */
type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; cls: string }> = {
  low:    { label: 'Low',    cls: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', cls: 'bg-blue-50 text-blue-700' },
  high:   { label: 'High',   cls: 'bg-amber-50 text-amber-700' },
  urgent: { label: 'Urgent', cls: 'bg-red-50 text-red-700' },
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'bg-purple-50 text-purple-700' },
  in_progress: { label: 'In Progress', cls: 'bg-green-50 text-green-700' },
  pending:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700' },
  resolved:    { label: 'Resolved',    cls: 'bg-blue-50 text-blue-700' },
  closed:      { label: 'Closed',      cls: 'bg-gray-100 text-gray-600' },
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
] as const

type DemoTicket = {
  id: string; title: string; description: string
  contact: string; time: string
  status: TicketStatus; priority: TicketPriority
}

const DEMO_TICKETS: DemoTicket[] = [
  { id: 't1', title: 'Widget not loading on mobile Safari', description: 'Chat widget fails to initialise when viewed on iPhone 15. Works fine on Chrome and desktop browsers.', contact: 'James Owens', time: '23m ago', status: 'open', priority: 'urgent' },
  { id: 't2', title: 'Billing invoice shows wrong amount', description: 'November invoice shows $299 but we\'re on the $149/mo plan. Please correct and re-issue.', contact: 'Sarah Mitchell', time: '1h ago', status: 'open', priority: 'high' },
  { id: 't3', title: 'API rate limit error on bulk import', description: 'Getting 429 responses when importing more than 500 contacts via the REST API.', contact: 'Dev Team · Nexio', time: '2h ago', status: 'in_progress', priority: 'high' },
  { id: 't4', title: 'Bot not responding after 11 PM UTC', description: 'Customers report the bot stops responding after 11 PM. May be a scheduler issue.', contact: 'Priya Sharma', time: '5h ago', status: 'in_progress', priority: 'medium' },
  { id: 't5', title: 'Request: export all leads to CSV', description: 'We need a bulk CSV export of all Meta Leads from the last 90 days.', contact: 'Tom Nguyen · GrowthCo', time: '1d ago', status: 'pending', priority: 'medium' },
  { id: 't6', title: 'Slack integration not posting updates', description: 'Ticket status changes stopped posting to #support-alerts channel since 14 Mar.', contact: 'Lisa Park', time: '2d ago', status: 'resolved', priority: 'low' },
]

const SLIDE_NOTES: Record<string, string[]> = {
  t1: ['User confirmed Safari 17.3 on iOS 17.', 'Engineer reproduced the issue — WebSocket blocked by strict CORS policy.', 'Fix merged to staging — awaiting QA sign-off.'],
  t2: ['Invoice #INV-0482 re-issued at $149.', 'Credit note sent via email.', 'Customer confirmed receipt.'],
  t3: ['Rate limit raised to 2 000 req/min for Enterprise tier.', 'Docs updated with bulk-import best practices.', 'Dev team testing — response due tomorrow.'],
  t4: ['Scheduler cron job missing UTC offset — fixed in v2.4.1.', 'Deployed to production 15 Mar 02:00 UTC.', 'Monitoring overnight — no further reports.'],
  t5: ['Export feature is on the roadmap for Q2.', 'Manual export sent for now.', 'Customer acknowledged.'],
  t6: ['Slack webhook token had expired.', 'New token generated and saved.', 'Integration confirmed working.'],
}

/* ─── Slide-over detail ─────────────────────────────────────────────────── */
function SlideOver({ ticket, onClose }: { ticket: DemoTicket; onClose: () => void }) {
  const sc = STATUS_CONFIG[ticket.status]
  const pc = PRIORITY_CONFIG[ticket.priority]
  const notes = SLIDE_NOTES[ticket.id] ?? []
  return (
    <div className="absolute inset-0 z-30 flex justify-end" onClick={onClose}>
      <div
        className="relative h-full w-[280px] bg-white border-l border-gray-200 rounded-r-xl overflow-y-auto p-5 space-y-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Ticket detail</p>
            <h3 className="text-sm font-bold text-gray-900 leading-snug">{ticket.title}</h3>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-0.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pc.cls}`}>{pc.label}</span>
          <span className={`text-[10px] px-2 py-1 rounded-lg font-semibold ${sc.cls}`}>{sc.label}</span>
        </div>
        {/* Description */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-xs text-gray-700 leading-relaxed">{ticket.description}</p>
        </div>
        {/* Contact */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</p>
          <p className="text-xs text-gray-700">{ticket.contact}</p>
        </div>
        {/* Activity */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity</p>
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#15A4AE] shrink-0" />
                <p className="text-xs text-gray-600 leading-snug">{n}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 py-1.5 text-xs font-semibold bg-[#15A4AE] text-white rounded-lg hover:bg-[#0f8a94] transition-colors">
            Reply
          </button>
          <button className="flex-1 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Exported TicketsPreview ────────────────────────────────────────────── */
export function TicketsPreview() {
  const [filter, setFilter]         = useState<string>('all')
  const [search, setSearch]         = useState('')
  const [activeTicket, setActive]   = useState<DemoTicket | null>(null)
  const [priorities, setPriorities] = useState<Record<string, TicketPriority>>(
    () => Object.fromEntries(DEMO_TICKETS.map(t => [t.id, t.priority]))
  )
  const [statuses, setStatuses] = useState<Record<string, TicketStatus>>(
    () => Object.fromEntries(DEMO_TICKETS.map(t => [t.id, t.status]))
  )

  const q = search.toLowerCase()
  const filtered = DEMO_TICKETS.filter(t => {
    const matchFilter = filter === 'all' || statuses[t.id] === filter
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.contact.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const countFor = (val: string) => val === 'all' ? DEMO_TICKETS.length : DEMO_TICKETS.filter(t => statuses[t.id] === val).length

  return (
    <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* dark macOS chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#222] border-b border-white/8">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <div className="flex-1 mx-4 bg-[#2a2a2a] rounded-md px-3 py-1 text-[11px] text-gray-500">
          app.appalix.ai/sage/tickets
        </div>
      </div>

      {/* App shell */}
      <div className="relative bg-[#f5f5f5] overflow-hidden" style={{ minHeight: 520 }}>

        {activeTicket && (
          <SlideOver ticket={activeTicket} onClose={() => setActive(null)} />
        )}

        <div className="p-6 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <Tip label="All your support tickets from every channel" dir="right">
                <h2 className="text-lg font-bold text-gray-900 cursor-default">Tickets</h2>
              </Tip>
              <p className="text-xs text-gray-500 mt-0.5">
                {DEMO_TICKETS.filter(t => statuses[t.id] === 'open').length} open · {DEMO_TICKETS.length} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tip label="Export all tickets to a CSV file">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </Tip>
              <Tip label="Create a new support ticket manually" clickable>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#15A4AE] hover:bg-[#0f8a94] text-white font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Ticket
                </button>
              </Tip>
            </div>
          </div>

          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center">
            {/* Search */}
            <Tip label="Search tickets by title, contact, or description" dir="bottom">
              <div className="relative min-w-[160px]">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tickets…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
                />
              </div>
            </Tip>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {FILTERS.map(f => (
                <Tip key={f.value} label={`Show ${f.label.toLowerCase()} tickets`} dir="bottom">
                  <button
                    onClick={() => setFilter(f.value)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                      filter === f.value
                        ? 'bg-[#15A4AE]/15 text-[#1f6157] border border-[#15A4AE]/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                    <span className="ml-1 opacity-60">{countFor(f.value)}</span>
                  </button>
                </Tip>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No tickets match this filter.</div>
              ) : filtered.map(ticket => {
                const sc = STATUS_CONFIG[statuses[ticket.id] ?? ticket.status]
                const pc = PRIORITY_CONFIG[priorities[ticket.id] ?? ticket.priority]
                const isActive = activeTicket?.id === ticket.id
                return (
                  <Tip key={ticket.id} label="Click to open ticket detail and activity log" dir="top">
                    <div
                      onClick={() => setActive(isActive ? null : ticket)}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${isActive ? 'bg-[#15A4AE]/8 ring-1 ring-inset ring-[#15A4AE]/25' : 'hover:bg-gray-50'}`}
                    >
                      {/* Checkbox */}
                      <Tip label="Select for bulk actions (merge or delete)" dir="right">
                        <input
                          type="checkbox"
                          onClick={e => e.stopPropagation()}
                          onChange={() => {}}
                          className="mt-1 w-3.5 h-3.5 rounded border-gray-300 accent-[#15A4AE] cursor-pointer shrink-0"
                        />
                      </Tip>

                      {/* Priority badge */}
                      <Tip label="Priority level — click to change" dir="bottom" clickable>
                        <select
                          value={priorities[ticket.id] ?? ticket.priority}
                          onChange={e => setPriorities(prev => ({ ...prev, [ticket.id]: e.target.value as TicketPriority }))}
                          onClick={e => e.stopPropagation()}
                          className={`mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border-0 cursor-pointer focus:outline-none ${pc.cls} shrink-0`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </Tip>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 leading-relaxed">{ticket.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {ticket.contact}
                          </span>
                          <span className="text-[10px] text-gray-400">{ticket.time}</span>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {/* Status selector */}
                        <Tip label="Ticket status — click to update" dir="left" clickable>
                          <select
                            value={statuses[ticket.id] ?? ticket.status}
                            onChange={e => setStatuses(prev => ({ ...prev, [ticket.id]: e.target.value as TicketStatus }))}
                            className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold border-0 cursor-pointer focus:outline-none ${sc.cls}`}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </Tip>

                        {/* Assign */}
                        <Tip label="Assign to a team member" dir="left" clickable>
                          <select
                            onClick={e => e.stopPropagation()}
                            onChange={() => {}}
                            className="text-[10px] pl-2 pr-5 py-0.5 rounded-lg border border-gray-200 text-gray-500 bg-white cursor-pointer focus:outline-none max-w-[90px]"
                          >
                            <option>Unassigned</option>
                            <option>Amy C.</option>
                            <option>Ben T.</option>
                            <option>Clara M.</option>
                          </select>
                        </Tip>

                        {/* Edit */}
                        <Tip label="Open full ticket detail" dir="left">
                          <button
                            onClick={() => setActive(isActive ? null : ticket)}
                            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </Tip>

                        {/* Delete */}
                        <Tip label="Delete this ticket permanently" dir="left">
                          <button className="p-1 rounded-lg hover:bg-red-50 transition-colors">
                            <svg className="w-3.5 h-3.5 text-gray-300 hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Tip>
                      </div>
                    </div>
                  </Tip>
                )
              })}
            </div>
          </div>

        </div>{/* /p-6 */}
      </div>{/* /app shell */}
    </div>
  )
}
