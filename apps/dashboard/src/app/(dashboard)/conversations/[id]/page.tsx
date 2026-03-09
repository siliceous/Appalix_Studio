import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PLATFORM_META, formatDate } from '@/lib/utils'
import { Download } from 'lucide-react'
import { DeleteConversationButton } from './delete-button'
import { RenameConversationTitle } from './rename-title'
import type { Metadata } from 'next'
import type { Conversation, Message } from '@/lib/types'

export const metadata: Metadata = { title: 'Conversation' }

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawConversation } = await supabase
    .from('conversations')
    .select('*, bots(name, model)')
    .eq('id', id)
    .single()

  const conversation = rawConversation as (Conversation & { bots?: { name: string; model: string } | null }) | null

  if (!conversation) notFound()

  const { data: rawMessages } = await supabase
    .from('messages')
    .select('id, role, content, tokens_input, tokens_output, response_time_ms, is_error, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const messages = (rawMessages ?? []) as Pick<Message, 'id' | 'role' | 'content' | 'tokens_input' | 'tokens_output' | 'response_time_ms' | 'is_error' | 'created_at'>[]

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <a href="/dashboard/bots" className="text-xs text-gray-400 hover:text-brand-600 mb-1 block">
            ← Conversations
          </a>
          <RenameConversationTitle id={id} title={conversation.title} />
          <div className="flex items-center gap-3 mt-1.5">
            {conversation.platform && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_META[conversation.platform]?.color}`}>
                {PLATFORM_META[conversation.platform]?.label}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(conversation.created_at)}</span>
            <span className="text-xs text-gray-400">{conversation.message_count} messages</span>
            {conversation.bots?.name && (
              <span className="text-xs text-gray-400">Bot: {conversation.bots.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/conversations/${id}/export`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
          <DeleteConversationButton id={id} />
        </div>
      </div>

      {/* Summary */}
      {conversation.summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-6">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">AI Summary</p>
          <p className="text-sm text-blue-900">{conversation.summary}</p>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4">
        {messages?.map((msg) => {
          const isUser = msg.role === 'user'
          const isTool = msg.role === 'tool'
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isUser  ? 'bg-brand-600 text-white rounded-br-sm' :
                isTool  ? 'bg-yellow-50 border border-yellow-200 text-yellow-900 text-xs font-mono' :
                msg.is_error ? 'bg-red-50 border border-red-200 text-red-800' :
                          'bg-white border text-gray-900 rounded-bl-sm'
              }`}>
                {isTool && <p className="text-xs font-bold mb-1 text-yellow-700">Tool result</p>}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {/* Metadata for assistant messages */}
                {msg.role === 'assistant' && (msg.tokens_output != null || msg.response_time_ms != null) && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {msg.tokens_output != null && `${msg.tokens_output} tokens`}
                    {msg.response_time_ms != null && ` · ${(msg.response_time_ms / 1000).toFixed(1)}s`}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
