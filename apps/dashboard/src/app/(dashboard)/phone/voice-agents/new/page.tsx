import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ChevronLeft } from 'lucide-react'
import { createVoiceAgent } from '@/app/actions/voice'
import type { Bot } from '@/lib/types'

export const metadata: Metadata = { title: 'New Voice Agent' }

export default async function NewVoiceAgentPage() {
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
    .select('id,name,enable_voice')
    .eq('workspace_id', member.workspace_id)
    .order('name', { ascending: true })
  const bots = (botsRaw ?? []) as Pick<Bot, 'id' | 'name' | 'enable_voice'>[]

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/phone/voice-agents"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-4">
              <ChevronLeft className="w-3.5 h-3.5" />Back to Voice Agents
            </Link>
            <Header
              title="New Voice Agent"
              description="Configure a phone-connected AI agent to handle inbound and outbound calls."
            />
          </div>

          <form action={createVoiceAgent} className="space-y-6">
            {/* Basic info */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Agent name</label>
                <input type="text" name="name" required placeholder="e.g. Inbound Reception"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Call direction</label>
                  <select name="type" defaultValue="inbound"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="inbound">Inbound only</option>
                    <option value="outbound">Outbound only</option>
                    <option value="both">Inbound + Outbound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone number</label>
                  <input type="tel" name="phone_number" placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                </div>
              </div>
              {bots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Linked bot (optional)</label>
                  <select name="bot_id" defaultValue=""
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="">No linked bot</option>
                    {bots.map(b => (
                      <option key={b.id} value={b.id}>{b.name}{b.enable_voice ? ' (voice)' : ''}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Link this agent to an existing bot to inherit its knowledge base and settings.</p>
                </div>
              )}
            </div>

            {/* Preset & goal */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Role & goal</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Voice preset</label>
                  <select name="preset" defaultValue=""
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
                  <select name="goal" defaultValue=""
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

            {/* Voice personality */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Voice personality</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tone</label>
                  <select name="tone" defaultValue="professional"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pace</label>
                  <select name="pace" defaultValue="moderate"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="slow">Slow</option>
                    <option value="moderate">Moderate</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'empathy',       label: 'Empathy',       default: 3 },
                  { name: 'assertiveness', label: 'Assertiveness', default: 3 },
                  { name: 'formality',     label: 'Formality',     default: 3 },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {field.label} <span className="text-xs text-gray-400">(1–5)</span>
                    </label>
                    <input type="number" name={field.name} min={1} max={5} defaultValue={field.default}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Greeting & escalation */}
            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scripts</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Greeting script</label>
                <textarea name="greeting_script" rows={3}
                  placeholder='e.g. "Thanks for calling Acme. This is Aria, your AI assistant. How can I help you today?"'
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Escalation rules</label>
                <textarea name="escalation_rules" rows={3}
                  placeholder="e.g. Transfer to a human when caller asks to speak with a person, or after 2 failed attempts to resolve the issue."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link href="/phone/voice-agents"
                className="px-4 py-2 border dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                Cancel
              </Link>
              <button type="submit"
                className="px-5 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-lg transition-colors">
                Create agent
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
