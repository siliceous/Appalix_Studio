'use client'

import { useState, useRef, useTransition, KeyboardEvent } from 'react'
import { saveProfile, scrapeBusinessProfile } from '@/app/actions/profile'
import { Loader2, LinkIcon, CheckCircle, X } from 'lucide-react'

const inputCls =
  'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

// ---------------------------------------------------------------------------
// Tag chip input
// ---------------------------------------------------------------------------

interface TagInputProps {
  name:        string          // hidden input name for form submission
  tags:        string[]
  onChange:    (tags: string[]) => void
  placeholder: string
}

function TagInput({ name, tags, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const value = raw.trim().replace(/,+$/, '').trim()
    if (!value) return
    // Split on comma in case user pastes "A, B, C"
    const parts = value.split(',').map(p => p.trim()).filter(Boolean)
    const next  = [...tags]
    for (const part of parts) {
      if (!next.includes(part)) next.push(part)
    }
    onChange(next)
    setDraft('')
  }

  function removeTag(i: number) {
    onChange(tags.filter((_, idx) => idx !== i))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      {/* Hidden input carries the comma-joined value for server action */}
      <input type="hidden" name={name} value={tags.join(', ')} />

      <div
        className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(i) }}
              className="hover:text-brand-900 -mr-0.5"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={tags.length === 0 ? placeholder : 'Add more…'}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400 py-0.5"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">Press Enter or comma to add · Backspace to remove last</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export default function OnboardingForm({ inviteEmail }: { inviteEmail: string }) {
  const [profileUrl,      setProfileUrl]      = useState('')
  const [syncEmail,       setSyncEmail]        = useState(inviteEmail)
  const [scrapeError,     setScrapeError]      = useState<string | null>(null)
  const [scraped,         setScraped]          = useState(false)
  const [isPending,       startTransition]     = useTransition()

  const [company,         setCompany]          = useState('')
  const [industry,        setIndustry]         = useState('')
  const [whatYouSell,     setWhatYouSell]      = useState<string[]>([])
  const [targetCustomers, setTargetCustomers]  = useState<string[]>([])

  async function handleAutoFill() {
    if (!profileUrl.trim()) return
    setScrapeError(null)
    setScraped(false)

    startTransition(async () => {
      const result = await scrapeBusinessProfile(profileUrl.trim())
      if ('error' in result) {
        setScrapeError(result.error)
        return
      }
      if (result.company)                         setCompany(result.company)
      if (result.industry)                        setIndustry(result.industry)
      if (result.whatYouSell?.length)             setWhatYouSell(result.whatYouSell)
      if (result.targetCustomers?.length)         setTargetCustomers(result.targetCustomers)
      setScraped(true)
    })
  }

  return (
    <form action={saveProfile} className="space-y-5">

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="first_name" className={labelCls}>
            First name <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name" name="first_name" type="text"
            required autoFocus placeholder="Jane"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="last_name" className={labelCls}>Last name</label>
          <input
            id="last_name" name="last_name" type="text"
            placeholder="Smith" className={inputCls}
          />
        </div>
      </div>

      {/* Auto-fill from URL */}
      <div>
        <label className={labelCls}>
          Auto-fill from your website or LinkedIn
          <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="url"
              value={profileUrl}
              onChange={e => { setProfileUrl(e.target.value); setScrapeError(null); setScraped(false) }}
              placeholder="https://yourcompany.com  or  https://linkedin.com/company/..."
              className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAutoFill() } }}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAutoFill()}
            disabled={isPending || !profileUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching…</>
              : scraped
                ? <><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Auto-filled</>
                : 'Auto-fill'}
          </button>
        </div>
        {scrapeError && (
          <p className="mt-1.5 text-xs text-red-600">{scrapeError}</p>
        )}
        {scraped && (
          <p className="mt-1.5 text-xs text-green-700">
            Fields pre-filled — remove anything incorrect or add what was missed.
          </p>
        )}
      </div>

      {/* Company */}
      <div>
        <label htmlFor="company" className={labelCls}>Company name</label>
        <input
          id="company" name="company" type="text"
          placeholder="Acme Inc."
          value={company} onChange={e => setCompany(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Industry */}
      <div>
        <label htmlFor="industry" className={labelCls}>Industry</label>
        <input
          id="industry" name="industry" type="text"
          placeholder="e.g. SaaS, E-commerce, Consulting, Real Estate…"
          value={industry} onChange={e => setIndustry(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* What you sell — tag chips */}
      <div>
        <label className={labelCls}>
          What do you sell or offer?
          {whatYouSell.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              {whatYouSell.length} item{whatYouSell.length !== 1 ? 's' : ''}
            </span>
          )}
        </label>
        <TagInput
          name="what_you_sell"
          tags={whatYouSell}
          onChange={setWhatYouSell}
          placeholder="e.g. CRM software, Web design, Email automation…"
        />
      </div>

      {/* Target customers — tag chips */}
      <div>
        <label className={labelCls}>
          Who are your ideal customers?
          {targetCustomers.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              {targetCustomers.length} segment{targetCustomers.length !== 1 ? 's' : ''}
            </span>
          )}
        </label>
        <TagInput
          name="target_customers"
          tags={targetCustomers}
          onChange={setTargetCustomers}
          placeholder="e.g. Small business owners, Marketing agencies…"
        />
      </div>

      {/* Email to sync */}
      <div>
        <label htmlFor="sync_email" className={labelCls}>
          Email to connect for inbox sync
        </label>
        <input
          id="sync_email" name="sync_email" type="email"
          value={syncEmail}
          onChange={e => setSyncEmail(e.target.value)}
          placeholder="you@gmail.com"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-gray-400">Pre-filled from your invite — change it if you use a different address.</p>
      </div>

      {/* Email provider */}
      <div>
        <label className={labelCls}>Which email do you use?</label>
        <div className="flex gap-3">
          {[
            { value: 'gmail',     label: '📧 Gmail' },
            { value: 'microsoft', label: '📬 Outlook / Microsoft' },
          ].map(({ value, label }) => (
            <label key={value} className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 transition-colors">
              <input type="radio" name="email_provider" value={value} className="accent-brand-600" defaultChecked={value === 'gmail'} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Continue →
      </button>
    </form>
  )
}
