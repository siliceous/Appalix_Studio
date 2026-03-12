import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bot Conversations' }

// Types re-exported so /dashboard/bots/page.tsx can import them
export type ConvRow = {
  id: string
  title: string | null
  platform: string | null
  status: string | null
  sentiment: string | null
  message_count: number
  last_activity_at: string
  ai_priority: string | null
  ai_summary: string | null
  ai_entities: Record<string, string> | null
  bot_id: string | null
  bots: { id: string; name: string } | null
  assigned_to: string | null
}

export type BotOption = { id: string; name: string }
export type TeamMember = { user_id: string; name: string }

export type ConvFilters = {
  preset?: string
  from?: string
  to?: string
  bot?: string
  platform?: string
  status?: string
  q?: string
  viewAs?: string
}

export default function ConversationsPage() {
  redirect('/dashboard/bots')
}
