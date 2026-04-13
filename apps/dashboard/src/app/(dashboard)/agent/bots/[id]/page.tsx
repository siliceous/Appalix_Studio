import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { SubmitButton } from '@/components/ui/submit-button'
import { updateBotVoice } from '@/app/actions/voice'
import type { Bot } from '@/lib/types'
import { Mic, Settings, ChevronLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Bot Voice Settings' }

const VOICES = [
  { value: 'Aoede',   label: 'Aoede — Warm, clear' },
  { value: 'Charon',  label: 'Charon — Deep, authoritative' },
  { value: 'Fenrir',  label: 'Fenrir — Strong, confident' },
  { value: 'Kore',    label: 'Kore — Bright, energetic' },
  { value: 'Puck',    label: 'Puck — Friendly, upbeat' },
]

const PRESETS = [
  { value: 'receptionist', label: 'Friendly Receptionist',  desc: 'Warm, welcoming, great for first impressions' },
  { value: 'sales',        label: 'Sales Closer',           desc: 'Confident, persuasive, focused on conversion' },
  { value: 'booking',      label: 'Appointment Setter',     desc: 'Efficient, clear, drives towards booking' },
  { value: 'support',      label: 'Support Specialist',     desc: 'Patient, empathetic, problem-solving focused' },
  { value: 'lead_capture', label: 'Lead Capture Agent',     desc: 'Curious, thorough, qualifies before committing' },
]

const GOALS = [
  { value: 'book_meeting',   label: 'Book a Meeting' },
  { value: 'capture_lead',   label: 'Capture Lead Details' },
  { value: 'resolve_ticket', label: 'Resolve Support Ticket' },
  { value: 'sales_pitch',    label: 'Make a Sales Pitch' },
  { value: 'take_message',   label: 'Take a Message' },
  { value: 'route_human',    label: 'Route to Human' },
]

export default async function AgentBotVoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: botRaw } = await supabase
    .from('bots')
    .select('id,name,description,enable_voice,voice_mode,voice_name,voice_preset,voice_goal,voice_config')
    .eq('id', id)
    .single()

  if (!botRaw) notFound()
  const bot = botRaw as Pick<Bot,
    'id'|'name'|'description'|'enable_voice'|'voice_mode'|'voice_name'|'voice_preset'|'voice_goal'|'voice_config'>

  const vc = bot.voice_config ?? {}
  const action = updateBotVoice.bind(null, id)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">

          <Link href="/agent/bots"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-5 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />Back to bots
          </Link>

          <Header
            title={bot.name}
            description="Configure voice mode, personality preset, and conversation behavior"
          />

          <form action={action} className="space-y-5">

            {/* ── Enable Voice ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#15A4AE]" />Voice mode
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    When enabled, a microphone button appears in the chat widget so users can speak.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="enable_voice" defaultChecked={bot.enable_voice}
                    className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 dark:bg-white/10 peer-checked:bg-[#15A4AE] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>

              {/* Voice mode */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { value: 'text',       label: 'Text only',      desc: 'No voice',            icon: '⌨️' },
                  { value: 'voice_text', label: 'Voice + Text',   desc: 'Both modes available', icon: '🎙️' },
                  { value: 'voice',      label: 'Voice preferred', desc: 'Voice-first UX',      icon: '📢' },
                ].map(opt => (
                  <label key={opt.value} className="relative cursor-pointer">
                    <input type="radio" name="voice_mode" value={opt.value}
                      defaultChecked={(bot.voice_mode ?? 'voice_text') === opt.value}
                      className="peer sr-only" />
                    <div className="p-3 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE]/60 peer-checked:bg-[#15A4AE]/5 transition-colors text-center">
                      <div className="text-xl mb-1">{opt.icon}</div>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{opt.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Voice selection ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Voice</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Voice name</label>
                <select name="voice_name" defaultValue={bot.voice_name ?? 'Aoede'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                  {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">These are Gemini prebuilt voices. More accents and languages coming soon.</p>
              </div>
            </div>

            {/* ── Preset ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Voice preset</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Presets tune the agent&apos;s personality and opening approach. You can fine-tune further in Voice Training.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <label className="relative cursor-pointer">
                  <input type="radio" name="voice_preset" value=""
                    defaultChecked={!bot.voice_preset}
                    className="peer sr-only" />
                  <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE]/60 peer-checked:bg-[#15A4AE]/5 transition-colors">
                    <span className="text-lg">🤖</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No preset (custom)</p>
                      <p className="text-xs text-gray-400">Use only your system prompt</p>
                    </div>
                  </div>
                </label>
                {PRESETS.map(p => (
                  <label key={p.value} className="relative cursor-pointer">
                    <input type="radio" name="voice_preset" value={p.value}
                      defaultChecked={bot.voice_preset === p.value}
                      className="peer sr-only" />
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE]/60 peer-checked:bg-[#15A4AE]/5 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.label}</p>
                        <p className="text-xs text-gray-400">{p.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Goal ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Primary goal</p>
                <p className="text-xs text-gray-400 mt-0.5">The bot will guide every conversation toward this outcome.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map(g => (
                  <label key={g.value} className="relative cursor-pointer">
                    <input type="radio" name="voice_goal" value={g.value}
                      defaultChecked={bot.voice_goal === g.value}
                      className="peer sr-only" />
                    <div className="p-3 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE]/60 peer-checked:bg-[#15A4AE]/5 transition-colors">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{g.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Behaviour ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conversation behaviour</p>
                <p className="text-xs text-gray-400 mt-0.5">Fine-tune how the bot handles interactions.</p>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'ask_one_at_a_time',  label: 'Ask one question at a time',      desc: 'Never fire multiple questions in one turn', checked: vc.ask_one_at_a_time },
                  { name: 'confirm_details',     label: 'Confirm details back to caller',  desc: "Reads back what was captured: \"So you're John, calling about…\"", checked: vc.confirm_details },
                  { name: 'push_for_booking',    label: 'Push for a booking / next step',  desc: 'Always end with an ask for a meeting or callback', checked: vc.push_for_booking },
                  { name: 'escalate_sooner',     label: 'Escalate to human sooner',        desc: 'Lower threshold for handing off to a real person', checked: vc.escalate_sooner },
                  { name: 'collect_lead_first',  label: 'Collect contact before answering deeply', desc: 'Get name/email/phone before diving into questions', checked: vc.collect_lead_first },
                ].map(item => (
                  <label key={item.name}
                    className="flex items-start gap-3 p-3 rounded-lg border dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <input type="checkbox" name={item.name} defaultChecked={!!item.checked}
                      className="mt-0.5 accent-[#15A4AE] w-4 h-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Greeting & Escalation ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scripts</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Opening greeting <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea name="greeting_script" rows={3}
                  defaultValue={vc.greeting_script ?? ''}
                  placeholder={"e.g. \"Hi there! Thanks for reaching out to Acme. I'm here to help. What can I do for you today?\""}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use the default greeting from your system prompt.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Escalation rules <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea name="escalation_rules" rows={3}
                  defaultValue={vc.escalation_rules ?? ''}
                  placeholder={"e.g. \"If the caller is upset or mentions billing issues, say: I'm going to connect you with a specialist now.\""}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
              </div>
            </div>

            {/* ── Tone & Pace ── */}
            <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personality</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tone</label>
                  <select name="tone" defaultValue={vc.tone ?? 'professional'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pace</label>
                  <select name="pace" defaultValue={vc.pace ?? 'moderate'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                    <option value="slow">Slow — deliberate</option>
                    <option value="moderate">Moderate</option>
                    <option value="fast">Fast — efficient</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'empathy',       label: 'Empathy',       default: vc.empathy       ?? 3 },
                  { name: 'assertiveness', label: 'Assertiveness', default: vc.assertiveness ?? 3 },
                  { name: 'formality',     label: 'Formality',     default: vc.formality     ?? 3 },
                ].map(s => (
                  <div key={s.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {s.label} <span className="text-gray-400">(1–5)</span>
                    </label>
                    <input type="number" name={s.name} min={1} max={5} defaultValue={s.default}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="flex items-center gap-3">
              <SubmitButton pendingText="Saving…"
                className="px-5 py-2.5 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                Save voice settings
              </SubmitButton>
              <Link href="/agent/bots"
                className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                Cancel
              </Link>
              <Link href={`/bots/${id}/edit`}
                className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <Settings className="w-3.5 h-3.5" />Full bot settings
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
