'use client'

import { useEffect, useRef, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { getUpcomingReminders, markReminderSent } from '@/app/actions/sage'

interface ToastReminder {
  id:    string
  title: string
  note:  string | null
}

export function ReminderWatcher() {
  const firedRef              = useRef<Set<string>>(new Set())
  const [toasts, setToasts]   = useState<ToastReminder[]>([])

  useEffect(() => {
    async function check() {
      try {
        const reminders = await getUpcomingReminders()
        const now = Date.now()

        for (const r of reminders) {
          if (firedRef.current.has(r.id)) continue
          const msUntil = new Date(r.due_at).getTime() - now
          if (msUntil <= 10 * 60 * 1000) {   // ≤ 10 minutes away
            firedRef.current.add(r.id)
            void markReminderSent(r.id)

            // Browser notification (works in background tab)
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(`Reminder: ${r.title}`, {
                body: r.note ?? 'You have a reminder set.',
                icon: '/icon-192.png',
              })
            }

            // In-app toast
            setToasts(prev => [...prev, { id: r.id, title: r.title, note: r.note }])
            // Auto-dismiss after 30 s
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== r.id))
            }, 30_000)
          }
        }
      } catch {
        // Network / auth errors should not crash the watcher
      }
    }

    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 w-80 bg-white dark:bg-[#2a2a2a] border border-amber-200 dark:border-amber-500/30 rounded-2xl shadow-xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Reminder</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 leading-snug">{t.title}</p>
            {t.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.note}</p>}
          </div>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
