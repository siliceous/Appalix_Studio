'use client'

import { useState, useRef } from 'react'

const COUNTRY_CODES = [
  { code: '+1',   flag: '🇺🇸', label: 'US' },
  { code: '+1',   flag: '🇨🇦', label: 'CA' },
  { code: '+44',  flag: '🇬🇧', label: 'GB' },
  { code: '+91',  flag: '🇮🇳', label: 'IN' },
  { code: '+61',  flag: '🇦🇺', label: 'AU' },
  { code: '+49',  flag: '🇩🇪', label: 'DE' },
  { code: '+33',  flag: '🇫🇷', label: 'FR' },
  { code: '+39',  flag: '🇮🇹', label: 'IT' },
  { code: '+34',  flag: '🇪🇸', label: 'ES' },
  { code: '+31',  flag: '🇳🇱', label: 'NL' },
  { code: '+55',  flag: '🇧🇷', label: 'BR' },
  { code: '+52',  flag: '🇲🇽', label: 'MX' },
  { code: '+971', flag: '🇦🇪', label: 'AE' },
  { code: '+65',  flag: '🇸🇬', label: 'SG' },
  { code: '+60',  flag: '🇲🇾', label: 'MY' },
  { code: '+27',  flag: '🇿🇦', label: 'ZA' },
  { code: '+81',  flag: '🇯🇵', label: 'JP' },
  { code: '+82',  flag: '🇰🇷', label: 'KR' },
  { code: '+86',  flag: '🇨🇳', label: 'CN' },
  { code: '+64',  flag: '🇳🇿', label: 'NZ' },
]

const EMPLOYEE_OPTIONS = ['Sole entrepreneur', '2–5', '5–10', '11–50', '50–200', '201–500', '500+']

const INPUT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#15A4AE]/60 focus:bg-white/8 transition-colors'
const LABEL = 'block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5'

export function BookDemoModal({ onClose }: { onClose: () => void }) {
  const [countryCode, setCountryCode] = useState('+1')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)
  const companyRef = useRef<HTMLInputElement>(null)
  const employeesRef = useRef<HTMLSelectElement>(null)
  const websiteRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/book-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameRef.current?.value,
          company: companyRef.current?.value,
          employees: employeesRef.current?.value,
          website: websiteRef.current?.value,
          phone: `${countryCode} ${phoneRef.current?.value ?? ''}`.trim(),
          description: descRef.current?.value,
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or email us at sales@appalix.ai')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-[#161616] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-5 border-b border-white/8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#15A4AE]/40 bg-[#15A4AE]/10 text-[#15A4AE] text-xs font-medium mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] animate-pulse" />
              Book a Demo
            </div>
            <h2 className="text-xl font-bold text-white">See Appalix in action</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in your details and we&apos;ll get back to you within 24 hours.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-sm shrink-0 ml-4"
          >✕</button>
        </div>

        {submitted ? (
          <div className="px-8 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#15A4AE]/10 border border-[#15A4AE]/30 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-[#15A4AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Request received!</h3>
            <p className="text-gray-400 text-sm">We&apos;ll reach out within 24 hours to schedule your demo.</p>
            <button onClick={onClose} className="mt-8 px-6 py-2.5 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-semibold rounded-xl transition-colors">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-8 py-6 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Full name */}
              <div>
                <label className={LABEL}>Full Name <span className="text-[#15A4AE]">*</span></label>
                <input ref={nameRef} required type="text" placeholder="Jane Smith" className={INPUT} />
              </div>

              {/* Company name */}
              <div>
                <label className={LABEL}>Company Name <span className="text-[#15A4AE]">*</span></label>
                <input ref={companyRef} required type="text" placeholder="Acme Corp" className={INPUT} />
              </div>

              {/* No. of employees */}
              <div>
                <label className={LABEL}>No. of Employees <span className="text-[#15A4AE]">*</span></label>
                <select ref={employeesRef} required className={INPUT + ' cursor-pointer'} defaultValue="">
                  <option value="" disabled className="bg-[#1a1a1a] text-gray-500">Select range</option>
                  {EMPLOYEE_OPTIONS.map(o => (
                    <option key={o} value={o} className="bg-[#1a1a1a] text-white">{o}</option>
                  ))}
                </select>
              </div>

              {/* Website URL */}
              <div>
                <label className={LABEL}>Website URL</label>
                <input ref={websiteRef} type="url" placeholder="https://yourcompany.com" className={INPUT} />
              </div>

              {/* Phone */}
              <div className="sm:col-span-2">
                <label className={LABEL}>Phone Number <span className="text-[#15A4AE]">*</span></label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#15A4AE]/60 transition-colors cursor-pointer shrink-0 w-28"
                  >
                    {COUNTRY_CODES.map((c, i) => (
                      <option key={i} value={c.code} className="bg-[#1a1a1a] text-white">
                        {c.flag} {c.code} {c.label}
                      </option>
                    ))}
                  </select>
                  <input ref={phoneRef} required type="tel" placeholder="555 012 3456" className={INPUT} />
                </div>
              </div>

              {/* What they do */}
              <div className="sm:col-span-2">
                <label className={LABEL}>What does your company do? <span className="text-[#15A4AE]">*</span></label>
                <textarea
                  ref={descRef}
                  required
                  rows={3}
                  placeholder="Write a note."
                  className={INPUT + ' resize-none'}
                />
              </div>

            </div>

            {error && (
              <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
            )}

            {/* Submit */}
            <div className="flex items-center gap-4 mt-7 pt-5 border-t border-white/8">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {loading ? 'Sending…' : 'Request A Demo →'}
              </button>
              <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Maybe later
              </button>
            </div>

            <p className="text-center text-[11px] text-gray-600 mt-3">
              No spam. No credit card. We&apos;ll only contact you about your demo request.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export function BookDemoButton({ label = 'Book a demo →', className }: { label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && <BookDemoModal onClose={() => setOpen(false)} />}
    </>
  )
}
