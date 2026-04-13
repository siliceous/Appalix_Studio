import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Plus, Mic, MicOff, MessageSquare, PhoneCall, Zap } from 'lucide-react'
import type { Bot } from '@/lib/types'

export const metadata: Metadata = { title: 'Agent Bots' }

const PRESET_LABELS: Record<string, string> = {
  receptionist:  'Receptionist',
  sales:         'Sales',
  support:       'Support',
  booking:       'Booking',
  lead_capture:  'Lead Capture',
}

const GOAL_LABELS: Record<string, string> = {
  book_meeting:    'Book Meeting',
  capture_lead:    'Capture Lead',
  resolve_ticket:  'Resolve Ticket',
  sales_pitch:     'Sales Pitch',
  take_message:    'Take Message',
  route_human:     'Route to Human',
}

export default async function AgentBotsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = params.filter ?? 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).single()
  const member = memberRaw as { workspace_id: string } | null
  if (!member) redirect('/login')

  const { data: botsRaw } = await supabase
    .from('bots')
    .select('id,name,description,bot_type,enable_voice,voice_mode,voice_preset,voice_goal,created_at')
    .eq('workspace_id', member.workspace_id)
    .order('created_at', { ascending: false })

  const allBots = (botsRaw ?? []) as Pick<Bot,
    'id'|'name'|'description'|'bot_type'|'enable_voice'|'voice_mode'|'voice_preset'|'voice_goal'|'created_at'>[]

  const bots = filter === 'voice'
    ? allBots.filter(b => b.enable_voice)
    : filter === 'text'
    ? allBots.filter(b => !b.enable_voice)
    : allBots

  const voiceCount = allBots.filter(b => b.enable_voice).length

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Header
            title="Agent Bots"
            description="Manage voice-enabled and text bots. Enable voice mode per bot to let users speak and be heard."
            action={
              <Link href="/bots/new"
                className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-lg transition-colors">
                <Plus className="w-4 h-4" />New bot
              </Link>
            }
          />

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total bots',    value: allBots.length,                    icon: MessageSquare, color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-500/10' },
              { label: 'Voice enabled', value: voiceCount,                        icon: Mic,           color: 'text-[#15A4AE]',   bg: 'bg-[#15A4AE]/10' },
              { label: 'Text only',     value: allBots.length - voiceCount,       icon: MicOff,        color: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-white/5' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex items-center gap-4">
                <div className={`${s.bg} p-2.5 rounded-lg`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-5 p-1 bg-gray-100 dark:bg-white/5 rounded-lg w-fit">
            {[
              { key: 'all',   label: 'All bots' },
              { key: 'voice', label: 'Voice enabled' },
              { key: 'text',  label: 'Text only' },
            ].map(tab => (
              <Link
                key={tab.key}
                href={`/agent/bots?filter=${tab.key}`}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === tab.key
                    ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Bots grid */}
          {bots.length === 0 ? (
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#15A4AE]/10 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-[#15A4AE]" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No bots found</p>
              <p className="text-xs text-gray-400 mb-5">
                {filter === 'voice' ? 'No bots have voice enabled yet.' : 'Create a bot to get started.'}
              </p>
              <Link href="/bots/new"
                className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm rounded-lg transition-colors">
                Create bot
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {bots.map(bot => (
                <div key={bot.id} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                        {bot.enable_voice
                          ? <Mic className="w-4 h-4 text-[#15A4AE]" />
                          : <MessageSquare className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{bot.name}</p>
                        <p className="text-xs text-gray-400 truncate">{bot.description ?? 'No description'}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      bot.enable_voice
                        ? 'bg-[#15A4AE]/10 text-[#15A4AE]'
                        : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
                    }`}>
                      {bot.enable_voice ? 'Voice' : 'Text'}
                    </span>
                  </div>

                  {/* Voice badges */}
                  {bot.enable_voice && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {bot.voice_preset && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                          {PRESET_LABELS[bot.voice_preset] ?? bot.voice_preset}
                        </span>
                      )}
                      {bot.voice_goal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                          {GOAL_LABELS[bot.voice_goal] ?? bot.voice_goal}
                        </span>
                      )}
                      {bot.voice_mode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                          {bot.voice_mode === 'voice_text' ? 'Voice + Text' : bot.voice_mode === 'voice' ? 'Voice' : 'Text'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 mt-auto border-t dark:border-white/8">
                    <Link href={`/agent/bots/${bot.id}`}
                      className="flex-1 text-center text-xs font-medium px-3 py-1.5 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                      {bot.enable_voice ? 'Edit voice' : 'Enable voice'}
                    </Link>
                    <Link href={`/agent/voice-training?bot=${bot.id}`}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <Zap className="w-3 h-3" />Train
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
