'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FadeUp, ScrollReveal } from '@/components/marketing/animate'

/* ─── Tooltip ───────────────────────────────────────────────────────────── */
function Tip({ label, children, dir = 'top', clickable = false }: {
  label: string; children: React.ReactNode; dir?: 'top' | 'bottom' | 'right'; clickable?: boolean
}) {
  const [show, setShow] = useState(false)
  const wrapPos = dir === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-[9px]'
    : dir === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-[9px]'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-[9px]'
  const arrowEl = dir === 'bottom'
    ? <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
    : dir === 'right'
    ? <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-gray-200 rotate-45" />
    : <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-gray-200 rotate-45" />
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`pointer-events-none absolute ${wrapPos} z-40 w-max max-w-[200px]`}>
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

/* ─── Form data ─────────────────────────────────────────────────────────── */
const FORMS = [
  { id: 1, name: 'Demo Request',     submissions: 24, new: 8,  color: 'green',  icon: '🎯' },
  { id: 2, name: 'Contact Us',       submissions: 61, new: 3,  color: 'blue',   icon: '✉' },
  { id: 3, name: 'Newsletter',       submissions: 189,new: 12, color: 'purple', icon: '📧' },
  { id: 4, name: 'Hiring Enquiry',   submissions: 11, new: 2,  color: 'amber',  icon: '💼' },
]

type Submission = {
  name: string; company: string; email: string; phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'disqualified'
  enriched: boolean; crm: boolean; time: string; msg: string
}

const SUBMISSIONS: Record<number, Submission[]> = {
  1: [
    { name: 'Sarah Mitchell',  company: 'Acme Corp',    email: 'sarah@acmecorp.com',     phone: '+1 555 0142', status: 'new',          enriched: true, crm: true,  time: '11m', msg: 'Looking to replace our current live chat tool. We have 12 agents.' },
    { name: 'Carlos Rivera',   company: 'Fintech.io',   email: 'carlos@fintech.io',      phone: '+1 555 0289', status: 'contacted',    enriched: true, crm: true,  time: '1h',  msg: 'Interested in the Enterprise plan for our support team of 30+.' },
    { name: 'Luca Bianchi',    company: 'Bianchi SRL',  email: 'luca@bianchi.it',        phone: '+39 02 1234', status: 'qualified',    enriched: true, crm: true,  time: '3h',  msg: 'Need Italian language support. Is that available?' },
    { name: 'Aiko Tanaka',     company: 'TanakaCorp',   email: 'aiko@tanakacorp.co.jp',  phone: '+81 3 9876',  status: 'new',          enriched: false,crm: false, time: '5h',  msg: 'Can this integrate with Salesforce?' },
    { name: 'James Wu',        company: 'WuTech',       email: 'james@wutech.com',       phone: '+1 555 0371', status: 'disqualified', enriched: true, crm: false, time: '1d',  msg: 'Just exploring options, not ready to buy.' },
  ],
  2: [
    { name: 'Oliver Park',     company: 'Parkside',     email: 'oliver@parkside.com',    phone: '+44 20 7123', status: 'new',       enriched: true, crm: true,  time: '2h',  msg: 'Question about pricing for a non-profit organisation.' },
    { name: 'Maria Rossi',     company: 'RossiGroup',   email: 'maria@rossigroup.it',    phone: '+39 06 5678', status: 'contacted', enriched: true, crm: true,  time: '4h',  msg: 'We want to white-label the product for our clients.' },
  ],
  3: [
    { name: 'Tom Reid',        company: 'Reid Media',   email: 'tom@reidmedia.com',      phone: '',            status: 'new',       enriched: true, crm: false, time: '5m',  msg: '' },
    { name: 'Amy Chen',        company: 'Chen Ventures',email: 'amy@chenv.com',          phone: '',            status: 'new',       enriched: true, crm: false, time: '22m', msg: '' },
  ],
  4: [
    { name: 'Priya Sharma',    company: 'Independent',  email: 'priya@email.com',        phone: '+1 555 0198', status: 'new',       enriched: true, crm: false, time: '3h',  msg: '5 years of customer success experience.' },
  ],
}

const STATUS_MAP = {
  new:          { label: 'New',          cls: 'bg-green-100 text-green-700' },
  contacted:    { label: 'Contacted',    cls: 'bg-blue-100 text-blue-700'   },
  qualified:    { label: 'Qualified',    cls: 'bg-purple-100 text-purple-700' },
  disqualified: { label: 'Disqualified', cls: 'bg-gray-100 text-gray-500'   },
}

/* ─── Forms Preview ─────────────────────────────────────────────────────── */
function FormsPreview({ onClick }: { onClick: () => void }) {
  const [selectedForm, setSelectedForm] = useState(1)
  const [selected,     setSelected]     = useState<Submission | null>(null)

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  const form = FORMS.find(f => f.id === selectedForm) ?? FORMS[0]
  const subs = SUBMISSIONS[selectedForm] ?? []

  const COLOR_RING: Record<string, string> = {
    green: 'border-green-200 bg-green-50', blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50', amber: 'border-amber-200 bg-amber-50',
  }
  const COLOR_TEXT: Record<string, string> = {
    green: 'text-green-600', blue: 'text-blue-600', purple: 'text-purple-600', amber: 'text-amber-600',
  }

  return (
    <div className="group relative" role="button" aria-label="Open demo">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
            <span className="text-xs text-gray-400">app.appalix.ai/smart-forms</span>
          </div>
          <div className="w-16" />
        </div>

        <div className="flex" style={{ height: 620 }}>

          {/* Sidebar */}
          <div className="w-44 shrink-0 bg-white border-r border-gray-100 flex flex-col py-3" onClick={stop}>
            <div className="px-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#15A4AE]/15 flex items-center justify-center">
                  <span className="text-[#15A4AE] text-[9px] font-bold">A</span>
                </div>
                <span className="text-[11px] font-bold text-gray-900">Appalix</span>
              </div>
            </div>
            {[
              { icon: '⊞', label: 'Overview',      active: false },
              { icon: '✉', label: 'Emails',         active: false },
              { icon: '💬', label: 'Conversations', active: false },
              { icon: '📋', label: 'Forms',         active: true  },
              { icon: '🎫', label: 'Tickets',       active: false },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] ${item.active ? 'bg-green-50 text-green-600 font-semibold' : 'text-gray-500'}`}>
                <span>{item.icon}</span>{item.label}
              </div>
            ))}
          </div>

          {/* Form list */}
          <div className="w-52 shrink-0 border-r border-gray-100 flex flex-col" onClick={stop}>
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <p className="text-xs font-semibold text-gray-900">Forms</p>
              <Tip label="Build a new lead capture form with drag-and-drop — embed on any page" dir="bottom" clickable>
                <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-600 text-white text-[9px] font-medium hover:bg-green-700 transition-colors">+ New Form</button>
              </Tip>
            </div>
            <div className="flex-1 p-2 space-y-1 overflow-y-auto">
              {FORMS.map(f => (
                <Tip key={f.id} label="Click to view all submissions for this form" dir="right" clickable>
                  <button
                    onClick={(e) => { stop(e); setSelectedForm(f.id); setSelected(null) }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${selectedForm === f.id ? `border ${COLOR_RING[f.color]} shadow-sm` : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{f.icon}</span>
                        <p className="text-[10px] font-semibold text-gray-900 truncate">{f.name}</p>
                      </div>
                      {f.new > 0 && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${COLOR_RING[f.color]} ${COLOR_TEXT[f.color]}`}>{f.new} new</span>}
                    </div>
                    <p className="text-[9px] text-gray-500 pl-5">{f.submissions} total submissions</p>
                  </button>
                </Tip>
              ))}
            </div>
          </div>

          {/* Submissions table */}
          <div className="flex-1 flex flex-col bg-gray-50" onClick={stop}>
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{form.name}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">{subs.length} submissions · {subs.filter(s => s.status === 'new').length} new</p>
              </div>
              <div className="flex items-center gap-2">
                <Tip label="Export all submissions to CSV or sync to your CRM in bulk" dir="bottom" clickable>
                  <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-[9px] text-gray-600 bg-white hover:border-gray-300 transition-colors">Export CSV</button>
                </Tip>
                <Tip label="Edit form fields, layout, and embed settings" dir="bottom" clickable>
                  <button className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-[9px] font-medium hover:bg-green-700 transition-colors">Edit Form</button>
                </Tip>
              </div>
            </div>

            {/* Column headers */}
            <div className="px-4 py-2 bg-white border-b border-gray-100 grid grid-cols-12 gap-2">
              {['Name / Company', 'Email', 'Status', 'AI Enriched', 'CRM', 'Time'].map(h => (
                <p key={h} className={`text-[9px] font-semibold uppercase tracking-wide text-gray-400 ${h === 'Name / Company' ? 'col-span-3' : h === 'Email' ? 'col-span-3' : h === 'Status' ? 'col-span-2' : 'col-span-1'}`}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {subs.map((s, i) => (
                <Tip key={i} label="Click to view full submission, message, and AI-suggested action" dir="top" clickable>
                  <div
                    onClick={(e) => { stop(e); setSelected(selected?.email === s.email ? null : s) }}
                    className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center cursor-pointer transition-colors ${selected?.email === s.email ? 'bg-green-50 border-l-2 border-green-500' : 'hover:bg-white border-l-2 border-transparent'}`}
                  >
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-bold text-green-600 shrink-0">{s.name[0]}</div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-900 truncate">{s.name}</p>
                        <p className="text-[9px] text-gray-500 truncate">{s.company}</p>
                      </div>
                    </div>
                    <p className="col-span-3 text-[9px] text-gray-600 truncate">{s.email}</p>
                    <div className="col-span-2">
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_MAP[s.status].cls}`}>{STATUS_MAP[s.status].label}</span>
                    </div>
                    <Tip label={s.enriched ? 'AI pulled company size, LinkedIn, and intent signals' : 'Enrichment pending'} dir="top">
                      <div className="col-span-1 flex items-center cursor-default">
                        <span className={`text-[10px] ${s.enriched ? 'text-green-500' : 'text-gray-300'}`}>{s.enriched ? '✦' : '○'}</span>
                      </div>
                    </Tip>
                    <Tip label={s.crm ? 'Synced to HubSpot — contact and deal created' : 'Not yet synced to CRM'} dir="top">
                      <div className="col-span-1 flex items-center cursor-default">
                        <span className={`text-[9px] ${s.crm ? 'text-blue-500' : 'text-gray-300'}`}>{s.crm ? '⧉' : '○'}</span>
                      </div>
                    </Tip>
                    <p className="col-span-1 text-[9px] text-gray-400">{s.time}</p>
                  </div>
                </Tip>
              ))}
            </div>

            {/* Expanded submission detail */}
            {selected && (
              <div className="border-t border-gray-200 bg-white px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-900">{selected.name} · {selected.company}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">{selected.email}{selected.phone ? ` · ${selected.phone}` : ''}</p>
                    {selected.msg && <p className="text-[10px] text-gray-700 mt-1.5 italic">&ldquo;{selected.msg}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Tip label="Reply to this submission via email" dir="top" clickable>
                      <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-[9px] text-gray-600 hover:border-gray-300 transition-colors">Reply</button>
                    </Tip>
                    <Tip label="Create a deal in your CRM for this contact" dir="top" clickable>
                      <button className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-[9px] font-medium hover:bg-green-700 transition-colors">+ Deal</button>
                    </Tip>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onClick}
        className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        See it live
      </button>
    </div>
  )
}

/* ─── Demo Modal ────────────────────────────────────────────────────────── */
function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-[#222] border border-white/10 rounded-2xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-sm">✕</button>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-600/40 bg-green-600/10 text-green-400 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live demo · No credit card needed
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See Form Intelligence in action</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-7">
          Watch Sage enrich every submission, score intent, and sync qualified leads straight to your CRM — automatically.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/login" onClick={onClose} className="w-full py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm text-center">
            Start a 7-day free trial — free
          </Link>
          <Link href="/contact" onClick={onClose} className="w-full py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm text-center">
            Book a live demo →
          </Link>
        </div>
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-5">
          {['No credit card', 'Cancel anytime', '7-day free trial'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <svg className="w-3 h-3 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Features ──────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '✦', tag: 'AI Enrichment', title: 'Know who submitted before you reply', desc: 'Sage auto-enriches every submission with company size, LinkedIn profile, and buying intent — so you prioritise the right leads.' },
  { icon: '🔗', tag: 'CRM Sync', title: 'Every lead lands in your CRM instantly', desc: 'Submissions become contacts and deals in HubSpot, Salesforce, or Pipedrive the moment they arrive — no manual data entry.' },
  { icon: '🎨', tag: 'Form Builder', title: 'Build beautiful forms in minutes', desc: 'Drag-and-drop editor, custom branding, conditional logic, and multi-step flows. Embed on any website with one line of code.' },
  { icon: '⚡', tag: 'Smart Routing', title: 'Right lead, right person, instantly', desc: 'Route submissions to the right team member based on company size, region, or form answers — automatically.' },
]

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function FormsPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bg-[#1c1c1c] min-h-screen text-white">

      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-green-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <FadeUp delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-600/40 bg-green-600/10 text-green-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              AI-enriched lead capture
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-snug mb-6">
              Turn every form submission<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
                into a qualified lead
              </span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Sage enriches every submission with company data, scores intent, and routes leads to the right person — before you even read the email.
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login" className="px-7 py-3.5 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
                Start a 7 Day Free Trial
              </Link>
              <button onClick={() => setModalOpen(true)} className="px-7 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
                See it in action →
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <FormsPreview onClick={() => setModalOpen(true)} />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="text-center text-xs text-gray-600 mt-4">Click any form to see submissions — click a row to see AI enrichment and actions</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <p className="text-xs text-green-400 uppercase tracking-widest font-semibold mb-3">Form Intelligence</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Forms that do the work for you</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">From capture to CRM, every submission is handled automatically — so your team spends time selling, not sorting.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.tag} delay={i * 0.05}>
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-green-600/30 hover:bg-green-600/5 transition-all duration-300">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-600/10 border border-green-600/20 text-green-400 text-[10px] font-semibold mb-4">{f.tag}</div>
                  <p className="text-xl mb-1">{f.icon}</p>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to capture better leads?</h2>
          <p className="text-gray-400 mb-8 text-sm max-w-md mx-auto">Build your first form free. No credit card required.</p>
          <Link href="/login" className="inline-block px-8 py-4 bg-[#1a8c76] hover:bg-[#14705d] text-white font-medium rounded-xl transition-colors text-sm">
            Start free trial →
          </Link>
        </ScrollReveal>
      </section>

      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
