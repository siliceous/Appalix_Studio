'use client'

import { useState, useTransition } from 'react'
import { Trophy, XCircle, X } from 'lucide-react'
import { updateDealStatus } from '@/app/actions/sage'

interface WonLostModalProps {
  dealId:    string
  dealTitle: string
  mode:      'won' | 'lost'
  onClose:   () => void
  onConfirm: () => void
}

const LOST_REASONS = [
  'Price',
  'Competitor',
  'Timing',
  'No Budget',
  'No Decision',
  'Other',
]

export function WonLostModal({ dealId, dealTitle, mode, onClose, onConfirm }: WonLostModalProps) {
  const [reason,  setReason]  = useState(LOST_REASONS[0])
  const [note,    setNote]    = useState('')
  const [wonDate, setWonDate] = useState(new Date().toISOString().slice(0, 10))
  const [error,   setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        if (mode === 'won') {
          await updateDealStatus(dealId, 'won', undefined, new Date(wonDate).toISOString())
        } else {
          await updateDealStatus(dealId, 'lost', reason, undefined, new Date().toISOString())
        }
        onConfirm()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update deal')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className={`flex items-center gap-3 mb-5 ${mode === 'won' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          {mode === 'won' ? <Trophy className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'won' ? 'Mark as Won' : 'Mark as Lost'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[280px]">{dealTitle}</p>
          </div>
        </div>

        <div className="space-y-4">
          {mode === 'won' ? (
            <>
              <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Congratulations! Mark this deal as won.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Close Date</label>
                <input
                  type="date"
                  value={wonDate}
                  onChange={e => setWonDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reason for Loss <span className="text-red-400">*</span></label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  {LOST_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Any additional context…"
                  className="w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className={`flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60 ${
                mode === 'won'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isPending ? 'Saving…' : mode === 'won' ? 'Mark Won ✓' : 'Mark Lost'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
