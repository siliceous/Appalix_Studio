import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { updateBot } from '@/app/actions/bot'
import type { Metadata } from 'next'
import type { Bot } from '@/lib/types'
import { Globe, Sparkles } from 'lucide-react'
import { LANGUAGE_GROUPS } from '@/lib/languages'

export const metadata: Metadata = { title: 'Edit bot' }

export default async function EditBotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: botRaw } = await supabase.from('bots').select('*').eq('id', id).single()
  const bot = botRaw as Bot | null
  if (!bot) notFound()

  const action = updateBot.bind(null, id)

  return (
    <div className="max-w-2xl">
      <Header
        title={`Edit — ${bot.name}`}
        description="Update bot configuration, system prompt, and feature toggles"
      />

      <form action={action} className="space-y-5">

        {/* Bot type */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bot type</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'widget',   Icon: Globe,     label: 'Customer chatbot',     desc: 'Embedded on websites and chat platforms for customer support' },
              { value: 'internal', Icon: Sparkles,  label: 'Internal assistant',   desc: 'Powers your Sage workspace AI — for your team only (Pro+)' },
            ] as const).map(({ value, Icon, label, desc }) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="bot_type"
                  value={value}
                  defaultChecked={(bot.bot_type ?? 'widget') === value}
                  className="peer sr-only"
                />
                <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 peer-checked:border-brand-500 dark:peer-checked:border-[#61c2ad]/60 peer-checked:bg-brand-50 dark:peer-checked:bg-[#61c2ad]/5 transition-colors h-full">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 peer-checked:bg-brand-100 flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-0.5">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
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

        {/* AI settings */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI settings</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max tokens</label>
              <input
                type="number" name="max_tokens" defaultValue={bot.max_tokens} min={256} max={8192}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Temperature <span className="text-gray-400">(0–1)</span></label>
              <input
                type="number" name="temperature" defaultValue={bot.temperature} min={0} max={1} step={0.1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Response language</label>
            <select
              name="language_preference"
              defaultValue={bot.language_preference ?? 'auto'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Features</p>
          <div className="space-y-3">
            {[
              { name: 'enable_rag',    label: 'Knowledge Base (RAG)', desc: 'Bot answers using indexed sources from your Knowledge Base', checked: bot.enable_rag },
              { name: 'enable_memory', label: 'Conversation memory',  desc: 'Bot remembers previous messages in the same conversation',  checked: bot.enable_memory },
              { name: 'enable_tools',  label: 'Tools / Agent mode',   desc: 'Bot can use tools and run multi-step agent tasks',          checked: bot.enable_tools },
            ].map(({ name, label, desc, checked }) => (
              <label key={name} className="flex items-start gap-3 p-3 rounded-lg border dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <input
                  type="checkbox" name={name} defaultChecked={checked}
                  className="mt-0.5 accent-brand-600 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* System prompt */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">System prompt</p>
          <textarea
            name="system_prompt" rows={8} defaultValue={bot.system_prompt ?? ''}
            placeholder="You are a helpful assistant for Acme Inc. Answer questions about our products clearly and concisely..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y font-mono"
          />
        </div>

        {/* Fallback message */}
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fallback message</p>
          <input
            type="text" name="fallback_message" defaultValue={bot.fallback_message ?? ''}
            placeholder="I'm sorry, I couldn't generate a response. Please try again."
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          <a href={`/bots/${id}`} className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
