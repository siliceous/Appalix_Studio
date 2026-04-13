import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Plus, PhoneCall, PhoneIncoming, PhoneOutgoing, Phone, Mic, Zap } from 'lucide-react'
import { toggleVoiceAgentActive } from '@/app/actions/voice'
import type { VoiceAgent } from '@/lib/types'

export const metadata: Metadata = { title: 'Voice Agents' }

const PRESET_LABELS: Record<string, string> = {
  receptionist: 'Receptionist',
  sales:        'Sales Closer',
  support:      'Support Specialist',
  booking:      'Appointment Setter',
  lead_capture: 'Lead Capture',
}

const GOAL_LABELS: Record<string, string> = {
  book_meeting:   'Book Meeting',
  capture_lead:   'Capture Lead',
  resolve_ticket: 'Resolve Ticket',
  sales_pitch:    'Sales Pitch',
  take_message:   'Take Message',
  route_human:    'Route to Human',
}

const TYPE_CONFIG = {
  inbound:  { label: 'Inbound',       icon: PhoneIncoming,  color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-500/10' },
  outbound: { label: 'Outbound',      icon: PhoneOutgoing,  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  both:     { label: 'Inbound + Out', icon: Phone,          color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
}

export default async function VoiceAgentsPage({
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

  const { data: agentsRaw } = await supabase
    .from('voice_agents')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .order('created_at', { ascending: false })

  const allAgents = (agentsRaw ?? []) as VoiceAgent[]

  const agents = filter === 'active'
    ? allAgents.filter(a => a.is_active)
    : filter === 'inbound'
    ? allAgents.filter(a => a.type === 'inbound' || a.type === 'both')
    : filter === 'outbound'
    ? allAgents.filter(a => a.type === 'outbound' || a.type === 'both')
    : allAgents

  const activeCount   = allAgents.filter(a => a.is_active).length
  const inboundCount  = allAgents.filter(a => a.type === 'inbound' || a.type === 'both').length
  const outboundCount = allAgents.filter(a => a.type === 'outbound' || a.type === 'both').length

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Header
            title="Voice Agents"
            description="Manage phone-connected AI agents. Each agent handles inbound calls, outbound dialling, or both."
            action={
              <Link href="/phone/voice-agents/new"
                className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-lg transition-colors">
                <Plus className="w-4 h-4" />New agent
              </Link>
            }
          />

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total agents',  value: allAgents.length,  icon: Mic,           color: 'text-[#15A4AE]',   bg: 'bg-[#15A4AE]/10' },
              { label: 'Active',        value: activeCount,       icon: PhoneCall,      color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
              { label: 'Inbound',       value: inboundCount,      icon: PhoneIncoming,  color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-500/10' },
              { label: 'Outbound',      value: outboundCount,     icon: PhoneOutgoing,  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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
              { key: 'all',      label: 'All agents' },
              { key: 'active',   label: 'Active' },
              { key: 'inbound',  label: 'Inbound' },
              { key: 'outbound', label: 'Outbound' },
            ].map(tab => (
              <Link
                key={tab.key}
                href={`/phone/voice-agents?filter=${tab.key}`}
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

          {/* Agents grid */}
          {agents.length === 0 ? (
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#15A4AE]/10 flex items-center justify-center mb-4">
                <PhoneCall className="w-6 h-6 text-[#15A4AE]" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No voice agents found</p>
              <p className="text-xs text-gray-400 mb-5">
                {filter !== 'all' ? `No ${filter} agents yet.` : 'Create your first voice agent to start handling calls.'}
              </p>
              <Link href="/phone/voice-agents/new"
                className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm rounded-lg transition-colors">
                Create agent
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map(agent => {
                const typeCfg = TYPE_CONFIG[agent.type] ?? TYPE_CONFIG.inbound
                const TypeIcon = typeCfg.icon
                return (
                  <div key={agent.id} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`${typeCfg.bg} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
                          <TypeIcon className={`w-4 h-4 ${typeCfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{agent.name}</p>
                          <p className="text-xs text-gray-400 truncate">{agent.phone_number ?? 'No number assigned'}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        agent.is_active
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
                      }`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeCfg.bg} ${typeCfg.color}`}>
                        {typeCfg.label}
                      </span>
                      {agent.preset && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                          {PRESET_LABELS[agent.preset] ?? agent.preset}
                        </span>
                      )}
                      {agent.goal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                          {GOAL_LABELS[agent.goal] ?? agent.goal}
                        </span>
                      )}
                    </div>

                    {/* Config preview */}
                    {agent.config?.tone && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-1 border-t dark:border-white/8">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{agent.config.tone}</span>
                        {agent.config.pace && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{agent.config.pace} pace</span>
                        )}
                        {agent.config.empathy != null && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">Empathy {agent.config.empathy}/5</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 mt-auto border-t dark:border-white/8">
                      <Link href={`/phone/voice-agents/${agent.id}`}
                        className="flex-1 text-center text-xs font-medium px-3 py-1.5 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                        Configure
                      </Link>
                      <Link href={`/agent/voice-training?bot=${agent.bot_id ?? ''}`}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <Zap className="w-3 h-3" />Train
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
