'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Clock, ChevronDown, ChevronUp, RefreshCw, MessageSquare,
} from 'lucide-react'

interface TranscriptTurn {
  role: string
  text: string
  ts:   string
}

interface CallRecord {
  id:               string
  from_e164:        string
  to_e164:          string
  direction:        string
  status:           string
  duration_seconds: number | null
  hangup_cause:     string | null
  conversation_id:  string | null
  transcript:       TranscriptTurn[]
  answered_at:      string | null
  ended_at:         string | null
  created_at:       string
  voice_agents:     { name: string } | null
}

function formatDuration(secs: number | null): string {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function StatusIcon({ direction, status }: { direction: string; status: string }) {
  if (status === 'ended' && direction === 'inbound')
    return <PhoneIncoming className="w-4 h-4 text-green-500" />
  if (status === 'ended' && direction === 'outbound')
    return <PhoneOutgoing className="w-4 h-4 text-blue-500" />
  if (status === 'rejected' || status === 'failed')
    return <PhoneMissed className="w-4 h-4 text-red-400" />
  return <Phone className="w-4 h-4 text-gray-400" />
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ended:     'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/25',
    answered:  'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25',
    initiated: 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10',
    rejected:  'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/25',
    failed:    'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/25',
  }
  return `text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${map[status] ?? map.initiated}`
}

export default function CallsPage() {
  const [calls,    setCalls]    = useState<CallRecord[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/phone/calls?limit=50')
      const data = await res.json() as { calls?: CallRecord[]; total?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setCalls(data.calls ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Call History</h1>
          <p className="text-sm text-gray-500">{total} call{total === 1 ? '' : 's'} total</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/15 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading calls…
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/10 p-16 text-center">
          <Phone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No calls yet</p>
          <p className="text-xs text-gray-400 mt-1">Inbound calls will appear here once your voice agent receives them.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
          {calls.map(call => {
            const isExpanded = expanded.has(call.id)
            const hasTx      = call.transcript?.length > 0
            return (
              <div key={call.id}>
                {/* Row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <StatusIcon direction={call.direction} status={call.status} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {call.from_e164}
                      </span>
                      <span className={statusBadge(call.status)}>{call.status}</span>
                      {call.direction === 'outbound' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 font-medium">
                          outbound
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {call.voice_agents?.name && (
                        <span>Agent: {call.voice_agents.name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(call.duration_seconds)}
                      </span>
                      <span>
                        {new Date(call.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {call.conversation_id && (
                      <Link
                        href={`/conversations?id=${call.conversation_id}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 border border-[#15A4AE]/30 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        View thread
                      </Link>
                    )}
                    {hasTx && (
                      <button
                        onClick={() => toggleExpand(call.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Transcript
                      </button>
                    )}
                  </div>
                </div>

                {/* Transcript panel */}
                {isExpanded && hasTx && (
                  <div className="px-5 pb-4 space-y-2 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-3 mb-2">Call transcript</p>
                    {call.transcript.map((turn, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 ${turn.role === 'user' ? '' : 'flex-row-reverse'}`}
                      >
                        <div
                          className={`max-w-[70%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                            turn.role === 'user'
                              ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                              : 'bg-[#15A4AE]/10 text-[#0d8a93] dark:text-[#15A4AE] rounded-tr-sm'
                          }`}
                        >
                          {turn.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
