'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'

const MODELS = [
  { value: 'claude-sonnet-4-6',       label: 'Claude Sonnet 4.6  (recommended)' },
  { value: 'claude-opus-4-6',         label: 'Claude Opus 4.6  (most capable)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5  (fastest)' },
]

export default function NewBotPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    description: '',
    model: 'claude-sonnet-4-6',
    system_prompt: '',
    max_tokens: 1024,
    temperature: 0.70,
    enable_rag: true,
    enable_tools: false,
    enable_memory: true,
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

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border divide-y">
        {/* Basic info */}
        <section className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Basic info</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bot name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Support Bot"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What does this bot do?"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </section>

        {/* Model config */}
        <section className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Model</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Claude model</label>
            <select
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System prompt
            </label>
            <textarea
              rows={5}
              value={form.system_prompt}
              onChange={(e) => set('system_prompt', e.target.value)}
              placeholder="You are a helpful support agent for Acme Inc. Answer questions about our products and escalate complex issues to a human agent."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max tokens</label>
              <input
                type="number" min={1} max={32000}
                value={form.max_tokens}
                onChange={(e) => set('max_tokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Features</h2>
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
                <span className="text-sm font-medium text-gray-900">{label}</span>
                <span className="block text-xs text-gray-500">{desc}</span>
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
              className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Creating…' : 'Create bot'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
