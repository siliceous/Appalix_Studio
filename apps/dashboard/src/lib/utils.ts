import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Platform } from './types'

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a UTC ISO string as a readable local date */
export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

/** Format a UTC ISO string as date + time (e.g. "Feb 23, 2026, 11:42 AM") */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Format a UTC ISO string as relative time (e.g. "3 minutes ago") */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Format token count with K suffix */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Format cost in USD */
export function formatCost(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(usd)
}

/** Platform display metadata */
export const PLATFORM_META: Record<Platform, { label: string; color: string }> = {
  slack:               { label: 'Slack',             color: 'bg-purple-100 text-purple-700' },
  google_chat:         { label: 'Google Chat',        color: 'bg-blue-100 text-blue-700' },
  facebook_messenger:  { label: 'FB Messenger',       color: 'bg-indigo-100 text-indigo-700' },
  whatsapp:            { label: 'WhatsApp',           color: 'bg-green-100 text-green-700' },
  wordpress:           { label: 'WordPress',          color: 'bg-sky-100 text-sky-700' },
  web_widget:          { label: 'Web Widget',         color: 'bg-orange-100 text-orange-700' },
  custom_api:          { label: 'Custom API',         color: 'bg-gray-100 text-gray-700' },
}

/** Subscription status badge colours */
export const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  trialing:  'bg-blue-100 text-blue-700',
  past_due:  'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  paused:    'bg-gray-100 text-gray-500',
  inactive:  'bg-gray-100 text-gray-500',
}
