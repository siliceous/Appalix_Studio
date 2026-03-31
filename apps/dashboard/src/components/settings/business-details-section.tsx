'use client'

import { useState, useTransition } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { updateBranding } from '@/app/actions/workspace-branding'

interface Props {
  initialData: {
    business_address: string | null
    business_phone:   string | null
    business_email:   string | null
    abn_vat:          string | null
  }
}

const FIELD = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-400'
const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

export function BusinessDetailsSection({ initialData }: Props) {
  const [address, setAddress] = useState(initialData.business_address ?? '')
  const [phone,   setPhone]   = useState(initialData.business_phone   ?? '')
  const [email,   setEmail]   = useState(initialData.business_email   ?? '')
  const [abnVat,  setAbnVat]  = useState(initialData.abn_vat          ?? '')
  const [saving,  startSave]  = useTransition()
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  async function save() {
    setError('')
    startSave(async () => {
      const res = await updateBranding({
        business_address: address || null,
        business_phone:   phone   || null,
        business_email:   email   || null,
        abn_vat:          abnVat  || null,
      })
      if (!res.ok) { setError(res.error ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
      <div className="px-6 py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Business Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Used to auto-fill your company info on quotes and invoices.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 text-white dark:text-gray-900 transition-colors"
          >
            {saving
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : saved
              ? <CheckCircle2 className="w-3 h-3" />
              : <Save className="w-3 h-3" />
            }
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className={LABEL}>Business Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={3}
              style={{ resize: 'none' }}
              placeholder="Street, City, State, Postcode, Country"
              className={FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Phone</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+61 400 000 000"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hello@yourcompany.com"
                className={FIELD}
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>ABN / VAT / Tax Number</label>
            <input
              value={abnVat}
              onChange={e => setAbnVat(e.target.value)}
              placeholder="e.g. ABN 12 345 678 901"
              className={FIELD}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
