'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, MessageSquare, FileText, Ticket, Phone, Smartphone, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NotifItem {
  id:        string
  title:     string
  body:      string
  href:      string
  color:     string
  icon:      React.ReactNode
  ts:        number
  read:      boolean
}

const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  facebook_messenger: { label: 'Messenger',  color: '#1877F2' },
  instagram:          { label: 'Instagram',  color: '#E1306C' },
  sms:                { label: 'SMS',        color: '#88D400' },
  whatsapp:           { label: 'WhatsApp',   color: '#25D366' },
  telegram:           { label: 'Telegram',   color: '#229ED9' },
  web:                { label: 'Chat',       color: '#9737E8' },
  phone:              { label: 'Call',       color: '#EC4E96' },
}

function timeAgo(ms: number) {
  const diff = Math.floor((Date.now() - ms) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function genId() { return Math.random().toString(36).slice(2) }

export function NotificationBell({ workspaceId, dropUp = false, dark = false }: { workspaceId: string; dropUp?: boolean; dark?: boolean }) {
  const [notifs, setNotifs]   = useState<NotifItem[]>([])
  const [open, setOpen]       = useState(false)
  const firedRef              = useRef<Set<string>>(new Set())
  const mountedAtRef          = useRef(Date.now())
  const panelRef              = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.read).length

  function addNotif(item: Omit<NotifItem, 'id' | 'read' | 'ts'>) {
    setNotifs(prev => [{ ...item, id: genId(), read: false, ts: Date.now() }, ...prev].slice(0, 50))
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(item.title, { body: item.body, icon: '/icon-192.png' })
    }
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  function dismiss(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const supabase = createClient()

    const convChannel = supabase
      .channel(`bell-conv-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'conversations',
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        if (Date.now() - mountedAtRef.current < 3000) return
        const row = payload.new as { id: string; platform: string; title?: string | null; ai_entities?: { name?: string } | null }
        if (firedRef.current.has(row.id)) return
        firedRef.current.add(row.id)
        const meta = PLATFORM_LABELS[row.platform] ?? { label: row.platform, color: '#15A4AE' }
        const name = row.ai_entities?.name ?? row.title ?? 'New visitor'
        addNotif({
          title: `New ${meta.label} message`,
          body:  `${name} started a conversation`,
          color: meta.color,
          href:  `/conversations/${row.id}`,
          icon:  row.platform === 'sms' ? <Smartphone className="w-3.5 h-3.5 text-white" />
               : row.platform === 'phone' ? <Phone className="w-3.5 h-3.5 text-white" />
               : <MessageSquare className="w-3.5 h-3.5 text-white" />,
        })
      })
      .subscribe()

    const formChannel = supabase
      .channel(`bell-forms-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'sage_form_submissions',
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        if (Date.now() - mountedAtRef.current < 3000) return
        const row = payload.new as { id: string; source_platform?: string | null; fields?: Record<string, string> | null }
        if (firedRef.current.has(row.id)) return
        firedRef.current.add(row.id)
        const name = row.fields?.name ?? row.fields?.full_name ?? row.fields?.email ?? 'Someone'
        addNotif({
          title: 'New Form Submission',
          body:  `${name} submitted via ${row.source_platform ?? 'form'}`,
          color: '#14B824',
          href:  '/dashboard/forms',
          icon:  <FileText className="w-3.5 h-3.5 text-white" />,
        })
      })
      .subscribe()

    const ticketChannel = supabase
      .channel(`bell-tickets-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'tickets',
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        if (Date.now() - mountedAtRef.current < 3000) return
        const row = payload.new as { id: string; title?: string | null }
        if (firedRef.current.has(row.id)) return
        firedRef.current.add(row.id)
        addNotif({
          title: 'New Ticket',
          body:  row.title ?? 'A new support ticket was created',
          color: '#D9A400',
          href:  '/dashboard/tickets',
          icon:  <Ticket className="w-3.5 h-3.5 text-white" />,
        })
      })
      .subscribe()

    const callChannel = supabase
      .channel(`bell-calls-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'calls',
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        if (Date.now() - mountedAtRef.current < 3000) return
        const row = payload.new as { id: string; from_number?: string | null; contact_name?: string | null }
        if (firedRef.current.has(row.id)) return
        firedRef.current.add(row.id)
        addNotif({
          title: 'Incoming Call',
          body:  `${row.contact_name ?? row.from_number ?? 'Unknown caller'} is calling`,
          color: '#EC4E96',
          href:  '/dashboard/calls',
          icon:  <Phone className="w-3.5 h-3.5 text-white" />,
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(convChannel)
      supabase.removeChannel(formChannel)
      supabase.removeChannel(ticketChannel)
      supabase.removeChannel(callChannel)
    }
  }, [workspaceId])

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead() }}
        title="Notifications"
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-100 dark:hover:bg-white/8'}`}
      >
        <Bell className="w-5 h-5 text-[#FBBF24] drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#15A4AE]">
            <span className="absolute inset-0 rounded-full bg-[#15A4AE] animate-ping opacity-70" />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute ${dropUp ? 'bottom-11 left-0' : 'top-full right-0 mt-2'} w-80 bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-[300] overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/8">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
            {notifs.length > 0 && (
              <button
                onClick={() => setNotifs([])}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No notifications
              </div>
            ) : (
              notifs.map(n => (
                <a
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 last:border-0 group"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: n.color }}
                  >
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-snug">{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.ts)}</p>
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); dismiss(n.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-all shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
