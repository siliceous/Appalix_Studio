import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { MessageSquare } from 'lucide-react'
import { PLATFORM_META, timeAgo } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Conversation } from '@/lib/types'

export const metadata: Metadata = { title: 'Conversations' }

const SENTIMENT_COLORS = {
  positive: 'text-green-600',
  neutral:  'text-gray-400',
  negative: 'text-red-500',
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; status?: string }>
}) {
  const { platform, status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')

  let query = supabase
    .from('conversations')
    .select('id, title, platform, status, sentiment, message_count, last_activity_at, bots(name)')
    .eq('workspace_id', membership.workspace_id)
    .order('last_activity_at', { ascending: false })
    .limit(50)

  if (platform) query = query.eq('platform', platform)
  if (status)   query = query.eq('status', status)

  const { data: rawConversations } = await query
  type ConvRow = Pick<Conversation, 'id' | 'title' | 'platform' | 'status' | 'sentiment' | 'message_count' | 'last_activity_at'> & { bots?: { name: string } | null }
  const conversations = (rawConversations ?? []) as ConvRow[]

  return (
    <div>
      <Header title="Conversations" description="All conversations across every platform" />

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'slack', 'google_chat', 'facebook_messenger', 'whatsapp', 'wordpress', 'web_widget'] as const).map((p) => (
          <a
            key={p}
            href={p === 'all' ? '/conversations' : `/conversations?platform=${p}`}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              (p === 'all' && !platform) || platform === p
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p === 'all' ? 'All' : PLATFORM_META[p]?.label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {conversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No conversations found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Conversation</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Platform</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Bot</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Messages</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {conversations?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <a href={`/conversations/${c.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                      {c.title ?? 'Untitled'}
                    </a>
                    {c.sentiment && (
                      <span className={`ml-2 text-xs ${SENTIMENT_COLORS[c.sentiment]}`}>●</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {c.platform ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_META[c.platform]?.color}`}>
                        {PLATFORM_META[c.platform]?.label}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {c.bots?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-500">{c.message_count}</td>
                  <td className="px-5 py-3.5 text-right text-gray-400">{timeAgo(c.last_activity_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
