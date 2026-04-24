'use client'

import { useEffect, useState, useTransition } from 'react'
import { ShieldCheck, Phone, RefreshCw, UserX, UserCheck, Search } from 'lucide-react'

interface OptedOutContact {
  id:               string
  name:             string
  phone:            string | null
  email:            string | null
  sms_opted_out_at: string | null
}

export default function CompliancePage() {
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
    setFiltered(
      contacts.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
      ),
    )
  }, [search, contacts])

  function optIn(contactId: string) {
    setTogglingId(contactId)
    startTransition(async () => {
      try {
        const res = await fetch('/api/sms/compliance', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ contactId, optOut: false }),
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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#15A4AE]/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-[#15A4AE]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">SMS Compliance</h1>
          <p className="text-sm text-gray-500">Contacts who have opted out of SMS messages (STOP keyword).</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/15 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Compliance info card */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-medium mb-1">Carrier-mandated opt-out keywords</p>
        <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
          Contacts who reply <strong>STOP, STOPALL, UNSUBSCRIBE, CANCEL, END,</strong> or <strong>QUIT</strong> are
          automatically opted out and cannot receive further SMS. An automatic reply is sent confirming opt-out.
          Reply <strong>START</strong> or <strong>YES</strong> resubscribes them. Contacts can also be manually
          opted back in below (e.g. after a phone call request).
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/10 p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {search ? 'No matching opted-out contacts' : 'No opted-out contacts'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search ? 'Try a different search term.' : 'All your contacts are eligible to receive SMS.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
          {filtered.map(contact => (
            <div key={contact.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{contact.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/25 font-medium whitespace-nowrap">
                    Opted out
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </span>
                  )}
                  {contact.sms_opted_out_at && (
                    <span>
                      Opted out {new Date(contact.sms_opted_out_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => optIn(contact.id)}
                disabled={isPending || togglingId === contact.id}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#15A4AE]/10 hover:bg-[#15A4AE]/20 text-[#15A4AE] border border-[#15A4AE]/30 transition-colors disabled:opacity-50"
              >
                {togglingId === contact.id
                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                  : <UserCheck className="w-3 h-3" />
                }
                Re-subscribe
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">
          {filtered.length} opted-out contact{filtered.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
