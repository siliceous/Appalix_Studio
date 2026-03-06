import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLATFORM_META, formatDateTime } from '@/lib/utils'
import type { Conversation, Message } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: convRaw } = await supabase
    .from('conversations')
    .select('*, bots(name)')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .single()

  if (!convRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const conv = convRaw as Conversation & { bots?: { name: string } | null }

  const { data: rawMessages } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const messages = (rawMessages ?? []) as Pick<Message, 'role' | 'content' | 'created_at'>[]

  // Build plain text
  const platform = conv.platform ? (PLATFORM_META[conv.platform]?.label ?? conv.platform) : '—'
  const lines: string[] = [
    `Conversation: ${conv.title ?? 'Untitled'}`,
    `Date:         ${formatDateTime(conv.created_at)}`,
    `Platform:     ${platform}`,
    `Bot:          ${conv.bots?.name ?? '—'}`,
    `Messages:     ${conv.message_count}`,
    conv.summary ? `Summary:      ${conv.summary}` : '',
    '',
    '─'.repeat(60),
    '',
    ...messages.flatMap((m) => {
      const speaker =
        m.role === 'user'      ? 'User'      :
        m.role === 'assistant' ? 'Assistant' :
        m.role === 'tool'      ? 'Tool'      : m.role
      return [
        `[${formatDateTime(m.created_at)}] ${speaker}:`,
        m.content,
        '',
      ]
    }),
  ].filter((l) => l !== undefined)

  const text = lines.join('\n')
  const filename = `conversation-${id.slice(0, 8)}.txt`

  return new NextResponse(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
