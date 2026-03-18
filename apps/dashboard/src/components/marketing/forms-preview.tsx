'use client'

import { useState } from 'react'

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

/* ─── Lead data ─────────────────────────────────────────────────────────── */
const LEADS = [
  { name: 'Sarah Mitchell',  company: 'Acme Corp',      email: 'sarah@acmecorp.com',     phone: '+1 555 0142', source: 'Meta Leads',  status: 'new',       time: '4m'  },
  { name: 'Carlos Rivera',   company: 'Fintech.io',     email: 'carlos@fintech.io',      phone: '+1 555 0289', source: 'Google Ads',  status: 'contacted', time: '22m' },
  { name: 'Priya Sharma',    company: 'LogisticsCo',    email: 'priya@logisticsco.com',  phone: '+1 555 0198', source: 'Meta Leads',  status: 'qualified', time: '1h'  },
  { name: 'Oliver Park',     company: 'Parkside Media', email: 'oliver@parkside.com',    phone: '+44 20 7123', source: 'Google Ads',  status: 'new',       time: '2h'  },
  { name: 'Aiko Tanaka',     company: 'TanakaCorp',     email: 'aiko@tanakacorp.co.jp',  phone: '+81 3 9876',  source: 'Meta Leads',  status: 'new',       time: '3h'  },
  { name: 'Luca Bianchi',    company: 'Bianchi SRL',    email: 'luca@bianchi.it',        phone: '+39 02 1234', source: 'Google Ads',  status: 'contacted', time: '5h'  },
  { name: 'Amy Chen',        company: 'Chen Ventures',  email: 'amy@chenv.com',          phone: '+1 555 0371', source: 'Meta Leads',  status: 'qualified', time: '1d'  },
  { name: 'James Wu',        company: 'WuTech',         email: 'james@wutech.com',       phone: '+1 555 0456', source: 'Google Ads',  status: 'new',       time: '1d'  },
]

const STATUS_MAP = {
  new:       { label: 'New',       cls: 'bg-green-100 text-green-700'  },
  contacted: { label: 'Contacted', cls: 'bg-blue-100 text-blue-700'    },
  qualified: { label: 'Qualified', cls: 'bg-[#15A4AE]/10 text-[#15A4AE]' },
}

const SOURCE_MAP: Record<string, string> = {
  'Meta Leads': 'bg-blue-50 text-blue-600',
  'Google Ads': 'bg-red-50 text-red-600',
}

/* ─── Forms Preview ─────────────────────────────────────────────────────── */
export function FormsPreview({ onClick }: { onClick?: () => void }) {
  const [selected,     setSelected]     = useState<number | null>(null)
  const [search,       setSearch]       = useState('')
  const [filterSource, setFilterSource] = useState<string | null>(null)

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  const displayed = LEADS.filter(l => {
    if (filterSource && l.source !== filterSource) return false
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const SOURCES = ['Meta Leads', 'Google Ads']
  const lead = selected !== null ? LEADS[selected] : null

  return (
    <div className="group relative" role="button" aria-label="Open demo">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#15A4AE]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xl">

        {/* macOS chrome */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
            <span className="text-xs text-gray-400">app.appalix.ai/forms/leads</span>
          </div>
          <div className="w-16" />
        </div>

        <div style={{ height: 580 }} className="overflow-y-auto bg-gray-50" onClick={stop}>
          <div className="max-w-5xl mx-auto px-5 py-5">

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">All Leads</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Leads captured from connected ad platforms</p>
              </div>
              <Tip label="Connect Meta Leads, Google Ads, TikTok Ads, and more to capture leads automatically" dir="bottom" clickable>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15A4AE] text-white text-[10px] font-semibold hover:bg-[#0e8f99] transition-colors">
                  + Connect Platform
                </button>
              </Tip>
            </div>

            {/* Platform chips */}
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[10px] font-semibold text-gray-500 mr-1">Sources:</p>
              {SOURCES.map(s => (
                <Tip key={s} label={`Filter leads from ${s} only`} dir="bottom" clickable>
                  <button
                    onClick={(e) => { stop(e); setFilterSource(prev => prev === s ? null : s) }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold transition-colors border ${filterSource === s ? 'border-[#15A4AE] bg-[#15A4AE]/10 text-[#15A4AE]' : `${SOURCE_MAP[s]} border-transparent`}`}
                  >
                    {s === 'Meta Leads' ? '📘' : '🔴'} {s}
                  </button>
                </Tip>
              ))}
              <div className="ml-auto">
                <Tip label="Search leads by name or email" dir="bottom">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onClick={stop}
                    placeholder="Search leads…"
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] text-gray-700 bg-white focus:outline-none focus:border-[#15A4AE]/50 w-36"
                  />
                </Tip>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                {['Name / Company', 'Email', 'Phone', 'Source', 'Status', 'Time'].map((h, i) => (
                  <p key={h} className={`text-[9px] font-semibold uppercase tracking-wide text-gray-400 ${i === 0 ? 'col-span-3' : i === 1 ? 'col-span-3' : i === 2 ? 'col-span-2' : 'col-span-1'}`}>{h}</p>
                ))}
              </div>

              <div className="divide-y divide-gray-50">
                {displayed.map((l, i) => (
                  <Tip key={i} label="Click to view lead details, assign to team member, or create a deal" dir="top" clickable>
                    <div
                      onClick={(e) => { stop(e); setSelected(prev => prev === i ? null : i) }}
                      className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center cursor-pointer transition-colors border-l-2 ${selected === i ? 'bg-[#15A4AE]/5 border-[#15A4AE]' : 'hover:bg-gray-50 border-transparent'}`}
                    >
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#15A4AE]/20 flex items-center justify-center text-[9px] font-bold text-[#15A4AE] shrink-0">{l.name[0]}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-gray-900 truncate">{l.name}</p>
                          <p className="text-[9px] text-gray-500 truncate">{l.company}</p>
                        </div>
                      </div>
                      <p className="col-span-3 text-[9px] text-gray-600 truncate">{l.email}</p>
                      <p className="col-span-2 text-[9px] text-gray-600 truncate">{l.phone}</p>
                      <div className="col-span-1">
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${SOURCE_MAP[l.source]}`}>{l.source === 'Meta Leads' ? '📘' : '🔴'}</span>
                      </div>
                      <div className="col-span-1">
                        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_MAP[l.status as keyof typeof STATUS_MAP].cls}`}>{STATUS_MAP[l.status as keyof typeof STATUS_MAP].label}</span>
                      </div>
                      <p className="col-span-1 text-[9px] text-gray-400">{l.time}</p>
                    </div>
                  </Tip>
                ))}
              </div>
            </div>

            {/* Expanded lead detail */}
            {lead && (
              <div className="mt-3 bg-white rounded-xl border border-[#15A4AE]/30 shadow-sm px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-900">{lead.name} · {lead.company}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">{lead.email} · {lead.phone}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Source: <span className="font-medium">{lead.source}</span> · Captured {lead.time} ago</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Tip label="Assign this lead to a team member for follow-up" dir="top" clickable>
                      <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-[9px] text-gray-600 hover:border-gray-300 transition-colors">Assign</button>
                    </Tip>
                    <Tip label="Create a deal in your CRM for this lead" dir="top" clickable>
                      <button className="px-2.5 py-1 rounded-lg bg-[#15A4AE] text-white text-[9px] font-medium hover:bg-[#0e8f99] transition-colors">+ Deal</button>
                    </Tip>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {onClick && (
        <button onClick={onClick} className="absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          See it live
        </button>
      )}
    </div>
  )
}
