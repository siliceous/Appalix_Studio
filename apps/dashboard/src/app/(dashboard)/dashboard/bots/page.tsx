import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, Bot as BotRow, Conversation } from '@/lib/types'
import { BotTriageDashboard, type TriageConversation } from '@/components/dashboard/bots-triage-dashboard'
import Link from 'next/link'
import { LayoutDashboard, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Bot Conversations' }

export default async function BotsTriagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  const [botsRes, convsRes] = await Promise.all([
    supabase.from('bots').select('id, name, bot_type').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('conversations').select('*').eq('workspace_id', workspaceId).order('last_activity_at', { ascending: false }).limit(300),
  ])
  const rawBots  = (botsRes.data  ?? []) as Pick<BotRow, 'id' | 'name' | 'bot_type'>[]
  const rawConvs = (convsRes.data ?? []) as Conversation[]
  const botMap   = new Map(rawBots.map(b => [b.id, b]))

  const triageConversations: TriageConversation[] = rawConvs
    .filter(c => c.bot_id && botMap.has(c.bot_id))
    .map(c => { const bot = botMap.get(c.bot_id!)!; return { conversation: c, botName: bot.name, botType: bot.bot_type } })

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <nav className="px-6 py-2.5 border-b dark:border-white/8 bg-white dark:bg-[#1c1c1c] flex items-center gap-1.5 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Overview
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Bot Conversations</span>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <BotTriageDashboard triageConversations={triageConversations} />
      </div>
    </div>
  )
}
