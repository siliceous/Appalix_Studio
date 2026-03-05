'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  name:        string
  value:       string        // YYYY-MM-DD or ''
  onChange:    (val: string) => void
  placeholder?: string
  className?:  string
}

const DAYS    = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseLocal(dateStr: string): Date | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function DatePicker({ name, value, onChange, placeholder = 'Pick a date', className = '' }: DatePickerProps) {
  const selected   = parseLocal(value)
  const today      = new Date()
  today.setHours(0, 0, 0, 0)

  const [open,      setOpen]      = useState(false)
  const [viewYear,  setViewYear]  = useState((selected ?? today).getFullYear())
  const [viewMonth, setViewMonth] = useState((selected ?? today).getMonth())
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(date: Date) {
    onChange(toLocal(date))
    setOpen(false)
  }

  function clear() {
    onChange('')
    setOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))

  const displayValue = selected
    ? selected.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger */}
      <div
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 cursor-pointer hover:border-gray-300 dark:hover:border-white/20 focus-within:ring-2 focus-within:ring-brand-500 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={`flex-1 ${displayValue ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); clear() }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-4 w-72">

          {/* Date display + clear */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 min-w-[120px]">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{displayValue || '—'}</span>
            </div>
            {value && (
              <button
                type="button"
                onClick={clear}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick shortcuts */}
          <div className="flex gap-1.5 mb-3">
            {[
              { label: 'Today',     date: today },
              { label: 'Tomorrow',  date: addDays(today, 1) },
              { label: 'Next Week', date: addDays(today, 7) },
            ].map(({ label, date }) => (
              <button
                key={label}
                type="button"
                onClick={() => select(date)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-[#61c2ad]/10 hover:text-brand-700 dark:hover:text-[#61c2ad] hover:border-brand-300 dark:hover:border-[#61c2ad]/30 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />
              const isToday    = date.getTime() === today.getTime()
              const isSelected = selected && date.getTime() === selected.getTime()
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => select(date)}
                  className={`w-full aspect-square flex items-center justify-center text-xs rounded-full font-medium transition-colors ${
                    isSelected
                      ? 'bg-brand-600 dark:bg-[#61c2ad] text-white dark:text-[#1c1c1c] font-bold'
                      : isToday
                      ? 'bg-brand-50 dark:bg-[#61c2ad]/15 text-brand-700 dark:text-[#61c2ad] font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8'
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
