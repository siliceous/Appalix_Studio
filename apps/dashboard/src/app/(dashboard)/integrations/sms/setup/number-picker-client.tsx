'use client'

import { useState, useCallback } from 'react'
import { Phone, Plus, Trash2, Copy, Check, Search, RefreshCw, MessageSquare } from 'lucide-react'
import type { ProvisionedNumber } from './page'

const COUNTRIES = [
  { code: 'AU', label: 'Australia (+61)' },
  { code: 'US', label: 'United States (+1)' },
  { code: 'GB', label: 'United Kingdom (+44)' },
  { code: 'CA', label: 'Canada (+1)' },
  { code: 'NZ', label: 'New Zealand (+64)' },
]

interface AvailableNumber {
  phone_number: string
  region_information?: Array<{ region_name: string; region_type: string }>
  cost_information?: { monthly_cost: string; currency: string }
  features?: Array<{ name: string }>
}

interface MessagingProfile {
  id:      string
  name:    string
  enabled: boolean
}

interface Props {
  existingNumbers: ProvisionedNumber[]
  isAdmin:         boolean
  workspaceId:     string
}

export function NumberPickerClient({ existingNumbers, isAdmin }: Props) {
  const [numbers, setNumbers]               = useState<ProvisionedNumber[]>(existingNumbers)
  const [country, setCountry]               = useState('AU')
  const [areaCode, setAreaCode]             = useState('')
  const [available, setAvailable]           = useState<AvailableNumber[]>([])
  const [profiles, setProfiles]             = useState<MessagingProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [searching, setSearching]           = useState(false)
  const [provisioning, setProvisioning]     = useState<string | null>(null)
  const [releasing, setReleasing]           = useState<string | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [copied, setCopied]                 = useState<string | null>(null)
  const [showSearch, setShowSearch]         = useState(false)

  const webhookUrl = 'https://appalix-api.onrender.com/webhooks/telnyx/messaging'

  const copyToClipboard = useCallback((value: string, key: string) => {
    void navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const loadProfiles = useCallback(async () => {
    const res  = await fetch('/api/telnyx/messaging-profiles')
    const data = await res.json() as { profiles?: MessagingProfile[]; error?: string }
    if (data.profiles) setProfiles(data.profiles)
  }, [])

  const searchNumbers = useCallback(async () => {
    setSearching(true)
    setError(null)
    try {
      if (profiles.length === 0) await loadProfiles()
      const params = new URLSearchParams({ country, limit: '15' })
      if (areaCode.trim()) params.set('area_code', areaCode.trim())
      const res  = await fetch(`/api/telnyx/numbers/available?${params}`)
      const data = await res.json() as { numbers?: AvailableNumber[]; error?: string }
      if (data.error) { setError(data.error); return }
      setAvailable(data.numbers ?? [])
      setShowSearch(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setSearching(false)
    }
  }, [country, areaCode, profiles.length, loadProfiles])

  const provision = useCallback(async (phoneNumber: string) => {
    setProvisioning(phoneNumber)
    setError(null)
    try {
      const res  = await fetch('/api/telnyx/numbers/provision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          phoneNumber,
          country,
          messagingProfileId: selectedProfile || undefined,
        }),
      })
      const data = await res.json() as { ok?: boolean; id?: string; error?: string }
      if (data.error) { setError(data.error); return }
      // Add to the list locally
      setNumbers(prev => [{
        id:                   data.id!,
        e164:                 phoneNumber,
        country_code:         country,
        capabilities:         { sms: true, voice: false, mms: false },
        messaging_profile_id: selectedProfile || null,
        purchased_at:         new Date().toISOString(),
      }, ...prev])
      setAvailable(prev => prev.filter(n => n.phone_number !== phoneNumber))
    } catch (err) {
      setError(String(err))
    } finally {
      setProvisioning(null)
    }
  }, [country, selectedProfile])

  const releaseNumber = useCallback(async (id: string) => {
    if (!confirm('Release this number? It will be returned to Telnyx and cannot be recovered.')) return
    setReleasing(id)
    setError(null)
    try {
      const res  = await fetch(`/api/telnyx/numbers/${id}`, { method: 'DELETE' })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.error) { setError(data.error); return }
      setNumbers(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      setError(String(err))
    } finally {
      setReleasing(null)
    }
  }, [])

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Webhook URL */}
      <section className="bg-[#15A4AE]/5 border border-[#15A4AE]/30 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Telnyx configuration</h2>
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Set this as your messaging profile webhook URL in the Telnyx portal:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
              {webhookUrl}
            </code>
            <button
              onClick={() => copyToClipboard(webhookUrl, 'webhook')}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/15 transition-colors text-gray-600 dark:text-gray-300"
            >
              {copied === 'webhook' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied === 'webhook' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Telnyx Portal → Messaging → Messaging Profiles → your profile → Webhooks → Webhook API version: <strong>2</strong>
          </p>
        </div>
      </section>

      {/* Provisioned numbers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your numbers</h2>
          {isAdmin && (
            <button
              onClick={() => { setShowSearch(!showSearch); if (!showSearch) void searchNumbers() }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add number
            </button>
          )}
        </div>

        {numbers.length === 0 ? (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 p-8 text-center">
            <Phone className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No phone numbers provisioned yet.</p>
            {isAdmin && (
              <button
                onClick={() => { setShowSearch(true); void searchNumbers() }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Provision your first number
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 divide-y divide-[#15A4AE]/20">
            {numbers.map((num) => (
              <div key={num.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-[#15A4AE]/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#15A4AE]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{num.e164}</span>
                    {num.country_code && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-medium">
                        {num.country_code}
                      </span>
                    )}
                    {num.capabilities.sms && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/25 font-medium">
                        SMS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {num.messaging_profile_id ? `Profile: ${num.messaging_profile_id.slice(0, 8)}…` : 'No messaging profile'}
                    {num.purchased_at && ` · Added ${new Date(num.purchased_at).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(num.e164, num.id)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors"
                >
                  {copied === num.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => void releaseNumber(num.id)}
                    disabled={releasing === num.id}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {releasing === num.id
                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Number search panel */}
      {showSearch && isAdmin && (
        <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-[#15A4AE]/30 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Search available numbers</h2>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1">Area code (optional)</label>
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="e.g. 02, 212"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {profiles.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">Messaging profile</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">No profile</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={() => void searchNumbers()}
                disabled={searching}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {searching
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>

          {available.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-white/10 border border-gray-100 dark:border-white/10 rounded-lg overflow-hidden">
              {available.map((num) => {
                const region = num.region_information?.find(r => r.region_type === 'city_name' || r.region_type === 'rate_center')
                const cost   = num.cost_information
                return (
                  <div key={num.phone_number} className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-white/5">
                    <div className="flex-1">
                      <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{num.phone_number}</span>
                      {region && (
                        <span className="ml-2 text-xs text-gray-400">{region.region_name}</span>
                      )}
                    </div>
                    {cost && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {cost.currency} {parseFloat(cost.monthly_cost).toFixed(2)}/mo
                      </span>
                    )}
                    <button
                      onClick={() => void provision(num.phone_number)}
                      disabled={provisioning === num.phone_number}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-60"
                    >
                      {provisioning === num.phone_number
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Plus className="w-3 h-3" />}
                      {provisioning === num.phone_number ? 'Buying…' : 'Buy'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {!searching && available.length === 0 && showSearch && (
            <p className="text-sm text-gray-400 text-center py-4">
              No numbers found. Try a different country or area code.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
