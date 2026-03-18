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

/* ─── Data ──────────────────────────────────────────────────────────────── */
const BOTS = [
  { id: 1, name: 'Website Bot',  desc: 'Handles pricing, demos, and support questions on your main site.',                   integrations: 3, created: 'Jan 12', rag: true,  type: 'customer' },
  { id: 2, name: 'Sage',         desc: 'Internal AI assistant for your team — proposals, docs, and knowledge search.',        integrations: 5, created: 'Jan 12', rag: true,  type: 'internal' },
  { id: 3, name: 'WhatsApp Bot', desc: 'Capture leads and answer FAQs via WhatsApp Business.',                                integrations: 2, created: 'Feb 3',  rag: true,  type: 'customer' },
  { id: 4, name: 'Support Bot',  desc: 'Handles tier-1 support tickets before escalating to your team.',                      integrations: 4, created: 'Feb 18', rag: false, type: 'customer' },
  { id: 5, name: 'Telegram Bot', desc: 'Community engagement and FAQ bot for your Telegram channel.',                         integrations: 1, created: 'Mar 2',  rag: false, type: 'customer' },
  { id: 6, name: 'Facebook Bot', desc: 'Messenger bot for lead capture from Facebook ad campaigns.',                          integrations: 2, created: 'Mar 10', rag: false, type: 'customer' },
]

const RECENT_CONVOS = [
  { title: 'High-intent visitor — /pricing page',  msgs: 8,  platform: 'Web Widget', time: '5m'  },
  { title: 'Demo request via chat widget',          msgs: 12, platform: 'Web Widget', time: '18m' },
  { title: 'WhatsApp: Telegram integration help',  msgs: 6,  platform: 'WhatsApp',   time: '1h'  },
  { title: 'FAQ: How does billing work?',           msgs: 3,  platform: 'Web Widget', time: '2h'  },
  { title: 'Support escalation — Safari bug',       msgs: 9,  platform: 'Web Widget', time: '3h'  },
  { title: 'General enquiry — support hours',       msgs: 4,  platform: 'WhatsApp',   time: '5h'  },
  { title: 'Partnership inquiry from FinTech.io',   msgs: 7,  platform: 'Messenger',  time: '1d'  },
  { title: 'Enterprise pricing walkthrough',        msgs: 15, platform: 'Web Widget', time: '1d'  },
]

const PLATFORM_COLOR: Record<string, string> = {
  'Web Widget': 'bg-purple-50 text-purple-700',
  'WhatsApp':   'bg-green-50 text-green-700',
  'Telegram':   'bg-sky-50 text-sky-700',
  'Messenger':  'bg-blue-50 text-blue-700',
  'Internal':   'bg-[#15A4AE]/10 text-[#15A4AE]',
}

/* ─── Bot Preview ───────────────────────────────────────────────────────── */
export function BotPreview({ onClick }: { onClick?: () => void }) {
  const [hovered, setHovered] = useState<number | null>(null)

  function stop(e: React.MouseEvent) { e.stopPropagation() }

  const STATS = [
    { label: 'Total Conversations', value: '1,248', color: 'text-blue-600',   bg: 'bg-blue-50',   tip: 'Total chat sessions across all bots and channels this month' },
    { label: 'Active Bots',         value: '6',     color: 'text-purple-600', bg: 'bg-purple-50', tip: 'Bots currently live and handling conversations' },
    { label: 'Active Integrations', value: '17',    color: 'text-green-600',  bg: 'bg-green-50',  tip: 'Live channel connections across all your bots' },
    { label: 'Tokens (30d)',        value: '2.4M',  color: 'text-orange-600', bg: 'bg-orange-50', tip: 'AI tokens consumed this month across all bots' },
  ]

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
            <span className="text-xs text-gray-400">app.appalix.ai/bots</span>
          </div>
          <div className="w-16" />
        </div>

        <div className="max-h-[640px] overflow-y-auto bg-gray-50" onClick={stop}>
          <div className="max-w-5xl mx-auto px-5 py-5">

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">Bots</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Configure AI agents and connect them to platforms</p>
              </div>
              <Tip label="Create a new AI bot — website, WhatsApp, Telegram, Slack, or custom API" dir="bottom" clickable>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15A4AE] text-white text-[10px] font-semibold hover:bg-[#0e8f99] transition-colors">
                  + New bot
                </button>
              </Tip>
            </div>

            {/* Bot cards grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {BOTS.map(bot => (
                <Tip key={bot.id} label={`${bot.name} — click to edit, manage integrations, and view analytics`} dir="top" clickable>
                  <div
                    onMouseEnter={() => setHovered(bot.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${hovered === bot.id ? 'border-[#15A4AE]/40 shadow-md' : 'border-gray-200 shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bot.type === 'internal' ? 'bg-[#15A4AE]/10' : 'bg-purple-100'}`}>
                        {bot.type === 'internal'
                          ? <span className="text-[#15A4AE] text-sm">✦</span>
                          : <span className="text-purple-600 text-sm">🤖</span>
                        }
                      </div>
                      {bot.type === 'internal' && (
                        <span className="text-[9px] bg-[#15A4AE]/10 text-[#15A4AE] px-1.5 py-0.5 rounded-full font-semibold">Sage</span>
                      )}
                    </div>
                    <h3 className={`text-[11px] font-semibold text-gray-900 mb-1 transition-colors ${hovered === bot.id ? 'text-[#15A4AE]' : ''}`}>{bot.name}</h3>
                    <p className="text-[9px] text-gray-500 line-clamp-2 mb-3">{bot.desc}</p>
                    <div className="flex items-center gap-2 text-[9px] text-gray-400">
                      <span>🔌 {bot.integrations} integrations</span>
                      <span>·</span>
                      <span>{bot.created}</span>
                      {bot.rag && <><span>·</span><span className="text-green-600 font-semibold">RAG</span></>}
                    </div>
                  </div>
                </Tip>
              ))}
            </div>

            {/* Performance overview */}
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">Performance Overview</h3>
              <p className="text-[11px] text-gray-500">Your workspace activity at a glance</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {STATS.map(s => (
                <Tip key={s.label} label={s.tip} dir="top">
                  <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm cursor-default">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-500">{s.label}</span>
                      <div className={`${s.bg} ${s.color} p-1.5 rounded-lg`}>
                        <span className="text-[11px]">
                          {s.label.includes('Conversation') ? '💬' : s.label.includes('Bots') ? '🤖' : s.label.includes('Integration') ? '🔌' : '📊'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </Tip>
              ))}
            </div>

            {/* Bottom grid: recent convos + usage */}
            <div className="grid grid-cols-3 gap-4">
              {/* Recent conversations */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <Tip label="All live and recent conversations across every bot and channel" dir="top">
                    <h3 className="text-xs font-semibold text-gray-900 cursor-default">Recent Conversations</h3>
                  </Tip>
                  <Tip label="View all conversations in the full conversations panel" dir="top" clickable>
                    <span className="text-[10px] text-[#15A4AE] hover:underline cursor-default">View all</span>
                  </Tip>
                </div>
                <div className="divide-y divide-gray-50">
                  {RECENT_CONVOS.map((c, i) => (
                    <Tip key={i} label="Click to open conversation — full transcript, lead info, and AI summary" dir="top" clickable>
                      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-default">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-900 truncate">{c.title}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">{c.msgs} messages · {c.time}</p>
                        </div>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${PLATFORM_COLOR[c.platform] ?? 'bg-gray-100 text-gray-500'}`}>{c.platform}</span>
                      </div>
                    </Tip>
                  ))}
                </div>
              </div>

              {/* Usage summary */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <Tip label="Token usage and cost this month across all bots" dir="top">
                    <h3 className="text-xs font-semibold text-gray-900 cursor-default">Usage (last 30 days)</h3>
                  </Tip>
                </div>
                <div className="px-4 py-4 space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Tokens consumed</p>
                    <p className="text-xl font-bold text-gray-900">2.4M</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Estimated cost</p>
                    <p className="text-xl font-bold text-gray-900">$4.80</p>
                  </div>
                  <Tip label="View detailed token usage, cost breakdown, and response time analytics" dir="top" clickable>
                    <button className="w-full mt-2 text-center text-[10px] text-[#15A4AE] bg-[#15A4AE]/5 hover:bg-[#15A4AE]/10 rounded-lg py-2 transition-colors cursor-default">
                      View detailed analytics →
                    </button>
                  </Tip>
                </div>
              </div>
            </div>

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
