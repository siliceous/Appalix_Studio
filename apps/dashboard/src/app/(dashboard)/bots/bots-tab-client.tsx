'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search, Plus, Bot, Plug, MessageSquare, TrendingUp, Mic, CheckCircle,
} from 'lucide-react'
import { formatTokens, formatCost, timeAgo, PLATFORM_META } from '@/lib/utils'

const TABS = [
  { key: 'bots',           label: 'Bots' },
  { key: 'knowledge-base', label: 'Knowledge Base' },
  { key: 'training',       label: 'Voice Training' },
  { key: 'phone-agents',   label: 'Phone Agents' },
]

interface BotItem {
  id: string
  name: string
  description: string | null
  system_prompt: string | null
  enable_voice: boolean
  enable_rag: boolean
  voice_preset: string | null
  voice_goal: string | null
  bot_type: string | null
  created_at: string
  integrations?: Array<{ count: number }> | null
}

interface RecentConv {
  id: string
  title: string | null
  platform: string | null
  status: string | null
  message_count: number | null
  last_activity_at: string | null
}

interface Props {
  bots: BotItem[]
  recentConversations: RecentConv[]
  totalTokens: number
  totalCost: number
  totalConversations: number
  totalBots: number
  totalIntegrations: number
  showNewBotBanner?: boolean
}

export function BotsTabClient({
  bots,
  recentConversations,
  totalTokens,
  totalCost,
  totalConversations,
  totalBots,
  totalIntegrations,
  showNewBotBanner,
}: Props) {
  const [search, setSearch] = useState('')

  const filteredBots = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bots
    return bots.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.description ?? '').toLowerCase().includes(q)
    )
  }, [bots, search])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-3 pt-4 pb-3 gap-1.5">

      {/* ── Header row — aligned with center column only ─────────────── */}
      <div className="flex gap-3 shrink-0">
        <div className="w-[210px] shrink-0" />
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Bots</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure AI agents and connect them to platforms</p>
          </div>
          <a
            href="/bots/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />New bot
          </a>
        </div>
        <div className="w-[260px] shrink-0" />
      </div>

      {/* ── 3-panel body ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden gap-3">

        {/* Left: Usage stats — floating card, full height */}
        <div className="w-[210px] shrink-0 flex flex-col rounded-2xl overflow-hidden shadow-lg border dark:border-white/8">
          <div className="bg-[#141c2b] px-4 py-3 shrink-0">
            <p className="text-[10px] font-semibold text-white uppercase tracking-wider">Usage · 30 days</p>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#191919] p-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="space-y-2">
              {[
                { label: 'Tokens',        value: formatTokens(totalTokens), icon: TrendingUp,    color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
                { label: 'Est. cost',     value: formatCost(totalCost),     icon: TrendingUp,    color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-500/10' },
                { label: 'Active bots',   value: totalBots,                 icon: Bot,           color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                { label: 'Integrations',  value: totalIntegrations,         icon: Plug,          color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-500/10' },
                { label: 'Conversations', value: totalConversations,        icon: MessageSquare, color: 'text-[#15A4AE]',  bg: 'bg-[#15A4AE]/10' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-3 flex items-center gap-3">
                  <div className={`${s.bg} p-1.5 rounded-lg shrink-0`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{s.label}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="/analytics"
              className="mt-3 block text-center text-[10px] font-medium text-brand-600 dark:text-[#ec732e] bg-brand-50 hover:bg-brand-100 dark:bg-[#ec732e]/10 dark:hover:bg-[#ec732e]/15 rounded-lg py-2 transition-colors"
            >
              Full analytics →
            </a>
          </div>
        </div>

        {/* Center: dark bar + bot cards */}
        <div className="flex-1 flex flex-col min-h-0 gap-1.5">
          {/* Dark bar */}
          <div className="bg-[#141c2b] rounded-2xl px-3 py-2 flex items-center gap-3 shrink-0 shadow-lg">
            <div className="relative w-[40%]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search bots…"
                className="pl-8 pr-3 h-8 w-full bg-white text-gray-800 placeholder-gray-400 rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              {TABS.map(tab => (
                <Link
                  key={tab.key}
                  href={`/bots?tab=${tab.key}`}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap text-white ${
                    tab.key === 'bots' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {showNewBotBanner && (
              <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Bot created! Add knowledge so it can answer questions — or set up voice training.
              </div>
            )}

            {filteredBots.length === 0 ? (
              <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 flex flex-col items-center justify-center py-16 text-center">
                {search ? (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No bots match &ldquo;{search}&rdquo;</p>
                    <p className="text-xs text-gray-400">Try a different search term.</p>
                  </>
                ) : (
                  <>
                    <Image src="/favicon.png" alt="Bots" width={40} height={40} className="w-10 h-10 mb-3 opacity-30 dark:opacity-20" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No bots yet</p>
                    <p className="text-xs text-gray-400 mb-5">Create your first bot to start handling conversations.</p>
                    <a href="/bots/new" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors">
                      Create bot
                    </a>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredBots.map(bot => (
                  <div key={bot.id} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 hover:shadow-sm transition-shadow flex flex-col">
                    <a href={`/bots/${bot.id}`} className="flex-1 group block">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-white/5 border dark:border-white/8">
                          <Image src="/favicon.png" alt="Bot" width={22} height={22} className="w-5 h-5 object-contain" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {bot.enable_voice && (
                            <span className="text-[10px] bg-[#15A4AE]/10 text-[#15A4AE] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <Mic className="w-2.5 h-2.5" />Voice
                            </span>
                          )}
                          {bot.bot_type === 'internal' && (
                            <span className="text-[10px] bg-[#15A4AE]/10 text-[#15A4AE] px-1.5 py-0.5 rounded-full font-semibold">
                              Sage
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-brand-700 dark:group-hover:text-[#ec732e] transition-colors">
                        {bot.name}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                        {bot.description ?? bot.system_prompt?.slice(0, 100) ?? 'No description'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Plug className="w-3.5 h-3.5" />
                          {(bot.integrations as Array<{ count: number }> | null)?.[0]?.count ?? 0} integrations
                        </span>
                        {bot.enable_rag && (
                          <>
                            <span>·</span>
                            <span className="text-green-600 font-medium">RAG</span>
                          </>
                        )}
                      </div>
                    </a>
                    <div className="mt-3 pt-3 border-t dark:border-white/8 flex items-center justify-between">
                      {bot.enable_voice ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {bot.voice_preset && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                              {bot.voice_preset}
                            </span>
                          )}
                          {bot.voice_goal && (Array.isArray(bot.voice_goal) ? bot.voice_goal : [bot.voice_goal]).map(g => (
                            <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                              {String(g).replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">Text only</span>
                      )}
                      <a
                        href={`/agent/bots/${bot.id}`}
                        className="text-[10px] font-medium text-[#15A4AE] hover:text-[#0e8f99] transition-colors whitespace-nowrap"
                      >
                        {bot.enable_voice ? 'Voice config →' : 'Enable voice →'}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent conversations — floating card */}
        <div className="w-[260px] shrink-0 flex flex-col rounded-2xl overflow-hidden shadow-lg border dark:border-white/8">
          <div className="bg-[#141c2b] px-4 py-3 shrink-0 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-white uppercase tracking-wider">Recent Convos</p>
            <a href="/conversations" className="text-[10px] text-white hover:text-white/80 transition-colors">View all</a>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#191919] divide-y dark:divide-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentConversations.length === 0 ? (
              <p className="px-4 py-8 text-xs text-gray-400 text-center">No conversations yet.</p>
            ) : (
              recentConversations.map(c => {
                const meta = PLATFORM_META[c.platform as keyof typeof PLATFORM_META]
                return (
                  <a
                    key={c.id}
                    href={`/conversations/${c.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white dark:hover:bg-white/3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {c.title ?? 'Untitled conversation'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {c.message_count ?? 0} msgs · {timeAgo(c.last_activity_at ?? '')}
                      </p>
                    </div>
                    {meta && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${meta.color}`}>
                        {meta.label}
                      </span>
                    )}
                  </a>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
