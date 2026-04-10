'use client'

/**
 * MessageNotificationWatcher
 *
 * Listens via Supabase Realtime for new activity across:
 *   - Conversations (SMS, Messenger, Instagram, bot chats)
 *   - Form submissions (lead forms)
 *   - Tickets
 *   - Phone calls
 *
 * Fires a browser push notification + in-app toast for each new event.
 * Mounted once in the dashboard layout — workspace_id is passed from server.
 */

import { useEffect, useRef, useState } from 'react'
import { X, MessageSquare, FileText, Ticket, Phone, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Toast {
  id:       string
  title:    string
  body:     string
  icon:     React.ReactNode
  color:    string
  href:     string
}

const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  facebook_messenger: { label: 'Messenger',   color: '#1877F2' },
  instagram:          { label: 'Instagram',   color: '#E1306C' },
  sms:                { label: 'SMS',         color: '#88D400' },
  whatsapp:           { label: 'WhatsApp',    color: '#25D366' },
  telegram:           { label: 'Telegram',    color: '#229ED9' },
  web:                { label: 'Chat',        color: '#9737E8' },
}

function genId() { return Math.random().toString(36).slice(2) }

export function MessageNotificationWatcher({ workspaceId }: { workspaceId: string }) {
  const [toasts, setToasts]   = useState<Toast[]>([])
  const firedRef              = useRef<Set<string>>(new Set())
  const mountedAtRef          = useRef(Date.now())

  function addToast(toast: Omit<Toast, 'id'>) {
    const id = genId()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6_000)

    // Browser push notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(toast.title, { body: toast.body, icon: '/icon-192.png' })
    }
  }

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => {
    // Request permission once on mount
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const supabase = createClient()

    // ── 1. Conversations — new inbound message ──────────────────────────────
    const convChannel = supabase
      .channel(`notif-conversations-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'conversations',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (Date.now() - mountedAtRef.current < 3000) return // ignore seed on mount
          const row = payload.new as {
            id: string; platform: string; title?: string | null
            ai_entities?: { name?: string } | null
          }
          if (firedRef.current.has(row.id)) return
          firedRef.current.add(row.id)

          const meta    = PLATFORM_LABELS[row.platform] ?? { label: row.platform, color: '#15A4AE' }
          const name    = row.ai_entities?.name ?? row.title ?? 'New visitor'
          const isPhone = row.platform === 'phone'

          addToast({
            title: `New ${meta.label} message`,
            body:  `${name} started a conversation`,
            color: meta.color,
            href:  `/conversations/${row.id}`,
            icon:  isPhone
              ? <Phone className="w-4 h-4 text-white" />
              : row.platform === 'sms'
              ? <Smartphone className="w-4 h-4 text-white" />
              : <MessageSquare className="w-4 h-4 text-white" />,
          })
        },
      )
      .subscribe()

    // ── 2. Form submissions ─────────────────────────────────────────────────
    const formChannel = supabase
      .channel(`notif-forms-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'sage_form_submissions',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (Date.now() - mountedAtRef.current < 3000) return
          const row = payload.new as {
            id: string; source_platform?: string | null
            fields?: Record<string, string> | null
          }
          if (firedRef.current.has(row.id)) return
          firedRef.current.add(row.id)

          const name = row.fields?.name ?? row.fields?.full_name ?? row.fields?.email ?? 'Someone'
          const src  = row.source_platform ?? 'form'

          addToast({
            title: 'New Form Submission',
            body:  `${name} submitted via ${src}`,
            color: '#14B824',
            href:  '/dashboard/forms',
            icon:  <FileText className="w-4 h-4 text-white" />,
          })
        },
      )
      .subscribe()

    // ── 3. Tickets ──────────────────────────────────────────────────────────
    const ticketChannel = supabase
      .channel(`notif-tickets-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'tickets',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (Date.now() - mountedAtRef.current < 3000) return
          const row = payload.new as { id: string; title?: string | null }
          if (firedRef.current.has(row.id)) return
          firedRef.current.add(row.id)

          addToast({
            title: 'New Ticket',
            body:  row.title ?? 'A new support ticket was created',
            color: '#D9A400',
            href:  '/dashboard/tickets',
            icon:  <Ticket className="w-4 h-4 text-white" />,
          })
        },
      )
      .subscribe()

    // ── 4. Phone calls ──────────────────────────────────────────────────────
    const callChannel = supabase
      .channel(`notif-calls-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'calls',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (Date.now() - mountedAtRef.current < 3000) return
          const row = payload.new as { id: string; from_number?: string | null; contact_name?: string | null }
          if (firedRef.current.has(row.id)) return
          firedRef.current.add(row.id)

          const caller = row.contact_name ?? row.from_number ?? 'Unknown caller'
          addToast({
            title: 'Incoming Call',
            body:  `${caller} is calling`,
            color: '#EC4E96',
            href:  '/dashboard/calls',
            icon:  <Phone className="w-4 h-4 text-white" />,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(convChannel)
      supabase.removeChannel(formChannel)
      supabase.removeChannel(ticketChannel)
      supabase.removeChannel(callChannel)
    }
  }, [workspaceId])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <a
          key={t.id}
          href={t.href}
          className="pointer-events-auto flex items-start gap-3 w-80 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-3 animate-in slide-in-from-bottom-4 fade-in duration-300 hover:shadow-2xl transition-shadow"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: t.color }}
          >
            {t.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{t.title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-snug truncate">{t.body}</p>
          </div>
          <button
            onClick={e => { e.preventDefault(); dismiss(t.id) }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </a>
      ))}
    </div>
  )
}
