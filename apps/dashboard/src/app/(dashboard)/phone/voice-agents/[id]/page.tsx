import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, PhoneIncoming, PhoneOutgoing, Phone, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { updateVoiceAgent, deleteVoiceAgent, toggleVoiceAgentActive } from '@/app/actions/voice'
import { VoiceSubNav } from '@/components/voice/voice-sub-nav'
import type { VoiceAgent, Bot } from '@/lib/types'

export const metadata: Metadata = { title: 'Voice Agent Settings' }

const TYPE_CONFIG = {
  inbound:  { label: 'Inbound',           icon: PhoneIncoming,  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10' },
  outbound: { label: 'Outbound',          icon: PhoneOutgoing,  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10' },
  both:     { label: 'Inbound + Outbound',icon: Phone,          color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-500/10' },
}

export default async function VoiceAgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).single()
  const member = memberRaw as { workspace_id: string } | null
  if (!member) redirect('/login')

  const { data: agentRaw } = await supabase
    .from('voice_agents')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', member.workspace_id)
    .single()

  if (!agentRaw) notFound()
  const agent = agentRaw as VoiceAgent

  const { data: botsRaw } = await supabase
    .from('bots')
    .select('id,name,enable_voice')
    .eq('workspace_id', member.workspace_id)
    .order('name', { ascending: true })
  const bots = (botsRaw ?? []) as Pick<Bot, 'id' | 'name' | 'enable_voice'>[]

  const typeCfg = TYPE_CONFIG[agent.type] ?? TYPE_CONFIG.inbound
  const TypeIcon = typeCfg.icon

  const updateAction = updateVoiceAgent.bind(null, agent.id)
  const deleteAction = deleteVoiceAgent.bind(null, agent.id)

  const cfg = agent.config ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* Back + header */}
          <div className="mb-6">
            <Link href="/phone/voice-agents"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-4">
              <ChevronLeft className="w-3.5 h-3.5" />Voice Agents
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`${typeCfg.bg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                  <TypeIcon className={`w-5 h-5 ${typeCfg.color}`} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h1>
                  <p className="text-sm text-gray-400">{agent.phone_number ?? 'No number assigned'} · {typeCfg.label}</p>
                </div>
              </div>
              {/* Active toggle */}
              <form action={toggleVoiceAgentActive.bind(null, agent.id, !agent.is_active)}>
                <button type="submit"
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    agent.is_active
                      ? 'border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8'
                  }`}>
                  {agent.is_active
                    ? <><ToggleRight className="w-4 h-4" />Active</>
                    : <><ToggleLeft className="w-4 h-4" />Inactive</>}
                </button>
              </form>
            </div>
          </div>

          <VoiceSubNav />

          <form id="update-form" action={updateAction} className="space-y-6">

            {/* Basic info */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Agent name</label>
                <input type="text" name="name" required defaultValue={agent.name}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Call direction</label>
                  <select name="type" defaultValue={agent.type}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="inbound">Inbound only</option>
                    <option value="outbound">Outbound only</option>
                    <option value="both">Inbound + Outbound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone number</label>
                  <input type="tel" name="phone_number" defaultValue={agent.phone_number ?? ''}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Active status</label>
                <input type="hidden" name="is_active" value={agent.is_active ? 'on' : 'off'} />
                <p className="text-xs text-gray-400">Use the Active/Inactive toggle above to change agent status.</p>
              </div>
              {bots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Linked bot</label>
                  <select name="bot_id" defaultValue={agent.bot_id ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="">No linked bot</option>
                    {bots.map(b => (
                      <option key={b.id} value={b.id}>{b.name}{b.enable_voice ? ' (voice)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Working hours</label>
                <input type="text" name="working_hours" defaultValue={cfg.working_hours ?? ''}
                  placeholder="e.g. Mon–Fri 9am–6pm EST"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                <p className="text-xs text-gray-400 mt-1">Calls outside these hours will be handled by fallback messaging.</p>
              </div>
            </div>

            {/* Role & goal */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Role & goal</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Voice preset</label>
                  <select name="preset" defaultValue={agent.preset ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="">No preset</option>
                    <option value="receptionist">Friendly Receptionist</option>
                    <option value="sales">Sales Closer</option>
                    <option value="booking">Appointment Setter</option>
                    <option value="support">Support Specialist</option>
                    <option value="lead_capture">Lead Capture Agent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary goal</label>
                  <select name="goal" defaultValue={agent.goal ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="">No specific goal</option>
                    <option value="book_meeting">Book a meeting</option>
                    <option value="capture_lead">Capture lead</option>
                    <option value="resolve_ticket">Resolve ticket</option>
                    <option value="sales_pitch">Sales pitch</option>
                    <option value="take_message">Take a message</option>
                    <option value="route_human">Route to human</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Call behaviour */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Call behaviour</h2>
                <p className="text-xs text-gray-400">Toggle how the agent behaves during live calls.</p>
              </div>
              <div className="divide-y dark:divide-white/5">
                {[
                  { name: 'ask_one_at_a_time',   label: 'Ask one question at a time',   desc: "Never stacks multiple questions in one turn",               checked: cfg.ask_one_at_a_time },
                  { name: 'confirm_details',      label: 'Confirm captured details',      desc: "Reads back info before moving on",                         checked: cfg.confirm_details },
                  { name: 'push_for_booking',     label: 'Push for booking',              desc: "Always closes with a next-step ask",                       checked: cfg.push_for_booking },
                  { name: 'escalate_sooner',      label: 'Escalate sooner',               desc: "Lower threshold for routing to a human",                   checked: cfg.escalate_sooner },
                  { name: 'collect_lead_first',   label: 'Collect lead details first',    desc: "Gathers contact info before answering detailed questions",  checked: cfg.collect_lead_first },
                ].map(item => (
                  <label key={item.name} className="flex items-center justify-between py-3 cursor-pointer gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <input type="checkbox" name={item.name} defaultChecked={item.checked ?? false}
                      className="w-4 h-4 rounded accent-[#15A4AE] shrink-0" />
                  </label>
                ))}
              </div>
            </div>

            {/* Capture rules */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Lead capture fields</h2>
                <p className="text-xs text-gray-400">Fields the agent will always try to collect from callers.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Name', 'Email', 'Phone', 'Company', 'Budget', 'Timeline', 'Pain point', 'Location', 'Referral source'].map(field => {
                  const key = field.toLowerCase().replace(' ', '_')
                  const checked = cfg.capture_fields?.includes(key) ?? ['name', 'email', 'phone'].includes(key)
                  return (
                    <label key={field} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/3">
                      <input type="checkbox" name={`capture_${key}`} defaultChecked={checked}
                        className="w-3.5 h-3.5 rounded accent-[#15A4AE] shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{field}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Voice personality */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Voice personality</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tone</label>
                  <select name="tone" defaultValue={cfg.tone ?? 'professional'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pace</label>
                  <select name="pace" defaultValue={cfg.pace ?? 'moderate'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="slow">Slow</option>
                    <option value="moderate">Moderate</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'empathy',       label: 'Empathy',       val: cfg.empathy ?? 3 },
                  { name: 'assertiveness', label: 'Assertiveness', val: cfg.assertiveness ?? 3 },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {field.label} <span className="text-xs text-gray-400">(1–5)</span>
                    </label>
                    <input type="number" name={field.name} min={1} max={5} defaultValue={field.val}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Scripts */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scripts</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Greeting script</label>
                <textarea name="greeting_script" rows={3} defaultValue={cfg.greeting_script ?? ''}
                  placeholder='e.g. "Thanks for calling Acme. This is Aria, your AI assistant. How can I help you today?"'
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
                <p className="text-xs text-gray-400 mt-1">Write as natural spoken language. The agent will use this to open every call.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Escalation rules</label>
                <textarea name="escalation_rules" rows={3} defaultValue={cfg.escalation_rules ?? ''}
                  placeholder="e.g. Transfer to a human when caller explicitly asks, or after 2 unresolved issues."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
              </div>
            </div>

          </form>

          {/* Actions row — outside the update form to avoid nested form invalid HTML */}
          <div className="flex items-center justify-between pb-6">
            <form action={deleteAction}>
              <button type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />Delete agent
              </button>
            </form>
            <div className="flex items-center gap-3">
              <Link href="/phone/voice-agents"
                className="px-4 py-2 border dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                Cancel
              </Link>
              <button type="submit" form="update-form"
                className="px-5 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-lg transition-colors">
                Save changes
              </button>
            </div>
          </div>

          {/* Knowledge base link */}
          <div className="bg-[#15A4AE]/5 dark:bg-[#15A4AE]/10 border border-[#15A4AE]/20 rounded-xl p-5 mb-6">
            <p className="text-sm font-medium text-[#15A4AE] mb-1">Voice knowledge base</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Add scripts, FAQs, objection responses, and approved phrases that this agent can use during calls.
            </p>
            <Link href={`/agent/knowledge-base/voice?bot=${agent.bot_id ?? ''}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-xs font-medium rounded-lg transition-colors">
              Manage knowledge entries →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
