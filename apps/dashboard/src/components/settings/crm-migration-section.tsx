'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2, LogOut, Users, Kanban } from 'lucide-react'
import { runCrmImport, disconnectCrm } from '@/app/actions/crm-import'

type Provider = 'hubspot' | 'salesforce' | 'monday' | 'zoho'
type EntityType = 'contacts' | 'deals'

interface CrmConnection {
  provider:    Provider
  connected:   boolean
  connectedAt?: string
  accountName?: string
}

interface ImportRun {
  id:          string
  provider:    Provider
  entity_type: EntityType
  status:      string
  imported:    number
  skipped:     number
  error:       string | null
  started_at:  string
}

interface Props {
  connections:   CrmConnection[]
  importHistory: ImportRun[]
}

const PLATFORM_META: Record<Provider, {
  name:    string
  tagline: string
  why:     string[]
}> = {
  hubspot: {
    name:    'HubSpot',
    tagline: 'Contacts, companies & deals',
    why: [
      'Save $800–$3,200/mo vs HubSpot Pro/Enterprise',
      'No per-seat pricing — unlimited team members',
      'AI-powered lead triage & prioritisation built-in',
      'Unified inbox: chat + email + forms in one place',
    ],
  },
  salesforce: {
    name:    'Salesforce',
    tagline: 'Contacts, leads & opportunities',
    why: [
      'Replace $1,500+/mo Salesforce with a fraction of the cost',
      'No complex setup, admin training, or Apex code',
      'AI summaries & deal insights out of the box',
      'Built-in chat bots capture leads automatically',
    ],
  },
  monday: {
    name:    'Monday.com',
    tagline: 'Board items & contacts',
    why: [
      'CRM purpose-built for leads, deals & customers',
      'AI analyses every lead and scores intent',
      'Integrated email, form & chat — not just a spreadsheet',
      'Save $500–$2,000/mo with unified CRM + inbox',
    ],
  },
  zoho: {
    name:    'Zoho CRM',
    tagline: 'Contacts, leads & deals',
    why: [
      'No per-module pricing — everything included',
      'Faster, modern UI with real-time AI insights',
      'One-click lead-to-deal with automated triage',
      'Seamless team inbox replaces Zoho Desk too',
    ],
  },
}

const PROVIDER_LOGO: Record<Provider, string> = {
  hubspot:    '/integrations/hubspot.png',
  salesforce: '/integrations/salesforce.png',
  monday:     '/integrations/monday.png',
  zoho:       '/integrations/zoho.png',
}

function ProviderIcon({ provider }: { provider: Provider }) {
  return (
    <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 border dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
      <img src={PROVIDER_LOGO[provider]} alt={PLATFORM_META[provider].name} className="w-full h-full object-contain" />
    </div>
  )
}

function ImportButton({
  provider, entityType, connected, label, icon: Icon,
}: {
  provider:   Provider
  entityType: EntityType
  connected:  boolean
  label:      string
  icon:       React.ElementType
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<{ imported: number; error?: string } | null>(null)

  async function handleImport() {
    setLoading(true)
    setResult(null)
    const res = await runCrmImport(provider, entityType)
    setResult(res)
    setLoading(false)
    if (!res.error) router.refresh()
  }

  if (!connected) return null

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleImport}
        disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
      >
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Icon className="w-3 h-3" />
        }
        {loading ? `Importing…` : label}
      </button>
      {result && !result.error && (
        <span className="text-[10px] text-[#15A4AE] font-medium flex items-center gap-0.5">
          <CheckCircle2 className="w-3 h-3" /> {result.imported}
        </span>
      )}
      {result?.error && (
        <span className="text-[10px] text-red-500 flex items-center gap-0.5">
          <AlertCircle className="w-3 h-3" />
        </span>
      )}
    </div>
  )
}

function ProviderCard({ conn, history }: { conn: CrmConnection; history: ImportRun[] }) {
  const router = useRouter()
  const meta   = PLATFORM_META[conn.provider]
  const [disconnecting, setDisconnecting] = useState(false)
  const [expanded,      setExpanded]      = useState(false)

  async function handleDisconnect() {
    setDisconnecting(true)
    await disconnectCrm(conn.provider)
    setDisconnecting(false)
    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 overflow-hidden flex flex-col">
      {/* Header row */}
      <div className="px-4 py-3.5 flex items-center gap-3">
        <ProviderIcon provider={conn.provider} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{meta.name}</span>
            {conn.connected
              ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-medium border border-green-200 dark:border-green-500/20">Connected</span>
              : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 font-medium">Not connected</span>
            }
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            {conn.connected && conn.accountName ? conn.accountName : meta.tagline}
          </p>
        </div>
        {/* Right-side controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-gray-400 hover:text-[#15A4AE] transition-colors whitespace-nowrap"
          >
            {expanded ? 'Hide' : 'Why switch?'}
          </button>
          {conn.connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              title="Disconnect"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {disconnecting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <LogOut className="w-3.5 h-3.5" />
              }
            </button>
          ) : (
            <a
              href={`/api/oauth/${conn.provider}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#15A4AE] text-white hover:bg-[#138d97] transition-colors"
            >
              Connect
            </a>
          )}
        </div>
      </div>

      {/* Why switch panel */}
      {expanded && (
        <div className="px-4 pb-3">
          <div className="bg-[#15A4AE]/5 dark:bg-[#15A4AE]/8 rounded-xl p-3 border border-[#15A4AE]/20">
            <p className="text-[11px] font-semibold text-[#15A4AE] mb-1.5">Why switch from {meta.name}?</p>
            <ul className="space-y-1">
              {meta.why.map((point, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                  <span className="text-[#15A4AE] shrink-0">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Import buttons — only when connected */}
      {conn.connected && (
        <div className="px-4 pb-3.5 flex items-center gap-2">
          <ImportButton provider={conn.provider} entityType="contacts" connected label="Contacts" icon={Users} />
          <ImportButton provider={conn.provider} entityType="deals"    connected label="Deals"    icon={Kanban} />
        </div>
      )}

      {/* Import history */}
      {history.length > 0 && (
        <div className="px-4 pb-3.5 border-t dark:border-white/8 pt-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Recent imports</p>
          <div className="space-y-1">
            {history.slice(0, 3).map(run => (
              <div key={run.id} className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  run.status === 'done'    ? 'bg-green-500' :
                  run.status === 'error'   ? 'bg-red-500' :
                  run.status === 'running' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
                }`} />
                <span className="capitalize">{run.entity_type}</span>
                <span>·</span>
                <span>{run.imported} imported</span>
                {run.skipped > 0 && <><span>·</span><span>{run.skipped} skipped</span></>}
                {run.error && <span className="text-red-400 truncate max-w-32">{run.error}</span>}
                <span className="ml-auto shrink-0 text-[10px]">
                  {new Date(run.started_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CrmMigrationSection({ connections, importHistory }: Props) {
  return (
    <>
      {connections.map(conn => (
        <ProviderCard
          key={conn.provider}
          conn={conn}
          history={importHistory.filter(r => r.provider === conn.provider)}
        />
      ))}
    </>
  )
}
