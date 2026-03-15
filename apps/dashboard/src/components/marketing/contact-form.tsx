'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { submitContactForm } from '@/app/actions/contact'

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Switzerland', 'Spain', 'Italy',
  'Portugal', 'Poland', 'Czech Republic', 'Austria', 'Belgium', 'Ireland',
  'Singapore', 'India', 'Japan', 'South Korea', 'Australia', 'New Zealand',
  'Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile',
  'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'UAE', 'Saudi Arabia', 'Israel',
  'Other',
]

export function ContactForm() {
  const [state, action, isPending] = useActionState(submitContactForm, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="space-y-5">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Full name <span className="text-brand-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="Jane Smith"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-600/50 focus:bg-white/[0.07] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Work email <span className="text-brand-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="jane@company.com"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-600/50 focus:bg-white/[0.07] transition-colors"
          />
        </div>
      </div>

      {/* Phone + Country */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone number</label>
          <input
            type="tel"
            name="phone"
            placeholder="+1 (555) 000-0000"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-600/50 focus:bg-white/[0.07] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Country</label>
          <select
            name="country"
            className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-brand-600/50 transition-colors"
          >
            <option value="">Select your country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inquiry type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Inquiry type</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'sales',    label: '💼 Sales',    desc: 'Plans & pricing' },
            { value: 'general',  label: '💬 General',  desc: 'General questions' },
            { value: 'security', label: '🔒 Security', desc: 'Security & privacy' },
          ].map((opt) => (
            <label key={opt.value} className="cursor-pointer">
              <input type="radio" name="inquiry_type" value={opt.value} className="peer sr-only"
                defaultChecked={opt.value === 'general'} />
              <div className="p-3 rounded-xl border border-white/10 text-center peer-checked:border-brand-600/60 peer-checked:bg-brand-600/10 hover:border-white/20 transition-colors">
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Message <span className="text-brand-500">*</span>
        </label>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Tell us how we can help you…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-600/50 focus:bg-white/[0.07] transition-colors resize-none"
        />
      </div>

      {/* Submit */}
      {state?.success ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#15A4AE]/10 border border-[#15A4AE]/25">
          <span className="text-[#15A4AE] text-xl">✓</span>
          <p className="text-sm text-[#15A4AE] font-medium">{state.message}</p>
        </div>
      ) : (
        <>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors text-sm"
          >
            {isPending ? 'Sending…' : 'Send message'}
          </button>
          {state && !state.success && (
            <p className="text-red-400 text-sm text-center">{state.message}</p>
          )}
        </>
      )}

      <p className="text-xs text-gray-600 text-center">
        We respond to all inquiries within one business day.
      </p>
    </form>
  )
}
