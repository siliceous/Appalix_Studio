/**
 * Shared date-range resolver for relative and absolute date phrases.
 * Used by Sage voice tool router and any future services.
 */

export interface DateRange {
  gte?: string  // ISO 8601
  lte?: string  // ISO 8601
}

/**
 * Converts a relative date phrase or absolute range string into a { gte, lte } range.
 * All timestamps are UTC ISO strings.
 *
 * Supports:
 *  - "today" / "yesterday"
 *  - "this week" / "last week"
 *  - "this month" / "last month"
 *  - "past N days/weeks/months" / "last N days/weeks/months"
 *  - "from YYYY-MM-DD to YYYY-MM-DD"
 *  - "YYYY-MM-DD" (single date → full day range)
 */
export function resolveRelativeDateRange(phrase: string, _timezone?: string): DateRange | null {
  if (!phrase) return null

  const lower = phrase.toLowerCase().trim()

  function localMidnight(date = new Date()): Date {
    const d = new Date(date)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  function endOfDay(midnight: Date): Date {
    return new Date(midnight.getTime() + 86_400_000 - 1)
  }

  const today    = localMidnight()
  const todayEnd = endOfDay(today)

  // ── Absolute range: "from 2026-01-01 to 2026-01-31" ────────────────────────
  const rangeMatch = lower.match(/(?:from\s+)?(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/)
  if (rangeMatch) {
    const start = localMidnight(new Date(`${rangeMatch[1]}T00:00:00Z`))
    const end   = endOfDay(localMidnight(new Date(`${rangeMatch[2]}T00:00:00Z`)))
    return { gte: start.toISOString(), lte: end.toISOString() }
  }

  // Single date: "2026-01-15"
  const singleDate = lower.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (singleDate) {
    const start = localMidnight(new Date(`${singleDate[1]}T00:00:00Z`))
    return { gte: start.toISOString(), lte: endOfDay(start).toISOString() }
  }

  // ── Named ranges ────────────────────────────────────────────────────────────
  if (lower === 'today') {
    return { gte: today.toISOString(), lte: todayEnd.toISOString() }
  }

  if (lower === 'yesterday') {
    const start = new Date(today.getTime() - 86_400_000)
    return { gte: start.toISOString(), lte: new Date(today.getTime() - 1).toISOString() }
  }

  if (lower === 'this week' || lower === 'week') {
    const dow   = today.getUTCDay() || 7  // Monday=1 … Sunday=7
    const start = new Date(today.getTime() - (dow - 1) * 86_400_000)
    return { gte: start.toISOString(), lte: todayEnd.toISOString() }
  }

  if (lower === 'last week' || lower === 'previous week') {
    const dow        = today.getUTCDay() || 7
    const thisMonday = new Date(today.getTime() - (dow - 1) * 86_400_000)
    const lastMonday = new Date(thisMonday.getTime() - 7 * 86_400_000)
    const lastSunday = new Date(thisMonday.getTime() - 1)
    return { gte: lastMonday.toISOString(), lte: lastSunday.toISOString() }
  }

  if (lower === 'this month') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    return { gte: start.toISOString(), lte: todayEnd.toISOString() }
  }

  if (lower === 'last month' || lower === 'previous month') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    const end   = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0, 23, 59, 59, 999))
    return { gte: start.toISOString(), lte: end.toISOString() }
  }

  // ── "past/last N days/weeks/months" ────────────────────────────────────────
  const nMatch = lower.match(/(?:past|last)\s+(\d+)\s+(day|days|week|weeks|month|months)/)
  if (nMatch) {
    const n    = parseInt(nMatch[1])
    const unit = nMatch[2]

    if (unit.startsWith('day')) {
      const start = new Date(today.getTime() - n * 86_400_000)
      return { gte: start.toISOString(), lte: todayEnd.toISOString() }
    }
    if (unit.startsWith('week')) {
      const start = new Date(today.getTime() - n * 7 * 86_400_000)
      return { gte: start.toISOString(), lte: todayEnd.toISOString() }
    }
    if (unit.startsWith('month')) {
      const start = new Date(today)
      start.setUTCMonth(start.getUTCMonth() - n)
      return { gte: start.toISOString(), lte: todayEnd.toISOString() }
    }
  }

  return null
}
