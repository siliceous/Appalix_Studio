'use client'

import { useEffect, useState, useTransition } from 'react'
import { Phone, RefreshCw, UserX, UserCheck, Search } from 'lucide-react'

interface OptedOutContact {
  id:               string
  name:             string
  phone:            string | null
  email:            string | null
  sms_opted_out_at: string | null
}

export function OptedOutContacts() {
  const [contacts,   setContacts]   = useState<OptedOutContact[]>([])
  const [filtered,   setFiltered]   = useState<OptedOutContact[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [isPending,  startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/sms/compliance')
      const data = await res.json() as { contacts?: OptedOutContact[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setContacts(data.contacts ?? [])
      setFiltered(data.contacts ?? [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q),
    ))
  }, [search, contacts])

  function optIn(contactId: string) {
    setTogglingId(contactId)
    startTransition(async () => {
      try {
        const res = await fetch('/api/sms/compliance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId, optOut: false }),
        })
        if (!res.ok) {
          const d = await res.json() as { error?: string }
          throw new Error(d.error ?? 'Failed')
        }
        setContacts(prev => prev.filter(c => c.id !== contactId))
      } catch (err) {
        setError(String(err))
      } finally {
        setTogglingId(null)
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]"
          />
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search ? 'No matching opted-out contacts.' : 'No opted-out contacts — all contacts are eligible for SMS.'}
          </p>
        </div>
      ) : (
        <div className="divide-y dark:divide-white/5">
          {filtered.map(contact => (
            <div key={contact.id} className="flex items-center gap-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <UserX className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{contact.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Opted out</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
                  {contact.sms_opted_out_at && (
                    <span>Since {new Date(contact.sms_opted_out_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => optIn(contact.id)}
                disabled={isPending || togglingId === contact.id}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#15A4AE]/10 hover:bg-[#15A4AE]/20 text-[#15A4AE] border border-[#15A4AE]/30 transition-colors disabled:opacity-50"
              >
                {togglingId === contact.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                Re-subscribe
              </button>
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">{filtered.length} opted-out contact{filtered.length === 1 ? '' : 's'}</p>
      )}
    </div>
  )
}
