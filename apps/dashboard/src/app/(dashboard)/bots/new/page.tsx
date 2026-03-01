'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { SubmitButton } from '@/components/ui/submit-button'
import { Globe, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANGUAGE_GROUPS } from '@/lib/languages'

export default function NewBotPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: membership } = await supabase
        .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
      if (!membership) return
      const { data: ws } = await supabase
        .from('workspaces').select('plan').eq('id', (membership as { workspace_id: string }).workspace_id).single()
      const plan = (ws as { plan: string } | null)?.plan ?? 'starter'
      // Auto-select model based on plan — not exposed to the user
      const model = (plan === 'starter' || plan === 'core')
        ? 'claude-haiku-4-5-20251001'
        : 'claude-sonnet-4-6'
      setForm((prev) => ({ ...prev, model }))
    }
    void fetchPlan()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm] = useState({
    name: '',
    description: '',
    bot_type: 'widget' as 'widget' | 'internal',
    model: 'claude-sonnet-4-6',
    system_prompt: '',
    max_tokens: 1024,
    temperature: 0.70,
    enable_rag: true,
    enable_tools: false,
    enable_memory: true,
    language_preference: 'auto',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: membershipRaw } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
    const membership = membershipRaw as { workspace_id: string } | null
    if (!membership) { setError('No workspace found'); setSaving(false); return }

    const { data, error: insertError } = await supabase
      .from('bots')
      .insert({ ...form, workspace_id: membership.workspace_id } as never)
      .select('id')
      .single()

    if (insertError) { setError(insertError.message); setSaving(false); return }
    router.push(`/bots/${(data as unknown as { id: string }).id}`)
  }

  return (
    <div className="max-w-2xl">
      <Header title="New bot" description="Configure your AI agent" />

      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 divide-y dark:divide-white/10">

        {/* Bot type */}
        <section className="p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bot type</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              {
                value: 'widget',
                icon: Globe,
                label: 'Customer chatbot',
                desc: 'Embedded on websites and chat platforms for customer support',
              },
              {
                value: 'internal',
                icon: Sparkles,
                label: 'Internal assistant',
                desc: 'Powers your Appalix workspace AI — for your team only (Pro+)',
              },
            ] as const).map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => set('bot_type', value)}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-colors',
                  form.bot_type === value
                    ? 'border-brand-500 bg-brand-50 dark:border-[#61c2ad]/60 dark:bg-[#61c2ad]/5'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20',
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
                  form.bot_type === value
                    ? 'bg-brand-100 dark:bg-[#61c2ad]/10'
                    : 'bg-gray-100 dark:bg-white/5',
                )}>
                  <Icon className={cn(
                    'w-4 h-4',
                    form.bot_type === value
                      ? 'text-brand-600 dark:text-[#61c2ad]'
                      : 'text-gray-500 dark:text-gray-400',
                  )} />
                </div>
                <p className={cn(
                  'text-sm font-medium mb-0.5',
                  form.bot_type === value ? 'text-brand-700 dark:text-[#61c2ad]' : 'text-gray-900 dark:text-gray-100',
                )}>{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Basic info */}
        <section className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic info</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bot name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Support Bot"
              className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What does this bot do?"
              className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </section>

        {/* Model config */}
        <section className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI settings</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System prompt
            </label>
            <textarea
              rows={5}
              value={form.system_prompt}
              onChange={(e) => set('system_prompt', e.target.value)}
              placeholder="You are a helpful support agent for Acme Inc. Answer questions about our products and escalate complex issues to a human agent."
              className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Response language</label>
            <select
              value={form.language_preference}
              onChange={(e) => set('language_preference', e.target.value)}
              className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {LANGUAGE_GROUPS.map(({ group, options }) => (
                <optgroup key={group} label={group}>
                  {options.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Auto lets the bot match whatever language the user writes in.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max tokens</label>
              <input
                type="number" min={1} max={32000}
                value={form.max_tokens}
                onChange={(e) => set('max_tokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperature ({form.temperature})
              </label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={form.temperature}
                onChange={(e) => set('temperature', parseFloat(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>
        </section>

        {/* Feature flags */}
        <section className="p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Features</h2>
          {(
            [
              { key: 'enable_rag',    label: 'Enable RAG',    desc: 'Search knowledge base before responding' },
              { key: 'enable_tools',  label: 'Enable tools',  desc: 'Allow the bot to call external tools' },
              { key: 'enable_memory', label: 'Memory',        desc: 'Maintain conversation history across turns' },
            ] as const
          ).map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{desc}</span>
              </span>
            </label>
          ))}
        </section>

        {/* Submit */}
        <div className="p-6 flex items-center gap-3">
          {error && <p className="text-sm text-red-600 flex-1">{error}</p>}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <SubmitButton
              disabled={saving}
              pendingText="Creating…"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create bot
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  )
}
