import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PLATFORM_META, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Bot, Integration, AgentRun } from '@/lib/types'

export const metadata: Metadata = { title: 'Bot settings' }

const MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-4-6':        'Claude Sonnet',
  'claude-haiku-4-5-20251001': 'Claude Haiku',
  'claude-opus-4-6':           'Claude Opus',
}

export default async function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: botRaw } = await supabase
    .from('bots')
    .select('*')
    .eq('id', id)
    .single()
  const bot = botRaw as Bot | null

  if (!bot) notFound()

  const { data: integrationsRaw } = await supabase
    .from('integrations')
    .select('id, name, platform, status, created_at')
    .eq('bot_id', id)
    .order('created_at', { ascending: false })
  const integrations = (integrationsRaw ?? []) as Pick<Integration, 'id' | 'name' | 'platform' | 'status' | 'created_at'>[]

  const { data: recentRunsRaw } = await supabase
    .from('agent_runs')
    .select('id, status, steps, tokens_input, tokens_output, duration_ms, started_at')
    .eq('bot_id', id)
    .order('started_at', { ascending: false })
    .limit(5)
  const recentRuns = (recentRunsRaw ?? []) as Pick<AgentRun, 'id' | 'status' | 'steps' | 'tokens_input' | 'tokens_output' | 'duration_ms' | 'started_at'>[]

  return (
    <div className="max-w-3xl">
      <Header
        title={bot.name}
        description={bot.description ?? undefined}
        action={
          <a
            href={`/bots/${id}/edit`}
            className="px-3 py-1.5 border text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </a>
        }
      />

      <div className="space-y-5">
        {/* Config summary */}
        <div className="bg-white rounded-xl border divide-y">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Configuration</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                { label: 'Model',        value: MODEL_LABELS[bot.model] ?? bot.model },
                { label: 'Max tokens',   value: bot.max_tokens },
                { label: 'Temperature',  value: bot.temperature },
                { label: 'RAG',          value: bot.enable_rag ? 'Enabled' : 'Disabled' },
                { label: 'Tools',        value: bot.enable_tools ? 'Enabled' : 'Disabled' },
                { label: 'Memory',       value: bot.enable_memory ? 'Enabled' : 'Disabled' },
                { label: 'Created',      value: formatDate(bot.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {bot.system_prompt && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">System prompt</p>
              <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans">
                {bot.system_prompt}
              </pre>
            </div>
          )}
        </div>

        {/* Connected integrations */}
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Connected integrations</h2>
            <a href="/integrations/new" className="text-xs text-brand-600 hover:underline">+ Add</a>
          </div>
          {integrations?.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">No integrations connected to this bot.</p>
          ) : (
            <div className="divide-y">
              {integrations?.map((int) => (
                <div key={int.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_META[int.platform]?.color}`}>
                    {PLATFORM_META[int.platform]?.label}
                  </span>
                  <span className="text-sm text-gray-900 flex-1">{int.name}</span>
                  <span className={`text-xs font-medium ${int.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                    {int.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent agent runs */}
        {recentRuns && recentRuns.length > 0 && (
          <div className="bg-white rounded-xl border">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Recent agent runs</h2>
            </div>
            <div className="divide-y">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center gap-4 px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    run.status === 'completed' ? 'bg-green-100 text-green-700' :
                    run.status === 'failed'    ? 'bg-red-100 text-red-600' :
                                                'bg-yellow-100 text-yellow-700'
                  }`}>{run.status}</span>
                  <span className="text-xs text-gray-500 flex-1">
                    {run.steps} steps · {run.tokens_input + run.tokens_output} tokens
                    {run.duration_ms != null && ` · ${(run.duration_ms / 1000).toFixed(1)}s`}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(run.started_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
