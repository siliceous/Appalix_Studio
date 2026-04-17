'use client'

import { useState, useTransition } from 'react'
import { Calendar, CheckCircle2, AlertCircle, ExternalLink, Unlink, Loader2 } from 'lucide-react'
import { saveCalendarLink, saveJobTitle, disconnectGoogleCalendar } from '@/app/actions/user-profile'

interface Props {
  connected:    boolean
  googleEmail:  string | null
  calendarLink: string | null
  jobTitle:     string | null
}

export function GoogleCalendarSection({ connected, googleEmail, calendarLink, jobTitle }: Props) {
  const [linkValue,  setLinkValue]  = useState(calendarLink ?? '')
  const [titleValue, setTitleValue] = useState(jobTitle ?? '')
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  function showSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleSaveLink() {
    setError(null)
    startTransition(async () => {
      const res = await saveCalendarLink(linkValue)
      if (res.ok) showSaved()
      else setError(res.error ?? 'Failed to save')
    })
  }

  function handleSaveTitle() {
    setError(null)
    startTransition(async () => {
      const res = await saveJobTitle(titleValue)
      if (res.ok) showSaved()
      else setError(res.error ?? 'Failed to save')
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectGoogleCalendar()
    })
  }

  return (
    <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
      {/* Header */}
      <div className="px-6 py-5 border-b dark:border-white/10 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Google Calendar</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Check availability, auto-create meetings, and populate your booking link in outreach emails.
            </p>
          </div>
        </div>

        {connected ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </span>
        ) : (
          <a
            href="/api/oauth/google-calendar?return=/sage/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors flex-shrink-0"
          >
            <Calendar className="w-3.5 h-3.5" />
            Connect
          </a>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Status row */}
        {connected && googleEmail && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/40">
            <span className="text-xs text-green-700 dark:text-green-400">
              Connected as <span className="font-medium">{googleEmail}</span>
            </span>
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            >
              <Unlink className="w-3 h-3" />
              Disconnect
            </button>
          </div>
        )}

        {!connected && (
          <p className="text-xs text-gray-500 dark:text-gray-400 py-1">
            Connect Google Calendar above to enable free/busy checks and automatic calendar event creation when meetings are confirmed.
            You can still set your booking link and job title below without connecting.
          </p>
        )}

        {/* Job title */}
        <div>
          <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Job title <span className="text-xs text-gray-400 font-normal ml-1">{'{{sender_title}}'}</span>
          </label>
          <div className="flex gap-2">
            <input
              id="job_title"
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Account Executive"
              className="flex-1 px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveTitle}
              disabled={isPending}
              className="px-3 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Appears as <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{'{{sender_title}}'}</code> in outreach emails. Overrides the workspace default for your sends.
          </p>
        </div>

        {/* Booking link */}
        <div>
          <label htmlFor="calendar_link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Booking link <span className="text-xs text-gray-400 font-normal ml-1">{'{{calendar_link}}'}</span>
          </label>
          <div className="flex gap-2">
            <input
              id="calendar_link"
              type="url"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              placeholder="https://calendar.google.com/calendar/appointments/schedules/..."
              className="flex-1 px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveLink}
              disabled={isPending}
              className="px-3 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Paste your Google Calendar Appointment Schedules URL or any other booking link (Calendly, Cal.com, etc.).{' '}
            {connected && (
              <a
                href="https://calendar.google.com/calendar/u/0/r/settings/appointmentscheduling"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline inline-flex items-center gap-0.5"
              >
                Find it in Google Calendar <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
        </div>

        {/* Feedback */}
        {saved && (
          <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </p>
        )}
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
      </div>
    </section>
  )
}
