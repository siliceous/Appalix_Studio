import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Bot, Plus, Plug, Sparkles } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Bot as BotRow } from '@/lib/types'

export const metadata: Metadata = { title: 'Bots' }

export default async function BotsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  const { data: botsRaw } = await supabase
    .from('bots')
    .select('*, integrations(count)')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })
  const bots = (botsRaw ?? []) as BotRow[]

  return (
    <div>
      <Header
        title="Bots"
        description="Configure AI agents and connect them to platforms"
        action={
          <a
            href="/bots/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New bot
          </a>
        }
      />

      {bots?.length === 0 ? (
        <div className="bg-white rounded-xl border flex flex-col items-center justify-center py-16 text-center">
          <Bot className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No bots yet</p>
          <p className="text-xs text-gray-400 mb-5">Create your first bot to start handling conversations.</p>
          <a href="/bots/new" className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors">
            Create bot
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bots?.map((bot) => (
            <a
              key={bot.id}
              href={`/bots/${bot.id}`}
              className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  bot.bot_type === 'internal'
                    ? 'bg-[#61c2ad]/10 dark:bg-[#61c2ad]/10'
                    : 'bg-purple-100 dark:bg-purple-500/10'
                }`}>
                  {bot.bot_type === 'internal'
                    ? <Sparkles className="w-5 h-5 text-[#61c2ad]" />
                    : <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  }
                </div>
                <div className="flex items-center gap-1.5">
                  {bot.bot_type === 'internal' && (
                    <span className="text-xs bg-[#61c2ad]/10 text-[#61c2ad] px-2 py-0.5 rounded-full font-medium">
                      Sage
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-mono">
                    {bot.model.split('-').slice(-2).join('-')}
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-brand-700 transition-colors">
                {bot.name}
              </h3>
              <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                {bot.description ?? bot.system_prompt?.slice(0, 100) ?? 'No description'}
              </p>

              <div className="flex items-center gap-3 text-xs text-gray-500">
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
      )}
    </div>
  )
}
