import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Mic, Zap, HeadphonesIcon, Users, Phone, Briefcase, MessageCircle, Clock } from 'lucide-react'
import type { Bot } from '@/lib/types'

export const metadata: Metadata = { title: 'Voice Training' }

const PRESETS = [
  {
    id: 'receptionist',
    label: 'Friendly Receptionist',
    icon: '🙋',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-500/10',
    traits: ['Warm & welcoming', 'Asks before answering', 'Routes effectively'],
    tone: 'friendly', pace: 'moderate', empathy: 4, assertiveness: 2, formality: 3,
  },
  {
    id: 'sales',
    label: 'Sales Closer',
    icon: '💼',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    traits: ['Confident & persuasive', 'Handles objections', 'Drives to close'],
    tone: 'professional', pace: 'moderate', empathy: 3, assertiveness: 5, formality: 3,
  },
  {
    id: 'booking',
    label: 'Appointment Setter',
    icon: '📅',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    traits: ['Efficient & clear', 'Time-aware', 'Confirms details'],
    tone: 'professional', pace: 'moderate', empathy: 3, assertiveness: 4, formality: 3,
  },
  {
    id: 'support',
    label: 'Support Specialist',
    icon: '🎧',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    traits: ['Patient & empathetic', 'Problem-solving', 'Escalates when needed'],
    tone: 'friendly', pace: 'slow', empathy: 5, assertiveness: 2, formality: 2,
  },
  {
    id: 'lead_capture',
    label: 'Lead Capture Agent',
    icon: '🎯',
    color: 'text-[#15A4AE]',
    bg: 'bg-[#15A4AE]/10',
    traits: ['Curious & thorough', 'Collects details first', 'Qualifies urgency'],
    tone: 'friendly', pace: 'moderate', empathy: 3, assertiveness: 3, formality: 3,
  },
  {
    id: 'consultant',
    label: 'Professional Consultant',
    icon: '🧑‍💼',
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-white/8',
    traits: ['Expert tone', 'Detailed answers', 'High credibility'],
    tone: 'formal', pace: 'slow', empathy: 3, assertiveness: 3, formality: 5,
  },
]

export default async function VoiceTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>
}) {
  const params = await searchParams
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
    .select('id,name,enable_voice,voice_preset,voice_mode')
    .eq('workspace_id', member.workspace_id)
    .order('name', { ascending: true })

  const bots = (botsRaw ?? []) as Pick<Bot, 'id'|'name'|'enable_voice'|'voice_preset'|'voice_mode'>[]
  const selectedBot = params.bot ? bots.find(b => b.id === params.bot) : null

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Header
            title="Voice Training"
            description="Choose a preset to instantly configure how your voice bot speaks and behaves. Fine-tune per bot from the bot editor."
          />

          {/* Bot selector */}
          {bots.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">Training for:</span>
                <Link href="/agent/voice-training"
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    !params.bot
                      ? 'bg-[#15A4AE]/10 text-[#15A4AE]'
                      : 'border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}>
                  All bots
                </Link>
                {bots.filter(b => b.enable_voice).map(b => (
                  <Link key={b.id} href={`/agent/voice-training?bot=${b.id}`}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      params.bot === b.id
                        ? 'bg-[#15A4AE]/10 text-[#15A4AE]'
                        : 'border dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}>
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Preset cards */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Voice presets</h2>
            <p className="text-xs text-gray-400 mb-4">
              Click a preset to apply it to {selectedBot ? selectedBot.name : 'a bot'}. Each preset sets tone, pace, empathy, and behaviour defaults.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {PRESETS.map(p => (
                <div key={p.id} className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className={`${p.bg} w-10 h-10 rounded-xl flex items-center justify-center text-xl`}>
                      {p.icon}
                    </div>
                    {selectedBot?.voice_preset === p.id && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#15A4AE]/10 text-[#15A4AE]">Active</span>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${p.color}`}>{p.label}</p>
                    <ul className="mt-2 space-y-1">
                      {p.traits.map(t => (
                        <li key={t} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-1 border-t dark:border-white/8">
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{p.tone}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">{p.pace} pace</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">E:{p.empathy} A:{p.assertiveness}</span>
                  </div>
                  <Link
                    href={selectedBot
                      ? `/agent/bots/${selectedBot.id}?preset=${p.id}`
                      : `/agent/bots?action=apply_preset&preset=${p.id}`}
                    className="mt-auto block text-center text-xs font-medium px-3 py-2 rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors">
                    {selectedBot ? `Apply to ${selectedBot.name}` : 'Select a bot to apply'}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Personality controls reference */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
              <div className="px-5 py-4 border-b dark:border-white/8">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personality controls</h2>
                <p className="text-xs text-gray-400 mt-0.5">Per-bot settings available in the bot editor</p>
              </div>
              <div className="divide-y dark:divide-white/5">
                {[
                  { label: 'Tone',         desc: 'Friendly / Professional / Casual / Formal' },
                  { label: 'Pace',         desc: 'Slow / Moderate / Fast' },
                  { label: 'Empathy',      desc: '1 (minimal) → 5 (highly empathetic)' },
                  { label: 'Assertiveness',desc: '1 (passive) → 5 (highly assertive)' },
                  { label: 'Formality',    desc: '1 (very casual) → 5 (very formal)' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
              <div className="px-5 py-4 border-b dark:border-white/8">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Behaviour controls</h2>
                <p className="text-xs text-gray-400 mt-0.5">Toggle conversation behaviours per bot</p>
              </div>
              <div className="divide-y dark:divide-white/5">
                {[
                  { label: 'Ask one at a time',         desc: 'Never stack multiple questions' },
                  { label: 'Confirm details',           desc: "Reads back captured info before proceeding" },
                  { label: 'Push for booking',          desc: 'Always close with a next-step ask' },
                  { label: 'Escalate sooner',           desc: 'Lower threshold for human handoff' },
                  { label: 'Collect lead first',        desc: 'Gather contact details before deep answers' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                    <span className="text-xs text-gray-400 text-right max-w-[160px]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Goals reference */}
          <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 mb-8">
            <div className="px-5 py-4 border-b dark:border-white/8">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Goal presets</h2>
              <p className="text-xs text-gray-400 mt-0.5">Each bot can be assigned one primary goal that shapes every conversation</p>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x dark:divide-white/8">
              {[
                { icon: '📅', label: 'Book a meeting',       desc: 'Drive every call to a calendar booking' },
                { icon: '🎯', label: 'Capture lead',         desc: 'Collect name, email, phone, and context' },
                { icon: '🎫', label: 'Resolve ticket',       desc: 'Help caller and create a ticket if needed' },
                { icon: '💼', label: 'Sales pitch',          desc: 'Qualify and present your offer' },
                { icon: '📝', label: 'Take a message',       desc: 'Record caller info for follow-up' },
                { icon: '↗️', label: 'Route to human',       desc: 'Triage and hand off to the right person' },
              ].map(g => (
                <div key={g.label} className="px-5 py-4 flex items-start gap-3">
                  <span className="text-xl">{g.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{g.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="flex items-center gap-3">
            <Link href="/agent/bots"
              className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 text-sm font-medium rounded-lg transition-colors">
              <Mic className="w-4 h-4" />Go to bots
            </Link>
            <Link href="/agent/knowledge-base/voice"
              className="flex items-center gap-2 px-4 py-2 border dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium rounded-lg transition-colors">
              Voice knowledge base →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
