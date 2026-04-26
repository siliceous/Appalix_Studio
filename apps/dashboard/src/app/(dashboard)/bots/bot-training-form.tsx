'use client'

import { useState } from 'react'
import { saveBotVoiceConfig } from '@/app/actions/voice'
import type { Bot, VoiceConfig } from '@/lib/types'
import { Mic, Zap, Target, Brain, MessageSquare, FileText, CheckCircle2 } from 'lucide-react'
import { EnhanceableTextarea } from '@/components/ui/enhance-with-ai'

type BotVoiceData = Pick<Bot,
  'id' | 'name' | 'enable_voice' | 'voice_mode' |
  'voice_name' | 'voice_preset' | 'voice_goal' | 'voice_config'
>

const VOICES = [
  { value: 'Aoede',         label: 'Aoede — Breezy & warm',         gender: 'Female' },
  { value: 'Kore',          label: 'Kore — Firm & confident',        gender: 'Female' },
  { value: 'Zephyr',        label: 'Zephyr — Bright & crisp',        gender: 'Female' },
  { value: 'Leda',          label: 'Leda — Youthful & clear',        gender: 'Female' },
  { value: 'Sulafat',       label: 'Sulafat — Warm',                  gender: 'Female' },
  { value: 'Vindemiatrix',  label: 'Vindemiatrix — Gentle',           gender: 'Female' },
  { value: 'Puck',          label: 'Puck — Upbeat & energetic',       gender: 'Male' },
  { value: 'Charon',        label: 'Charon — Informative & deep',     gender: 'Male' },
  { value: 'Fenrir',        label: 'Fenrir — Excitable & dynamic',    gender: 'Male' },
  { value: 'Orus',          label: 'Orus — Firm & measured',          gender: 'Male' },
  { value: 'Umbriel',       label: 'Umbriel — Easy-going',            gender: 'Male' },
  { value: 'Algieba',       label: 'Algieba — Smooth',                gender: 'Male' },
]

const PRESETS = [
  { value: 'receptionist', label: 'Receptionist',   icon: '🙋', desc: 'Warm, welcoming, routes callers effectively' },
  { value: 'sales',        label: 'Sales Closer',   icon: '💼', desc: 'Confident & persuasive, drives to close' },
  { value: 'booking',      label: 'Appt. Setter',   icon: '📅', desc: 'Efficient, time-aware, confirms details' },
  { value: 'support',      label: 'Support',        icon: '🎧', desc: 'Patient & empathetic, problem-solving focused' },
  { value: 'lead_capture', label: 'Lead Capture',   icon: '🎯', desc: 'Curious, thorough, qualifies urgency first' },
]

const GOALS = [
  { value: 'book_meeting',   label: 'Book a Meeting',    icon: '📅', desc: 'Drive every call to a calendar booking' },
  { value: 'capture_lead',   label: 'Capture Lead',      icon: '🎯', desc: 'Collect name, email, phone, context' },
  { value: 'resolve_ticket', label: 'Resolve Ticket',    icon: '🎫', desc: 'Help caller & create ticket if needed' },
  { value: 'sales_pitch',    label: 'Sales Pitch',       icon: '💼', desc: 'Qualify prospect and present offer' },
  { value: 'take_message',   label: 'Take a Message',    icon: '📝', desc: 'Record caller info for follow-up' },
  { value: 'route_human',    label: 'Route to Human',    icon: '↗️', desc: 'Triage and hand off to the right person' },
]

const BEHAVIOURS: { name: keyof VoiceConfig; label: string; desc: string }[] = [
  { name: 'ask_one_at_a_time',  label: 'Ask one question at a time',        desc: 'Never fire multiple questions in one turn' },
  { name: 'confirm_details',    label: 'Confirm details back to caller',    desc: 'Reads back captured info before proceeding' },
  { name: 'push_for_booking',   label: 'Push for a booking / next step',    desc: 'Always end with an ask for a meeting or callback' },
  { name: 'escalate_sooner',    label: 'Escalate to human sooner',          desc: 'Lower threshold for handing off to a real person' },
  { name: 'collect_lead_first', label: 'Collect contact before answering',  desc: 'Get name, email, phone before deep answers' },
]

function SectionCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden border dark:border-white/8 shadow-sm">
      <div className="bg-[#141c2b] px-5 py-2.5 flex items-center gap-2.5">
        <Icon className="w-3.5 h-3.5 text-white shrink-0" />
        <p className="text-sm font-semibold text-white">{title}</p>
        <span className="text-white/30 text-sm">·</span>
        <p className="text-sm text-white">{subtitle}</p>
      </div>
      <div className="bg-white dark:bg-[#232323] p-6">
        {children}
      </div>
    </div>
  )
}

function Toggle({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="sr-only peer" />
      <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-checked:bg-[#15A4AE] rounded-full transition-colors
        after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full
        after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:after:translate-x-5" />
    </label>
  )
}

function SliderRow({ name, label, value, onChange }: {
  name: string; label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="w-32 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex-1 flex items-center gap-3">
        <div className="relative flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#15A4AE]/60 to-[#15A4AE] transition-all"
            style={{ width: `${((value - 1) / 4) * 100}%` }}
          />
          <input
            type="range" name={name} min={1} max={5} step={1}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n} type="button"
              onClick={() => onChange(n)}
              className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${
                n === value
                  ? 'bg-[#15A4AE] text-white shadow-sm scale-110'
                  : 'bg-gray-100 dark:bg-white/8 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
              }`}
            >{n}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SegmentedControl({ name, value: defaultValue, options }: {
  name: string
  value: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
      {options.map((opt, i) => (
        <label key={opt.value} className={`relative flex-1 cursor-pointer ${i > 0 ? 'border-l border-gray-200 dark:border-white/10' : ''}`}>
          <input type="radio" name={name} value={opt.value}
            defaultChecked={defaultValue === opt.value} className="peer sr-only" />
          <div className="py-2.5 text-center text-sm font-medium text-gray-500 dark:text-gray-400 peer-checked:bg-[#15A4AE]/10 peer-checked:text-[#15A4AE] transition-colors">
            {opt.label}
          </div>
        </label>
      ))}
    </div>
  )
}

export function BotTrainingForm({ bot }: { bot: BotVoiceData }) {
  const vc = (bot.voice_config ?? {}) as VoiceConfig
  const action = saveBotVoiceConfig.bind(null, bot.id)

  const [empathy,       setEmpathy]       = useState(vc.empathy       ?? 3)
  const [assertiveness, setAssertiveness] = useState(vc.assertiveness ?? 3)
  const [formality,     setFormality]     = useState(vc.formality     ?? 3)
  const [saved,         setSaved]         = useState(false)

  return (
    <form
      action={async (fd) => {
        await action(fd)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }}
      className="space-y-5 pb-10"
    >

      {/* ── Voice Mode ── */}
      <SectionCard icon={Mic} title="Voice & Mode" subtitle="Enable voice input and choose how callers interact">
        <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border dark:border-white/8">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Enable voice</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Show the microphone button in the chat widget</p>
          </div>
          <Toggle name="enable_voice" defaultChecked={bot.enable_voice} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: 'text',       label: 'Text only',       desc: 'Chat only, no voice',    icon: '⌨️' },
            { value: 'voice_text', label: 'Voice + Text',    desc: 'Both modes available',   icon: '🎙️' },
            { value: 'voice',      label: 'Voice preferred', desc: 'Voice-first experience',  icon: '📢' },
          ].map(opt => (
            <label key={opt.value} className="relative cursor-pointer">
              <input type="radio" name="voice_mode" value={opt.value}
                defaultChecked={(bot.voice_mode ?? 'voice_text') === opt.value}
                className="peer sr-only" />
              <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE] peer-checked:bg-[#15A4AE]/5 transition-all text-center cursor-pointer hover:border-gray-300 dark:hover:border-white/20">
                <div className="text-2xl mb-2">{opt.icon}</div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Voice name</label>
          <select name="voice_name" defaultValue={bot.voice_name ?? 'Aoede'}
            className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-200 appearance-none">
            <optgroup label="Female voices">
              {VOICES.filter(v => v.gender === 'Female').map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </optgroup>
            <optgroup label="Male voices">
              {VOICES.filter(v => v.gender === 'Male').map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </optgroup>
          </select>
          <p className="text-xs text-gray-400 mt-1.5">Gemini prebuilt voices — more accents coming soon.</p>
        </div>
      </SectionCard>

      {/* ── Preset ── */}
      <SectionCard icon={Zap} title="Voice Preset" subtitle="Instantly configure personality, tone, and approach">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <label className="relative cursor-pointer">
            <input type="radio" name="voice_preset" value=""
              defaultChecked={!bot.voice_preset} className="peer sr-only" />
            <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE] peer-checked:bg-[#15A4AE]/5 transition-all text-center cursor-pointer hover:border-gray-300 dark:hover:border-white/20 h-full flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">🤖</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Custom</p>
              <p className="text-xs text-gray-400 leading-tight">Use only your system prompt</p>
            </div>
          </label>
          {PRESETS.map(p => (
            <label key={p.value} className="relative cursor-pointer">
              <input type="radio" name="voice_preset" value={p.value}
                defaultChecked={bot.voice_preset === p.value} className="peer sr-only" />
              <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE] peer-checked:bg-[#15A4AE]/5 transition-all text-center cursor-pointer hover:border-gray-300 dark:hover:border-white/20 h-full flex flex-col items-center justify-center gap-2">
                <span className="text-2xl">{p.icon}</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.label}</p>
                <p className="text-xs text-gray-400 leading-tight">{p.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      {/* ── Goal ── */}
      <SectionCard icon={Target} title="Goals" subtitle="Select all outcomes this bot should pursue">
        <div className="grid grid-cols-3 gap-3">
          {GOALS.map(g => (
            <label key={g.value} className="relative cursor-pointer">
              <input type="checkbox" name="voice_goal" value={g.value}
                defaultChecked={bot.voice_goal?.includes(g.value as never) ?? false} className="peer sr-only" />
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-[#15A4AE] peer-checked:bg-[#15A4AE]/5 transition-all cursor-pointer hover:border-gray-300 dark:hover:border-white/20">
                <span className="text-xl shrink-0">{g.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{g.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{g.desc}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      {/* ── Personality + Behaviour ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <SectionCard icon={Brain} title="Personality" subtitle="Tone, pace, and fine-tuned personality dials">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tone</p>
              <SegmentedControl name="tone" value={vc.tone ?? 'professional'} options={[
                { value: 'friendly',     label: 'Friendly' },
                { value: 'professional', label: 'Professional' },
                { value: 'casual',       label: 'Casual' },
                { value: 'formal',       label: 'Formal' },
              ]} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pace</p>
              <SegmentedControl name="pace" value={vc.pace ?? 'moderate'} options={[
                { value: 'slow',     label: 'Slow' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'fast',     label: 'Fast' },
              ]} />
            </div>
            <div className="pt-1 space-y-4 border-t dark:border-white/8">
              <SliderRow name="empathy"       label="Empathy"       value={empathy}       onChange={setEmpathy} />
              <SliderRow name="assertiveness" label="Assertiveness" value={assertiveness} onChange={setAssertiveness} />
              <SliderRow name="formality"     label="Formality"     value={formality}     onChange={setFormality} />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={MessageSquare} title="Conversation Behaviour" subtitle="Fine-tune how the bot handles every interaction">
          <div className="space-y-2">
            {BEHAVIOURS.map(item => (
              <div key={item.name}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <Toggle name={item.name} defaultChecked={!!(vc[item.name] as boolean | undefined)} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Scripts ── */}
      <SectionCard icon={FileText} title="Scripts" subtitle="Opening greeting and escalation language">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opening greeting <span className="text-gray-400 font-normal text-xs ml-1">optional</span>
            </label>
            <EnhanceableTextarea
              name="greeting_script"
              fieldType="greeting_script"
              rows={5}
              defaultValue={vc.greeting_script ?? ''}
              placeholder='e.g. "Hi there! Thanks for reaching out to Acme. How can I help you today?"'
              className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 resize-y bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed"
              helperText="Leave blank to use the default greeting from your system prompt."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Escalation rules <span className="text-gray-400 font-normal text-xs ml-1">optional</span>
            </label>
            <EnhanceableTextarea
              name="escalation_rules"
              fieldType="escalation_rules"
              rows={5}
              defaultValue={vc.escalation_rules ?? ''}
              placeholder="e.g. If the caller is upset, say: I'm connecting you with a specialist now."
              className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 resize-y bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed"
              helperText="Defines when and how to hand off to a human agent."
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Save ── */}
      <div className="flex items-center justify-end gap-4 pt-2">
        {saved && (
          <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />Changes saved
          </span>
        )}
        <button type="submit"
          className="px-8 py-3 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          Save training config
        </button>
      </div>
    </form>
  )
}
