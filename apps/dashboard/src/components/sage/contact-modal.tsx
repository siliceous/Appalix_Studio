'use client'

import { useState, useTransition } from 'react'

// Countries that use "Postcode"
const POSTCODE_COUNTRIES = new Set([
  'uk', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland',
  'australia', 'new zealand', 'south africa', 'canada',
])
// Countries that use "Pincode" / "PIN"
const PINCODE_COUNTRIES = new Set([
  'india', 'in', 'bangladesh', 'sri lanka', 'nepal', 'pakistan',
])

function postalCodeLabel(country: string): string {
  const c = country.toLowerCase().trim()
  if (PINCODE_COUNTRIES.has(c))  return 'Pincode'
  if (POSTCODE_COUNTRIES.has(c)) return 'Postcode'
  return 'Zip / Postal Code'
}
import { X, Loader2 } from 'lucide-react'
import { createContact, updateContact } from '@/app/actions/sage'
import type { SageContact } from '@/lib/types'

interface ContactModalProps {
  contact?:  SageContact
  onClose:   () => void
  onSaved?:  (contact: SageContact) => void
}

const inputCls = 'w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#61c2ad]'
const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'
const sectionCls = 'text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 mt-1'

export function ContactModal({ contact, onClose, onSaved }: ContactModalProps) {
  const [pending, startTransition] = useTransition()
  const [country, setCountry] = useState(contact?.country ?? '')
  const isEdit = !!contact

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const saved = isEdit
        ? await updateContact(contact.id, formData)
        : await createContact(formData)
      if (saved && onSaved) onSaved(saved)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Edit Contact' : 'New Contact'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto">

          {/* ── Basic info ──────────────────────────────── */}
          <div>
            <p className={sectionCls}>Basic Info</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                <input name="name" type="text" required placeholder="Jane Smith" defaultValue={contact?.name ?? ''} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Title</label>
                  <input name="title" type="text" placeholder="e.g. CEO, Marketing Lead" defaultValue={contact?.title ?? ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contact Type</label>
                  <select name="contact_type" defaultValue={contact?.contact_type ?? 'potential_customer'} className={inputCls}>
                    <option value="potential_customer">Potential Customer</option>
                    <option value="active_customer">Active Customer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Value <span className="text-gray-400 font-normal">(estimated)</span></label>
                <input name="value" type="number" min="0" step="0.01" placeholder="0.00" defaultValue={contact?.value ?? ''} className={inputCls} />
              </div>
            </div>
          </div>

          {/* ── Contact details ──────────────────────────── */}
          <div>
            <p className={sectionCls}>Contact Details</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input name="email" type="email" placeholder="jane@example.com" defaultValue={contact?.email ?? ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input name="phone" type="tel" placeholder="+1 555 000 0000" defaultValue={contact?.phone ?? ''} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input name="website_url" type="url" placeholder="https://acme.com" defaultValue={contact?.website_url ?? ''} className={inputCls} />
              </div>
            </div>
          </div>

          {/* ── Company ──────────────────────────────────── */}
          <div>
            <p className={sectionCls}>Company</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input name="company_name" type="text" placeholder="Acme Corp" defaultValue={contact?.company_name ?? ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Business Goal</label>
                  <input name="business_goal" type="text" placeholder="e.g. Automate support" defaultValue={contact?.business_goal ?? ''} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Address ──────────────────────────────────── */}
          <div>
            <p className={sectionCls}>Address</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Street</label>
                <input name="street" type="text" placeholder="123 Main St" defaultValue={contact?.street ?? ''} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>City</label>
                  <input name="city" type="text" placeholder="New York" defaultValue={contact?.city ?? ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input name="state" type="text" placeholder="NY" defaultValue={contact?.state ?? ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{postalCodeLabel(country)}</label>
                  <input name="zip" type="text" placeholder="10001" defaultValue={contact?.zip ?? ''} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input name="country" type="text" placeholder="United States" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* ── Settings ─────────────────────────────────── */}
          <div>
            <p className={sectionCls}>Settings</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Source</label>
                  <select name="source" defaultValue={contact?.source ?? 'manual'} className={inputCls}>
                    <option value="manual">Manual</option>
                    <option value="bot">Bot</option>
                    <option value="email">Email</option>
                    <option value="form">Form</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Visibility</label>
                  <select name="visibility" defaultValue={contact?.visibility ?? 'everyone'} className={inputCls}>
                    <option value="everyone">Everyone</option>
                    <option value="team">Individuals (My Team)</option>
                    <option value="only_me">Only Me</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tags <span className="text-gray-400 font-normal">(comma-sep)</span></label>
                  <input name="tags" type="text" placeholder="hot-lead, enterprise" defaultValue={contact?.tags?.join(', ') ?? ''} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea name="notes" rows={3} placeholder="Any additional context…" defaultValue={contact?.notes ?? ''} className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
