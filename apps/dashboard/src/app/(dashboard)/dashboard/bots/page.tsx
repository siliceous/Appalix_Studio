import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember, Bot as BotRow, Conversation } from '@/lib/types'
import { BotTriageDashboard, type TriageConversation } from '@/components/dashboard/bots-triage-dashboard'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'

export const metadata: Metadata = { title: 'Bot Conversations' }

function getDateRange(preset: SubpagePreset, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  if (preset === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : null,
      to:   customTo   ? new Date(customTo + 'T23:59:59').toISOString() : null,
    }
  }
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }
  if (preset === 'yesterday') {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to   = new Date(now); to.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: null }
  }
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30)
    return { from: from.toISOString(), to: null }
  }
  return { from: null, to: null }
}

export default async function BotsTriagePage({ searchParams }: { searchParams: Promise<{ preset?: string; from?: string; to?: string }> }) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as SubpagePreset
  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)
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

  let convsQuery = supabase.from('conversations').select('*').eq('workspace_id', workspaceId)
  if (dateFrom) convsQuery = convsQuery.gte('last_activity_at', dateFrom)
  if (dateTo)   convsQuery = convsQuery.lt('last_activity_at', dateTo)
  convsQuery = convsQuery.order('last_activity_at', { ascending: false }).limit(300)

  const [botsRes, convsRes] = await Promise.all([
    supabase.from('bots').select('id, name, bot_type').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    convsQuery,
  ])
  const rawBots  = (botsRes.data  ?? []) as Pick<BotRow, 'id' | 'name' | 'bot_type'>[]
  const rawConvs = (convsRes.data ?? []) as Conversation[]
  const botMap   = new Map(rawBots.map(b => [b.id, b]))

  const triageConversations: TriageConversation[] = rawConvs
    .filter(c => c.bot_id && botMap.has(c.bot_id))
    .map(c => { const bot = botMap.get(c.bot_id!)!; return { conversation: c, botName: bot.name, botType: bot.bot_type } })

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar sourceKey="bots" preset={preset} customFrom={params.from} customTo={params.to} autoEnabled={autoSettings.bots_auto_enabled} />
      <div className="flex flex-1 overflow-hidden">
        <BotTriageDashboard triageConversations={triageConversations} />
      </div>
    </div>
  )
}
