'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Globe, Sparkles, Bot, MessageSquare, BookOpen, Sliders, Check, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANGUAGE_GROUPS } from '@/lib/languages'

const DEFAULT_SYSTEM_PROMPT = `You are an AI Business Agent deployed on this website.

Your role is to:
1. Identify visitor intent (Sales, Support, General).
2. Qualify potential leads intelligently.
3. Guide visitors toward the best next action.
4. Create tickets when needed.
5. Keep responses concise, friendly, and professional.

--------------------------------------
COMMUNICATION STYLE
--------------------------------------

- Be friendly, clear, and concise.
- Ask one question at a time.
- Avoid long explanations unless asked.
- Focus on moving the visitor toward a useful next step.
- Do not overwhelm with unnecessary information.

--------------------------------------
INTENT DETECTION
--------------------------------------

Classify each conversation internally as:

SALES INTENT if:
- Asking about pricing, demo, quote, services, or features.
- Mentions timeline, budget, or urgency.
- Comparing solutions or evaluating options.

SUPPORT INTENT if:
- Mentions issue, error, problem, not working, billing, or access.
- Refers to an existing account or prior service.

GENERAL INTENT if:
- Informational questions.
- Casual browsing.
- Non-specific inquiries.

--------------------------------------
MULTI-STEP QUALIFICATION (Sales)
--------------------------------------

When Sales intent is detected, qualify gradually — do not ask for everything at once.

Step 1 – Identify goal:
"What are you looking to improve right now?"

Step 2 – Understand context:
"Is this for your company or a client?"

Step 3 – Capture essentials naturally (one at a time):
- Name
- Email
- Company
- Phone (only if relevant)

Step 4 – Qualify urgency:
"Are you looking to implement this soon or just exploring?"

--------------------------------------
CONVERSION PROMPTS
--------------------------------------

If the visitor shows clear buying intent (urgent, asking about pricing, requesting a demo or proposal):
"The fastest way to move forward is a quick strategy session. You can book a time using the button below."

If the visitor is exploring but interested:
"I can outline the best approach for your situation. Would you like me to do that?"

If the visitor is just browsing:
Provide helpful information without pressure.

--------------------------------------
PRICING QUESTIONS
--------------------------------------

If a visitor asks about pricing:

1. Acknowledge the question briefly.
2. Ask for context before answering.

Example:
"Pricing depends on your goals and scope. Could you share a bit about your website or what you're aiming to achieve?"

Never invent or guarantee pricing figures.

--------------------------------------
EMAIL SUMMARY
--------------------------------------

If a visitor shares their email address, offer once:
"Would you like me to send a short summary of our conversation to your email?"

Do not repeat this offer.

--------------------------------------
SUPPORT FLOW
--------------------------------------

If Support intent is detected:

1. Ask a short clarifying question if needed.
2. Collect name and email.
3. Offer to create a support ticket.

Example:
"I can create a support ticket for this. May I have your name and email?"

After confirmation:
"A support request has been created. Our team will follow up shortly."

--------------------------------------
FALLBACK RESPONSES
--------------------------------------

If unsure about an answer:
"I want to make sure I give you accurate information. Let me connect you with our team."

If a question is outside your knowledge:
"I don't have that detail right now, but I can get it for you."

Never guess or invent answers.

--------------------------------------
ESCALATION
--------------------------------------

Escalate to the team when:
- Legal or contractual questions arise.
- Complex pricing negotiation is needed.
- Enterprise security or compliance is discussed.
- Technical integrations go beyond documentation.

Use: "Let me connect you with our team."

--------------------------------------
BEHAVIOUR RULES
--------------------------------------

- Never invent facts, guarantees, or pricing.
- Never claim results that cannot be verified.
- Never pretend to be human — always be transparent that you are an AI assistant.

--------------------------------------
CONVERSATION CLOSING
--------------------------------------

When the question is resolved or the conversation winds down:
"Happy to send you more details or set up a call — just let me know if there's anything else I can help with."

--------------------------------------
GOAL
--------------------------------------

Your objective is to:
- Identify intent quickly.
- Qualify intelligently without friction.
- Increase conversions.
- Improve support efficiency.
- Make every visitor interaction simple, helpful, and comfortable.`

const STEPS = [
  { id: 'type',     icon: Bot,          title: 'Bot type',        sub: 'What will this bot do?' },
  { id: 'info',     icon: MessageSquare, title: 'Name your bot',  sub: 'Give it an identity' },
  { id: 'behavior', icon: BookOpen,      title: 'Behaviour',      sub: 'How should it respond?' },
  { id: 'features', icon: Sliders,       title: 'Features',       sub: 'Fine-tune capabilities' },
]

export default function NewBotPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    bot_type: 'widget' as 'widget' | 'internal',
    model: 'claude-sonnet-4-6',
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    max_tokens: 1024,
    temperature: 0.70,
    enable_rag: true,
    enable_tools: false,
    enable_memory: true,
    language_preference: 'auto',
  })

  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: membership } = await supabase
        .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
      if (!membership) return
      const { data: ws } = await supabase
        .from('workspaces').select('plan').eq('id', (membership as { workspace_id: string }).workspace_id).single()
      const plan = (ws as { plan: string } | null)?.plan ?? 'starter'
      const model = (plan === 'starter' || plan === 'core') ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
      setForm((prev) => ({ ...prev, model }))
    }
    void fetchPlan()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function next() {
    setError(null)
    if (step === 1 && !form.name.trim()) { setError('Please give your bot a name.'); return }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: membershipRaw } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
    const membership = membershipRaw as { workspace_id: string } | null
    if (!membership) { setError('No workspace found'); setSaving(false); return }

    const { data, error: insertError } = await supabase
      .from('bots')
      .insert({ ...form, workspace_id: membership.workspace_id, created_by: user.id } as never)
      .select('id')
      .single()

    if (insertError) { setError(insertError.message); setSaving(false); return }
    router.push(`/bots/${(data as unknown as { id: string }).id}`)
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create a new bot</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">4 quick steps — you can edit everything later.</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full',
                active  ? 'bg-brand-500 text-white'                                               : '',
                done    ? 'bg-brand-50 dark:bg-[#15A4AE]/10 text-brand-700 dark:text-brand-400'  : '',
                !active && !done ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500' : '',
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                  active ? 'bg-white/20' : done ? 'bg-brand-100 dark:bg-[#15A4AE]/20' : 'bg-gray-200 dark:bg-white/10',
                )}>
                  {done
                    ? <Check className="w-3 h-3" />
                    : <span className="text-[10px] font-bold">{i + 1}</span>
                  }
                </div>
                <span className="hidden sm:block truncate">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-3 shrink-0', i < step ? 'bg-brand-300 dark:bg-brand-500/50' : 'bg-gray-200 dark:bg-white/10')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 overflow-hidden">

        {/* Step header */}
        <div className="px-6 pt-6 pb-4 border-b dark:border-white/10">
          <div className="flex items-center gap-3">
            {(() => { const Icon = STEPS[step].icon; return <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-[#15A4AE]/10 flex items-center justify-center"><Icon className="w-4.5 h-4.5 text-brand-600 dark:text-[#15A4AE]" /></div> })()}
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Step {step + 1} of {STEPS.length}</p>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{STEPS[step].title}</h2>
            </div>
          </div>
        </div>

        {/* Step body */}
        <div className="p-6 space-y-5">

          {/* Step 1 — Bot type */}
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                {
                  value: 'widget',
                  icon: Globe,
                  label: 'Customer chatbot',
                  desc: 'Talks to visitors on your website, Slack, WhatsApp, and other channels.',
                },
                {
                  value: 'internal',
                  icon: Sparkles,
                  label: 'Internal assistant',
                  desc: 'Powers your Appalix workspace AI — for your team only (Pro+).',
                },
              ] as const).map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('bot_type', value)}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-colors',
                    form.bot_type === value
                      ? 'border-brand-500 bg-brand-50 dark:border-[#15A4AE]/60 dark:bg-[#15A4AE]/5'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20',
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center mb-3',
                    form.bot_type === value ? 'bg-brand-100 dark:bg-[#15A4AE]/10' : 'bg-gray-100 dark:bg-white/5',
                  )}>
                    <Icon className={cn('w-4 h-4', form.bot_type === value ? 'text-brand-600 dark:text-[#15A4AE]' : 'text-gray-400')} />
                  </div>
                  <p className={cn('text-sm font-semibold mb-1', form.bot_type === value ? 'text-brand-700 dark:text-[#15A4AE]' : 'text-gray-900 dark:text-gray-100')}>{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Name & description */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bot name *</label>
                <input
                  autoFocus
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Support Bot, Sales Assistant"
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">This name is shown to your team. Visitors see whatever you set in the widget settings.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="What does this bot do?"
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent"
                />
              </div>
            </>
          )}

          {/* Step 3 — Behaviour */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System prompt</label>
                <p className="text-xs text-gray-400 mb-2">This tells the bot how to behave. A solid default is already filled in — customise it for your business or leave it as-is.</p>
                <textarea
                  rows={14}
                  value={form.system_prompt}
                  onChange={(e) => set('system_prompt', e.target.value)}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none dark:bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Response language</label>
                <select
                  value={form.language_preference}
                  onChange={(e) => set('language_preference', e.target.value)}
                  className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-[#2a2a2a]"
                >
                  {LANGUAGE_GROUPS.map(({ group, options }) => (
                    <optgroup key={group} label={group}>
                      {options.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Auto matches whatever language the visitor writes in.</p>
              </div>
            </>
          )}

          {/* Step 4 — Features */}
          {step === 3 && (
            <>
              <div className="space-y-3">
                {(
                  [
                    { key: 'enable_rag',    label: 'Knowledge base (RAG)', desc: 'Bot searches your uploaded docs and website before responding — keeps answers accurate.' },
                    { key: 'enable_memory', label: 'Memory',               desc: 'Remembers context across a conversation so it doesn\'t ask the same thing twice.' },
                    { key: 'enable_tools',  label: 'Tools',                 desc: 'Lets the bot call external actions (e.g. create a ticket, look up an order).' },
                  ] as const
                ).map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => set(key, e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max tokens</label>
                  <input
                    type="number" min={1} max={32000}
                    value={form.max_tokens}
                    onChange={(e) => set('max_tokens', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Max length of each reply.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Creativity ({form.temperature})
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={form.temperature}
                    onChange={(e) => set('temperature', parseFloat(e.target.value))}
                    className="w-full mt-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">0 = precise, 1 = creative.</p>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t dark:border-white/10 flex items-center justify-between gap-3">
          <div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Back
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={next}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Creating…' : 'Create bot'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
