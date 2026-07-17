'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Clock, ChevronDown, ChevronUp, MessageSquare,
} from 'lucide-react'

export interface CallRecord {
  id:               string
  from_e164:        string
  to_e164:          string
  direction:        string
  status:           string
  duration_seconds: number | null
  hangup_cause:     string | null
  conversation_id:  string | null
  transcript:       { role: string; text: string; ts: string }[]
  answered_at:      string | null
  ended_at:         string | null
  created_at:       string
  voice_agents:     { name: string } | null
}

function formatDuration(secs: number | null) {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function StatusIcon({ direction, status }: { direction: string; status: string }) {
  if (status === 'ended' && direction === 'inbound')  return <PhoneIncoming  className="w-4 h-4 text-green-500" />
  if (status === 'ended' && direction === 'outbound') return <PhoneOutgoing  className="w-4 h-4 text-blue-500" />
  if (status === 'rejected' || status === 'failed')   return <PhoneMissed    className="w-4 h-4 text-red-400" />
  return <Phone className="w-4 h-4 text-gray-400" />
}

const STATUS_CLASSES: Record<string, string> = {
  ended:     'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  answered:  'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  initiated: 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400',
  rejected:  'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  failed:    'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
}

export function CallListClient({ calls }: { calls: CallRecord[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (calls.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <Phone className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No calls yet</p>
        <p className="text-xs text-gray-400 mt-1">Calls on this number will appear here.</p>
      </div>
    )
  }

  return (
    <div className="divide-y dark:divide-white/5">
      {calls.map(call => {
        const isExpanded = expanded.has(call.id)
        const hasTx = (call.transcript?.length ?? 0) > 0
        const statusClass = STATUS_CLASSES[call.status] ?? STATUS_CLASSES.initiated
        return (
          <div key={call.id}>
            <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                <StatusIcon direction={call.direction} status={call.status} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {call.direction === 'inbound' ? call.from_e164 : call.to_e164}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>
                    {call.status}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    call.direction === 'inbound'
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {call.direction}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  {call.voice_agents?.name && <span>Agent: {call.voice_agents.name}</span>}
                  {call.hangup_cause && call.hangup_cause !== 'call_rejected' && (
                    <span className="text-gray-300 dark:text-gray-600">{call.hangup_cause}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatDuration(call.duration_seconds)}
                  </span>
                  <span>{new Date(call.created_at).toLocaleDateString('en-AU', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {call.conversation_id && (
                  <Link
                    href={`/conversations?id=${call.conversation_id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#15A4AE]/10 text-[#15A4AE] hover:bg-[#15A4AE]/20 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />Thread
                  </Link>
                )}
                {hasTx && (
                  <button
                    onClick={() => toggle(call.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Transcript
                  </button>
                )}
              </div>
            </div>

            {isExpanded && hasTx && (
              <div className="px-5 pb-4 pt-3 space-y-2 bg-gray-50 dark:bg-white/[0.02] border-t dark:border-white/5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Call transcript</p>
                {call.transcript.map((turn, i) => (
                  <div key={i} className={`flex gap-2 ${turn.role === 'user' ? '' : 'flex-row-reverse'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      turn.role === 'user'
                        ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                        : 'bg-[#15A4AE]/10 text-[#0d8a93] dark:text-[#15A4AE] rounded-tr-sm'
                    }`}>
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
  )
}
