'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, ExternalLink,
  Clock, Users, Loader2, CalendarDays, Info,
} from 'lucide-react'
import Link from 'next/link'
import { createCalendarEvent } from '@/app/actions/calendar'

// ── Types ─────────────────────────────────────────────────────────────────────

type CalEvent = {
  id:           string
  summary?:     string
  description?: string
  start:        { dateTime?: string; date?: string }
  end:          { dateTime?: string; date?: string }
  htmlLink?:    string
  attendees?:   { email: string; displayName?: string; responseStatus?: string }[]
  status?:      string
  colorId?:     string
}

type View = 'month' | 'week'

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Google Calendar colour IDs → Tailwind bg classes
const GCAL_COLORS: Record<string, string> = {
  '1':  'bg-[#a4bdfc] dark:bg-[#7986cb]',   // Lavender
  '2':  'bg-[#33b679] dark:bg-[#33b679]',   // Sage
  '3':  'bg-[#8e24aa] dark:bg-[#8e24aa]',   // Grape
  '4':  'bg-[#e67c73] dark:bg-[#e67c73]',   // Flamingo
  '5':  'bg-[#f6c026] dark:bg-[#f6c026]',   // Banana
  '6':  'bg-[#f5511d] dark:bg-[#f5511d]',   // Tangerine
  '7':  'bg-[#039be5] dark:bg-[#039be5]',   // Peacock
  '8':  'bg-[#616161] dark:bg-[#616161]',   // Graphite
  '9':  'bg-[#3f51b5] dark:bg-[#3f51b5]',   // Blueberry
  '10': 'bg-[#0b8043] dark:bg-[#0b8043]',   // Basil
  '11': 'bg-[#d50000] dark:bg-[#d50000]',   // Tomato
}

function evtBg(ev: CalEvent): string {
  return ev.colorId ? (GCAL_COLORS[ev.colorId] ?? 'bg-brand-500') : 'bg-brand-500'
}

// ── Event helpers ─────────────────────────────────────────────────────────────

function evtStart(ev: CalEvent): Date { return new Date(ev.start.dateTime ?? ev.start.date ?? '') }
function evtEnd(ev: CalEvent):   Date { return new Date(ev.end.dateTime   ?? ev.end.date   ?? '') }
function isAllDay(ev: CalEvent):   boolean { return !ev.start.dateTime }

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()    === b.getMonth()
    && a.getDate()     === b.getDate()
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
}
function fmtDateFull(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
function fmtDateShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function pad2(n: number): string { return String(n).padStart(2, '0') }

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  isConnected: boolean
  googleEmail: string
}

export function CalendarClient({ isConnected, googleEmail }: Props) {
  const [view, setView]           = useState<View>('month')
  const [current, setCurrent]     = useState(() => new Date())
  const [events, setEvents]       = useState<CalEvent[]>([])
  const [loading, setLoading]     = useState(false)
  const [selectedEv, setSelectedEv] = useState<CalEvent | null>(null)
  const [newModal, setNewModal]   = useState<{ date: Date; hour?: number } | null>(null)
  const weekScrollRef             = useRef<HTMLDivElement>(null)
  const today                     = new Date()

  // ── Fetch events ──────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    if (!isConnected) return
    setLoading(true)
    try {
      let start: Date, end: Date
      if (view === 'month') {
        start = new Date(current.getFullYear(), current.getMonth(), 1)
        end   = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999)
      } else {
        const dow = current.getDay()
        start = new Date(current); start.setDate(current.getDate() - dow); start.setHours(0, 0, 0, 0)
        end   = new Date(start);   end.setDate(start.getDate() + 6);       end.setHours(23, 59, 59, 999)
      }
      const res = await fetch(
        `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`,
      )
      if (res.ok) {
        const data = await res.json() as { events: CalEvent[] }
        setEvents(data.events ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [isConnected, view, current])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Scroll week view to 8 AM on first render of that view
  useEffect(() => {
    if (view === 'week' && weekScrollRef.current) {
      const HOUR_H = 64
      setTimeout(() => weekScrollRef.current?.scrollTo({ top: 8 * HOUR_H, behavior: 'smooth' }), 80)
    }
  }, [view])

  // ── Navigation ──────────────────────────────────────────────────────────

  function prev() {
    if (view === 'month') setCurrent(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))
    else setCurrent(c => { const n = new Date(c); n.setDate(n.getDate() - 7); return n })
  }
  function next() {
    if (view === 'month') setCurrent(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))
    else setCurrent(c => { const n = new Date(c); n.setDate(n.getDate() + 7); return n })
  }

  // ── Month helpers ────────────────────────────────────────────────────────

  function buildMonthGrid(): (Date | null)[] {
    const y = current.getFullYear(), m = current.getMonth()
    const firstDow  = new Date(y, m, 1).getDay()
    const daysInMo  = new Date(y, m + 1, 0).getDate()
    const grid: (Date | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMo; d++) grid.push(new Date(y, m, d))
    return grid
  }

  function eventsOnDay(d: Date): CalEvent[] {
    const ds = new Date(d); ds.setHours(0, 0, 0, 0)
    const de = new Date(d); de.setHours(23, 59, 59, 999)
    return events
      .filter(ev => evtStart(ev) <= de && evtEnd(ev) >= ds)
      .sort((a, b) => evtStart(a).getTime() - evtStart(b).getTime())
  }

  // ── Week helpers ─────────────────────────────────────────────────────────

  function buildWeekDays(): Date[] {
    const dow = current.getDay()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(current)
      d.setDate(current.getDate() - dow + i)
      d.setHours(0, 0, 0, 0)
      return d
    })
  }

  function timedEventsOnDay(d: Date): CalEvent[] {
    return events.filter(ev => !isAllDay(ev) && sameDay(evtStart(ev), d))
  }

  function allDayEventsOnDay(d: Date): CalEvent[] {
    return events.filter(ev => {
      if (!isAllDay(ev)) return false
      const s = evtStart(ev); s.setHours(0, 0, 0, 0)
      const e = new Date(evtEnd(ev)); e.setDate(e.getDate() - 1)
      return d >= s && d <= e
    })
  }

  function evtTopHeight(ev: CalEvent, HOUR_H: number) {
    const s   = evtStart(ev)
    const e   = evtEnd(ev)
    const sMins = s.getHours() * 60 + s.getMinutes()
    const eMins = e.getHours() * 60 + e.getMinutes()
    return {
      top:    (sMins / 60) * HOUR_H,
      height: Math.max(((eMins - sMins) / 60) * HOUR_H, HOUR_H * 0.5),
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const weekDays    = view === 'week' ? buildWeekDays() : []
  const HOUR_H      = 64
  const HOURS       = Array.from({ length: 24 }, (_, i) => i)

  const headerTitle = view === 'month'
    ? `${MONTHS[current.getMonth()]} ${current.getFullYear()}`
    : weekDays.length
      ? `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()}–${weekDays[6].getDate()}, ${weekDays[0].getFullYear()}`
      : ''

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-600/10 dark:bg-brand-400/10 flex items-center justify-center">
          <CalendarDays className="w-10 h-10 text-brand-500" />
        </div>
        <div className="max-w-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Google Calendar
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Connect your Google Calendar so Sage can view your availability, create events, and
            schedule meetings — directly from chat or email.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/api/oauth/google-calendar?return=/sage/calendar"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Connect Google Calendar
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Or connect from{' '}
            <Link href="/integrations" className="text-brand-500 hover:underline">Integrations</Link>
          </p>
        </div>
      </div>
    )
  }

  const grid = view === 'month' ? buildMonthGrid() : []

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/8 bg-white dark:bg-[#232323] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white w-48">
            {headerTitle}
          </h2>
          {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
        </div>

        <div className="flex items-center gap-2">
          {googleEmail && (
            <span className="hidden md:block text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">
              {googleEmail}
            </span>
          )}
          {/* View toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-gray-100 dark:bg-white/8">
            {(['month', 'week'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setNewModal({ date: new Date() })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New event
          </button>
        </div>
      </div>

      {/* ── Month view ───────────────────────────────────────────────────── */}
      {view === 'month' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto bg-white dark:bg-[#1c1c1c]">
          {/* Day name headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/8 bg-white dark:bg-[#232323] shrink-0">
            {DAYS_SHORT.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            className="grid grid-cols-7 flex-1"
            style={{ gridAutoRows: 'minmax(110px, 1fr)' }}
          >
            {grid.map((d, i) => {
              if (!d) {
                return (
                  <div
                    key={`blank-${i}`}
                    className="border-r border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.01]"
                  />
                )
              }

              const dayEvents  = eventsOnDay(d)
              const isTo       = sameDay(d, today)
              const isOtherMo  = d.getMonth() !== current.getMonth()

              return (
                <div
                  key={d.toISOString()}
                  onClick={() => setNewModal({ date: d })}
                  className={`border-r border-b border-gray-100 dark:border-white/5 p-1.5 cursor-pointer group transition-colors hover:bg-brand-50/40 dark:hover:bg-brand-900/10 ${
                    isOtherMo ? 'bg-gray-50/40 dark:bg-white/[0.01]' : ''
                  }`}
                >
                  <div
                    className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[13px] font-medium mb-1 transition-colors ${
                      isTo
                        ? 'bg-brand-600 text-white'
                        : isOtherMo
                          ? 'text-gray-300 dark:text-gray-600'
                          : 'text-gray-700 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-white/10'
                    }`}
                  >
                    {d.getDate()}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <button
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); setSelectedEv(ev) }}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-snug truncate text-white hover:opacity-80 transition-opacity ${evtBg(ev)}`}
                      >
                        {!isAllDay(ev) && (
                          <span className="opacity-80 mr-1">{fmtTime(evtStart(ev))}</span>
                        )}
                        {ev.summary ?? '(No title)'}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedEv(dayEvents[3]) }}
                        className="text-[11px] text-brand-500 dark:text-brand-400 hover:underline pl-1.5"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Week view ────────────────────────────────────────────────────── */}
      {view === 'week' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1c1c1c]">

          {/* Day header row */}
          <div className="flex shrink-0 border-b border-gray-100 dark:border-white/8 bg-white dark:bg-[#232323]">
            <div className="w-14 shrink-0 border-r border-gray-100 dark:border-white/8" />
            {weekDays.map(d => {
              const isTo = sameDay(d, today)
              return (
                <div
                  key={d.toISOString()}
                  className="flex-1 border-l border-gray-100 dark:border-white/8 py-2 px-1 text-center min-w-0"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {DAYS_SHORT[d.getDay()]}
                  </p>
                  <div
                    className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-semibold mt-0.5 ${
                      isTo ? 'bg-brand-600 text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  {/* All-day events */}
                  <div className="mt-1 space-y-0.5 px-0.5">
                    {allDayEventsOnDay(d).map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEv(ev)}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] text-white truncate leading-tight ${evtBg(ev)}`}
                      >
                        {ev.summary ?? '(No title)'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="flex-1 overflow-y-auto" ref={weekScrollRef}>
            <div className="flex" style={{ minHeight: `${24 * HOUR_H}px` }}>

              {/* Hour labels */}
              <div className="w-14 shrink-0 relative border-r border-gray-100 dark:border-white/8" style={{ minHeight: `${24 * HOUR_H}px` }}>
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ top: h * HOUR_H, height: HOUR_H }}
                    className="absolute inset-x-0 flex items-start justify-end pr-2 pt-1"
                  >
                    {h > 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 -translate-y-2 select-none">
                        {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map(d => (
                <div
                  key={d.toISOString()}
                  className="flex-1 border-l border-gray-100 dark:border-white/8 relative"
                  style={{ minHeight: `${24 * HOUR_H}px` }}
                >
                  {/* Hour slot rows */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{ top: h * HOUR_H, height: HOUR_H }}
                      className="absolute inset-x-0 border-b border-gray-50 dark:border-white/[0.04] cursor-pointer hover:bg-brand-50/30 dark:hover:bg-brand-900/5 transition-colors"
                      onClick={() => {
                        const nd = new Date(d); nd.setHours(h, 0, 0, 0)
                        setNewModal({ date: nd, hour: h })
                      }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {sameDay(d, today) && (() => {
                    const now  = new Date()
                    const topPx = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H
                    return (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                        style={{ top: topPx }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    )
                  })()}

                  {/* Timed events */}
                  {timedEventsOnDay(d).map(ev => {
                    const { top, height } = evtTopHeight(ev, HOUR_H)
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEv(ev)}
                        style={{ top, height, left: 2, right: 2, position: 'absolute' }}
                        className={`rounded-md px-1.5 py-0.5 text-[11px] text-left overflow-hidden z-10 hover:opacity-80 transition-opacity text-white ${evtBg(ev)}`}
                      >
                        <div className="font-semibold leading-tight truncate">
                          {ev.summary ?? '(No title)'}
                        </div>
                        {height > 32 && (
                          <div className="opacity-80 text-[10px]">{fmtTime(evtStart(ev))}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Event detail overlay ──────────────────────────────────────────── */}
      {selectedEv && (
        <EventDetail ev={selectedEv} onClose={() => setSelectedEv(null)} />
      )}

      {/* ── New event modal ───────────────────────────────────────────────── */}
      {newModal && (
        <NewEventModal
          defaultDate={newModal.date}
          defaultHour={newModal.hour}
          onClose={() => setNewModal(null)}
          onCreated={() => { setNewModal(null); fetchEvents() }}
        />
      )}
    </div>
  )
}

// ── Event detail ──────────────────────────────────────────────────────────────

function EventDetail({ ev, onClose }: { ev: CalEvent; onClose: () => void }) {
  const start = evtStart(ev)
  const end   = evtEnd(ev)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Colour band */}
        <div className={`h-1.5 w-full ${evtBg(ev)}`} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">
              {ev.summary ?? '(No title)'}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5 text-sm">
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                {isAllDay(ev)
                  ? <><span className="font-medium text-gray-900 dark:text-white">All day</span><span className="text-gray-400 dark:text-gray-500"> · {fmtDateShort(start)}</span></>
                  : (
                    <>
                      <p className="text-gray-700 dark:text-gray-200">{fmtDateFull(start)}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{fmtTime(start)} – {fmtTime(end)}</p>
                    </>
                  )
                }
              </div>
            </div>

            {/* Attendees */}
            {ev.attendees && ev.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {ev.attendees.map(a => (
                    <span
                      key={a.email}
                      title={a.email}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${
                        a.responseStatus === 'accepted'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                          : a.responseStatus === 'declined'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-white/8 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {a.displayName ?? a.email}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {ev.description && (
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {ev.description}
                </p>
              </div>
            )}
          </div>

          {ev.htmlLink && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/8">
              <a
                href={ev.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-500 dark:text-brand-400 hover:underline font-medium"
              >
                Open in Google Calendar
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── New event modal ───────────────────────────────────────────────────────────

function NewEventModal({
  defaultDate,
  defaultHour,
  onClose,
  onCreated,
}: {
  defaultDate: Date
  defaultHour?: number
  onClose:     () => void
  onCreated:   () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const startH = defaultHour ?? 9
  const endH   = Math.min(startH + 1, 23)
  const dateStr = `${defaultDate.getFullYear()}-${pad2(defaultDate.getMonth() + 1)}-${pad2(defaultDate.getDate())}`

  const [title,       setTitle]       = useState('')
  const [date,        setDate]        = useState(dateStr)
  const [startTime,   setStartTime]   = useState(`${pad2(startH)}:00`)
  const [endTime,     setEndTime]     = useState(`${pad2(endH)}:00`)
  const [attendees,   setAttendees]   = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Event title is required'); return }

    const start = new Date(`${date}T${startTime}:00`)
    const end   = new Date(`${date}T${endTime}:00`)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) { setError('Invalid date or time'); return }
    if (end <= start) { setError('End time must be after start time'); return }

    const emailList = attendees
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(s => s.includes('@'))

    startTransition(async () => {
      const result = await createCalendarEvent({
        title:          title.trim(),
        description:    description.trim() || undefined,
        start:          start.toISOString(),
        end:            end.toISOString(),
        attendeeEmails: emailList,
      })
      if (result.ok) {
        onCreated()
      } else {
        setError(result.error ?? 'Failed to create event')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="relative bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New Event</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <input
            type="text"
            placeholder="Event title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            required
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {/* Date + times on one row */}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="col-span-3 sm:col-span-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
              className="col-span-3 sm:col-span-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
              className="col-span-3 sm:col-span-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Invite attendees
            </label>
            <textarea
              placeholder="email@example.com, another@example.com"
              value={attendees}
              onChange={e => setAttendees(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Attendees receive a Google Calendar invite automatically.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Description <span className="font-normal opacity-60">(optional)</span>
            </label>
            <textarea
              placeholder="Agenda, meeting link, notes…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-white/8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-60"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create Event
          </button>
        </div>
      </form>
    </div>
  )
}
