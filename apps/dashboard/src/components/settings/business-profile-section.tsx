'use client'

import { useState, useRef, useTransition, KeyboardEvent } from 'react'
import { saveBusinessProfile, scrapeBusinessProfile } from '@/app/actions/profile'
import { Loader2, LinkIcon, CheckCircle, X, Pencil } from 'lucide-react'

const inputCls =
  'w-full px-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

// ---------------------------------------------------------------------------
// Tag chip input (same logic as onboarding form)
// ---------------------------------------------------------------------------

interface TagInputProps {
  name:        string
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
      <input type="hidden" name={name} value={tags.join(', ')} />
      <div
        className="flex flex-wrap gap-1.5 p-2 border dark:border-white/10 rounded-lg min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-brand-500 bg-white dark:bg-[#1e1e1e]"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700 text-xs font-medium rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(i) }}
              className="hover:text-brand-900 dark:hover:text-brand-100 -mr-0.5"
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
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400 dark:text-gray-100 py-0.5"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Press Enter or comma to add · Backspace to remove last
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

interface Props {
  workspaceId:  string
  initialData: {
    company:         string
    industry:        string
    whatYouSell:     string[]
    targetCustomers: string[]
  }
}

export function BusinessProfileSection({ workspaceId: _workspaceId, initialData }: Props) {
  const [editing,         setEditing]         = useState(false)
  const [saving,          startSave]          = useTransition()
  const [scraping,        startScrape]        = useTransition()
  const [saved,           setSaved]           = useState(false)
  const [saveError,       setSaveError]       = useState<string | null>(null)
  const [profileUrl,      setProfileUrl]      = useState('')
  const [scrapeError,     setScrapeError]     = useState<string | null>(null)
  const [scraped,         setScraped]         = useState(false)

  const [company,         setCompany]         = useState(initialData.company)
  const [industry,        setIndustry]        = useState(initialData.industry)
  const [whatYouSell,     setWhatYouSell]     = useState<string[]>(initialData.whatYouSell)
  const [targetCustomers, setTargetCustomers] = useState<string[]>(initialData.targetCustomers)

  function handleAutoFill() {
    if (!profileUrl.trim()) return
    setScrapeError(null)
    setScraped(false)
    startScrape(async () => {
      const result = await scrapeBusinessProfile(profileUrl.trim())
      if ('error' in result) { setScrapeError(result.error); return }
      if (result.company)                 setCompany(result.company)
      if (result.industry)                setIndustry(result.industry)
      if (result.whatYouSell?.length)     setWhatYouSell(result.whatYouSell)
      if (result.targetCustomers?.length) setTargetCustomers(result.targetCustomers)
      setScraped(true)
    })
  }

  function handleSubmit(formData: FormData) {
    setSaveError(null)
    setSaved(false)
    startSave(async () => {
      const result = await saveBusinessProfile(formData)
      if (result.error) { setSaveError(result.error); return }
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const hasData = company || industry || whatYouSell.length > 0 || targetCustomers.length > 0

  return (
    <section className="bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10">
      <div className="px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            Business Profile
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sage AI uses this to prioritise emails and leads correctly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(e => !e); setSaved(false); setSaveError(null) }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Read-only summary */}
      {!editing && (
        <div className="px-6 pb-5 space-y-3 border-t dark:border-white/10 pt-4">
          {!hasData ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No business profile set yet. Click Edit to add your details.
            </p>
          ) : (
            <>
              {company  && <Row label="Company"  value={company} />}
              {industry && <Row label="Industry" value={industry} />}
              {whatYouSell.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Products / Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {whatYouSell.map(t => <Tag key={t} label={t} />)}
                  </div>
                </div>
              )}
              {targetCustomers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Target Customers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {targetCustomers.map(t => <Tag key={t} label={t} />)}
                  </div>
                </div>
              )}
            </>
          )}
          {saved && (
            <p className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5" /> Saved successfully
            </p>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <form action={handleSubmit} className="px-6 pb-6 space-y-4 border-t dark:border-white/10 pt-4">

          {/* URL auto-fill */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Auto-fill from website or LinkedIn
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="url"
                  value={profileUrl}
                  onChange={e => { setProfileUrl(e.target.value); setScrapeError(null); setScraped(false) }}
                  placeholder="https://yourcompany.com"
                  className="w-full pl-8 pr-3 py-2 border dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAutoFill() } }}
                />
              </div>
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={scraping || !profileUrl.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 disabled:opacity-50 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {scraping
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching…</>
                  : scraped
                    ? <><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Done</>
                    : 'Auto-fill'}
              </button>
            </div>
            {scrapeError && <p className="mt-1 text-xs text-red-600">{scrapeError}</p>}
            {scraped && <p className="mt-1 text-xs text-green-700">Fields updated — review below before saving.</p>}
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Company name</label>
            <input
              name="company" type="text" placeholder="Acme Inc."
              value={company} onChange={e => setCompany(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Industry</label>
            <input
              name="industry" type="text"
              placeholder="e.g. SaaS, E-commerce, Consulting…"
              value={industry} onChange={e => setIndustry(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Products / Services */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Products / Services
              {whatYouSell.length > 0 && (
                <span className="ml-2 font-normal text-gray-400">{whatYouSell.length} item{whatYouSell.length !== 1 ? 's' : ''}</span>
              )}
            </label>
            <TagInput
              name="what_you_sell"
              tags={whatYouSell}
              onChange={setWhatYouSell}
              placeholder="e.g. CRM software, Email automation…"
            />
          </div>

          {/* Target Customers */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Target Customers
              {targetCustomers.length > 0 && (
                <span className="ml-2 font-normal text-gray-400">{targetCustomers.length} segment{targetCustomers.length !== 1 ? 's' : ''}</span>
              )}
            </label>
            <TagInput
              name="target_customers"
              tags={targetCustomers}
              onChange={setTargetCustomers}
              placeholder="e.g. Small business owners, Marketing agencies…"
            />
          </div>

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 border dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100 text-right">{value}</span>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700 text-xs font-medium rounded-full">
      {label}
    </span>
  )
}
