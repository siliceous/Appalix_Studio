import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { updateBot } from '@/app/actions/bot'
import type { Metadata } from 'next'
import type { Bot } from '@/lib/types'

export const metadata: Metadata = { title: 'Edit bot' }

const ALL_MODELS = [
  { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (recommended)' },
  { value: 'claude-opus-4-6',           label: 'Claude Opus 4.6 (most capable)'  },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest)'      },
]
const HAIKU_ONLY = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
]

export default async function EditBotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: botRaw } = await supabase.from('bots').select('*').eq('id', id).single()
  const bot = botRaw as Bot | null
  if (!bot) notFound()

  const { data: wsRaw } = await supabase
    .from('workspaces').select('plan').eq('id', bot.workspace_id).single()
  const workspacePlan = (wsRaw as { plan: string } | null)?.plan ?? 'starter'
  const planLocksModel = workspacePlan === 'starter' || workspacePlan === 'core'
  const availableModels = planLocksModel ? HAIKU_ONLY : ALL_MODELS

  const action = updateBot.bind(null, id)

  return (
    <div className="max-w-2xl">
      <Header
        title={`Edit — ${bot.name}`}
        description="Update bot configuration, system prompt, and feature toggles"
      />

      <form action={action} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Basic info</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text" name="name" required defaultValue={bot.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text" name="description" defaultValue={bot.description ?? ''}
              placeholder="Short description of what this bot does"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Model settings */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Model settings</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
              <select
                name="model" defaultValue={planLocksModel ? 'claude-haiku-4-5-20251001' : bot.model}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {availableModels.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {planLocksModel && (
                <p className="text-xs text-gray-400 mt-1">
                  Upgrade to Pro to access Sonnet and Opus.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max tokens</label>
              <input
                type="number" name="max_tokens" defaultValue={bot.max_tokens} min={256} max={8192}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Temperature <span className="text-gray-400">(0–1)</span></label>
              <input
                type="number" name="temperature" defaultValue={bot.temperature} min={0} max={1} step={0.1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Features</p>
          <div className="space-y-3">
            {[
              { name: 'enable_rag',    label: 'Knowledge Base (RAG)', desc: 'Bot answers using indexed sources from your Knowledge Base', checked: bot.enable_rag },
              { name: 'enable_memory', label: 'Conversation memory',  desc: 'Bot remembers previous messages in the same conversation',  checked: bot.enable_memory },
              { name: 'enable_tools',  label: 'Tools / Agent mode',   desc: 'Bot can use tools and run multi-step agent tasks',          checked: bot.enable_tools },
            ].map(({ name, label, desc, checked }) => (
              <label key={name} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox" name={name} defaultChecked={checked}
                  className="mt-0.5 accent-brand-600 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* System prompt */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">System prompt</p>
          <textarea
            name="system_prompt" rows={8} defaultValue={bot.system_prompt ?? ''}
            placeholder="You are a helpful assistant for Acme Inc. Answer questions about our products clearly and concisely..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y font-mono"
          />
        </div>

        {/* Fallback message */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Fallback message</p>
          <input
            type="text" name="fallback_message" defaultValue={bot.fallback_message ?? ''}
            placeholder="I'm sorry, I couldn't generate a response. Please try again."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400">Shown when the AI fails to produce a reply.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save changes
          </button>
          <a href={`/bots/${id}`} className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
