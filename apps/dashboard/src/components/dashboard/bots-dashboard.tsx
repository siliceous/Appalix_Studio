'use client'

import { Bot, Sparkles, Plug, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Bot as BotRow } from '@/lib/types'

export function BotsDashboard({ bots }: { bots: BotRow[] }) {
  if (bots.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#1c1c1c]">
        <div className="text-center">
          <Bot className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No bots yet</p>
          <p className="text-xs text-gray-400 mb-5">Create your first bot to start handling conversations.</p>
          <a
            href="/bots/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create bot
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-[#1c1c1c]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Your Bots</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{bots.length} bot{bots.length !== 1 ? 's' : ''} in this workspace</p>
        </div>
        <a
          href="/bots/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New bot
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bots.map((bot) => (
          <a
            key={bot.id}
            href={`/bots/${bot.id}`}
            className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 hover:shadow-sm transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  bot.bot_type === 'internal'
                    ? 'bg-[#61c2ad]/10'
                    : 'bg-purple-100 dark:bg-purple-500/10'
                }`}
              >
                {bot.bot_type === 'internal' ? (
                  <Sparkles className="w-5 h-5 text-[#61c2ad]" />
                ) : (
                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              {bot.bot_type === 'internal' && (
                <span className="text-xs bg-[#61c2ad]/10 text-[#61c2ad] px-2 py-0.5 rounded-full font-medium">
                  Sage
                </span>
              )}
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
                {/* @ts-expect-error — aggregate count */}
                {bot.integrations?.[0]?.count ?? 0} integrations
              </span>
              <span>·</span>
              <span>{formatDate(bot.created_at)}</span>
              {bot.enable_rag && (
                <>
                  <span>·</span>
                  <span className="text-green-600 font-medium">RAG</span>
                </>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
