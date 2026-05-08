'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { submitForm } from '@/app/actions/form-submissions'
import type { Form, FormBlock, FormStep, FormTheme } from '@/features/forms/types'

// ── Targeting / display-trigger gate ─────────────────────────────────────────

type GateResult =
  | 'loading'           // client not yet hydrated
  | 'visible'           // all checks passed, show form
  | 'scheduled_closed'  // outside scheduling window
  | 'wrong_device'      // device not in targeting.devices
  | 'page_blocked'      // URL doesn't match page rules
  | 'source_blocked'    // referrer/UTM source excluded
  | 'utm_blocked'       // required UTM params absent
  | 'waiting_trigger'   // waiting for delay/scroll/exit-intent

function useFormGating(form: Form): GateResult {
  const [result, setResult] = useState<GateResult>('loading')

  useEffect(() => {
    const behaviour  = form.behaviour  ?? {}
    const targeting  = behaviour.targeting  ?? {}
    const display    = behaviour.display    ?? { trigger: 'immediate' as const }
    const scheduling = behaviour.scheduling ?? { mode: 'always' as const, startAt: null, endAt: null }

    // 1. Scheduling
    if (scheduling.mode === 'scheduled') {
      const now = Date.now()
      if (scheduling.startAt && new Date(scheduling.startAt).getTime() > now) { setResult('scheduled_closed'); return }
      if (scheduling.endAt   && new Date(scheduling.endAt).getTime()   < now) { setResult('scheduled_closed'); return }
    }

    // 2. Device
    const devices = targeting.devices ?? ['desktop', 'mobile', 'tablet']
    if (devices.length > 0) {
      const w = window.innerWidth
      const ok = (w < 640 && devices.includes('mobile'))
               || (w >= 640 && w < 1024 && devices.includes('tablet'))
               || (w >= 1024 && devices.includes('desktop'))
      if (!ok) { setResult('wrong_device'); return }
    }

    // 3. Page URL rules
    const pageRules  = targeting.pageRules ?? []
    if (pageRules.length > 0) {
      const href = window.location.href
      function urlMatches(rule: { match?: string; url?: string }) {
        if (!rule.url) return false
        if (rule.match === 'is')          return href === rule.url || window.location.pathname === rule.url
        if (rule.match === 'starts_with') return href.startsWith(rule.url) || window.location.pathname.startsWith(rule.url)
        return href.includes(rule.url) // 'contains' (default)
      }
      const appearsOn = pageRules.filter(r => r.type === 'appears_on')
      const notOn     = pageRules.filter(r => r.type === 'not_on')
      if (appearsOn.length > 0 && !appearsOn.some(urlMatches)) { setResult('page_blocked'); return }
      if (notOn.some(urlMatches))                               { setResult('page_blocked'); return }
    }

    // 4. Source targeting
    const sources    = targeting.sources    ?? []
    const sourceMode = targeting.sourceMode ?? 'hide'
    if (sources.length > 0) {
      const ref    = document.referrer
      const sp     = new URLSearchParams(window.location.search)
      const uSrc   = sp.get('utm_source') ?? ''
      const uMed   = sp.get('utm_medium') ?? ''
      const match  = (src: string) => {
        switch (src) {
          case 'direct':     return !ref
          case 'appalix':    return ['email','sms'].includes(uMed)
          case 'organic':    return !!ref && /google\.|bing\.|yahoo\./.test(ref)
          case 'google_ads': return uSrc === 'google' && uMed === 'cpc'
          case 'facebook':   return ref.includes('facebook.com') || uSrc === 'facebook'
          case 'instagram':  return ref.includes('instagram.com') || uSrc === 'instagram'
          case 'linkedin':   return ref.includes('linkedin.com')  || uSrc === 'linkedin'
          case 'tiktok':     return ref.includes('tiktok.com')    || uSrc === 'tiktok'
          default:           return false
        }
      }
      const anyMatch = sources.some(match)
      const blocked  = sourceMode === 'hide' ? anyMatch : !anyMatch
      if (blocked) { setResult('source_blocked'); return }
    }

    // 5. UTM param matching — all specified params must be present in URL
    const utmParams = targeting.utmParams ?? []
    const utmSource = targeting.utmSource ?? ''
    if (utmParams.length > 0 || utmSource) {
      const sp = new URLSearchParams(window.location.search)
      if (utmSource && sp.get('utm_source') !== utmSource)            { setResult('utm_blocked'); return }
      if (!utmParams.every(p => sp.get(p.key) === p.value))           { setResult('utm_blocked'); return }
    }

    // 6. Display trigger — landing_page always shows immediately
    const trigger = display.trigger ?? 'immediate'
    if (trigger === 'immediate' || form.type === 'landing_page') {
      setResult('visible'); return
    }

    if (trigger === 'delay') {
      setResult('waiting_trigger')
      const t = setTimeout(() => setResult('visible'), (display.delaySeconds ?? 3) * 1000)
      return () => clearTimeout(t)
    }

    if (trigger === 'scroll') {
      setResult('waiting_trigger')
      const threshold = display.scrollPercentage ?? 50
      const onScroll = () => {
        const pct = (window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * 100
        if (pct >= threshold) { setResult('visible'); window.removeEventListener('scroll', onScroll) }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }

    if (trigger === 'exit_intent') {
      setResult('waiting_trigger')
      const onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) { setResult('visible'); document.removeEventListener('mouseleave', onLeave) }
      }
      document.addEventListener('mouseleave', onLeave)
      return () => document.removeEventListener('mouseleave', onLeave)
    }

    if (trigger === 'click') {
      setResult('waiting_trigger')
      const selector = display.selector
      if (selector) {
        const el = document.querySelector(selector)
        const onClick = () => setResult('visible')
        el?.addEventListener('click', onClick)
        return () => el?.removeEventListener('click', onClick)
      }
    }

    setResult('visible')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id])

  return result
}

// ── Block renderer (interactive) ──────────────────────────────────────────────

function BlockInput({
  block,
  theme,
  value,
  error,
  onChange,
}: {
  block:    FormBlock
  theme:    FormTheme
  value:    string
  error:    boolean
  onChange: (v: string) => void
}) {
  const primary        = theme.colors?.primary    ?? '#6366f1'
  const textCol        = theme.colors?.text       ?? '#111827'
  const fRadius        = theme.fields?.radius     ?? '6px'
  const fBorder        = error ? '#ef4444' : (theme.fields?.borderColor ?? '#d1d5db')
  const bRadius        = theme.buttons?.radius    ?? '8px'
  const fontFam        = theme.typography?.fontFamily        ?? 'Inter'
  const headingFontFam = theme.typography?.headingFontFamily ?? fontFam
  const bodySize       = theme.typography?.bodySize          ?? '14px'
  const headSize       = theme.typography?.headingSize       ?? '22px'

  const inputCls = 'w-full px-3 py-2.5 border text-sm focus:outline-none focus:ring-2 transition-shadow'

  if (block.type === 'text') {
    return (
      <div
        className={
          block.props.variant === 'heading' ? 'font-bold leading-tight' :
          block.props.variant === 'body'    ? 'leading-relaxed' :
          block.props.variant === 'legal'   ? 'text-[11px] opacity-60' :
          'leading-relaxed'
        }
        style={{
          color:      textCol,
          fontFamily: block.props.variant === 'heading' ? `"${headingFontFam}", sans-serif` : `"${fontFam}", sans-serif`,
          fontSize:   block.props.variant === 'heading' ? headSize : bodySize,
        }}
      >
        {block.props.content}
      </div>
    )
  }

  if (block.type === 'divider') {
    return <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
  }

  if (block.type === 'image') {
    if (!block.props.src) return null
    return <img src={block.props.src} alt={block.props.alt ?? ''} className="w-full rounded-lg" />
  }

  if (block.type === 'button') {
    return null // handled separately as submit/next trigger
  }

  const inputId = `field-${block.id}`
  const labelEl = block.props.label && (
    <label
      htmlFor={inputId}
      className="block text-xs font-medium mb-1"
      style={{ color: textCol, fontFamily: `"${fontFam}", sans-serif` }}
    >
      {block.props.label}
      {block.props.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  if (block.type === 'email' || block.type === 'phone' || block.type === 'text_input') {
    return (
      <div>
        {labelEl}
        <input
          id={inputId}
          type={block.type === 'email' ? 'email' : block.type === 'phone' ? 'tel' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={block.props.placeholder ?? ''}
          className={inputCls}
          style={{ borderRadius: fRadius, borderColor: fBorder, fontFamily: `"${fontFam}", sans-serif`, fontSize: bodySize }}
        />
        {error && <p className="text-xs text-red-500 mt-1">This field is required</p>}
      </div>
    )
  }

  if (block.type === 'textarea') {
    return (
      <div>
        {labelEl}
        <textarea
          id={inputId}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={block.props.placeholder ?? ''}
          rows={4}
          className={`${inputCls} resize-none`}
          style={{ borderRadius: fRadius, borderColor: fBorder, fontFamily: `"${fontFam}", sans-serif`, fontSize: bodySize }}
        />
        {error && <p className="text-xs text-red-500 mt-1">This field is required</p>}
      </div>
    )
  }

  if (block.type === 'checkbox') {
    return (
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={e => onChange(e.target.checked ? 'true' : 'false')}
          className="mt-0.5 w-4 h-4 rounded shrink-0"
          style={{ accentColor: primary }}
        />
        <span className="text-sm" style={{ color: textCol, fontFamily: `"${fontFam}", sans-serif` }}>
          {block.props.label}
          {block.props.required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </label>
    )
  }

  if (block.type === 'dropdown') {
    const options = (block.props.options as string[] | undefined) ?? []
    return (
      <div>
        {labelEl}
        <select
          id={inputId}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          style={{ borderRadius: fRadius, borderColor: fBorder, fontFamily: `"${fontFam}", sans-serif`, fontSize: bodySize }}
        >
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {error && <p className="text-xs text-red-500 mt-1">This field is required</p>}
      </div>
    )
  }

  if (block.type === 'radio') {
    const options = (block.props.options as string[] | undefined) ?? []
    return (
      <div>
        {labelEl}
        <div className="space-y-2 mt-1">
          {options.map(o => (
            <label key={o} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={block.id}
                value={o}
                checked={value === o}
                onChange={() => onChange(o)}
                style={{ accentColor: primary }}
              />
              <span className="text-sm" style={{ color: textCol, fontFamily: `"${fontFam}", sans-serif` }}>{o}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">This field is required</p>}
      </div>
    )
  }

  return null
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total, primary }: { current: number; total: number; primary: string }) {
  if (total <= 1) return null
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: primary }}
      />
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ step, theme, title, body }: { step: FormStep | undefined; theme: FormTheme; title?: string; body?: string }) {
  const primary  = theme.colors?.primary    ?? '#6366f1'
  const textCol  = theme.colors?.text       ?? '#111827'
  const fontFam  = theme.typography?.fontFamily ?? 'Inter'

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: `${primary}20` }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: primary }} />
      </div>
      <div style={{ fontFamily: `"${fontFam}", sans-serif`, color: textCol }}>
        <p className="text-xl font-bold mb-1">{title || 'Thank you!'}</p>
        <p className="text-sm opacity-70">{body || 'Your response has been submitted.'}</p>
      </div>
    </div>
  )
}

// ── Object-position parser (mirrors FormCanvas) ───────────────────────────────

function parseObjPos(pos: string): [number, number] {
  const kw: Record<string, number> = { left: 0, center: 50, right: 100, top: 0, bottom: 100 }
  const parts = pos.trim().split(/\s+/)
  const px = parseFloat(parts[0]); const py = parts[1] !== undefined ? parseFloat(parts[1]) : NaN
  const x = parts[0] in kw ? kw[parts[0]] : (isNaN(px) ? 50 : px)
  const y = parts[1] !== undefined ? (parts[1] in kw ? kw[parts[1]] : (isNaN(py) ? 50 : py)) : 50
  return [x, y]
}

// ── Main FormRenderer ─────────────────────────────────────────────────────────

interface Props {
  form:      Form
  sourceUrl: string
}

export function FormRenderer({ form, sourceUrl }: Props) {
  const gate = useFormGating(form)

  const theme    = form.theme ?? {}
  const primary  = theme.colors?.primary    ?? '#6366f1'
  const bg       = theme.colors?.background ?? '#ffffff'
  const bgImage  = theme.colors?.backgroundImage ?? ''
  const mRadius  = theme.modal?.radius      ?? '8px'
  const themeImgPos  = theme.imagePosition ?? 'top'
  const isSideLayout = themeImgPos === 'left' || themeImgPos === 'right'
  const mWidth   = theme.modal?.width       ?? (isSideLayout ? '680px' : '520px')
  const fontFam  = theme.typography?.fontFamily ?? 'Inter'
  const bodySize = theme.typography?.bodySize   ?? '14px'

  // ── Steps sorted, without success ─────────────────────────────────────────
  const inputSteps  = [...form.steps].filter(s => s.type !== 'success').sort((a, b) => a.order - b.order)
  const successStep = form.steps.find(s => s.type === 'success')

  // ── State — all hooks must be called before any early returns ──────────────
  const [stepIdx,    setStepIdx]    = useState(0)
  const [values,     setValues]     = useState<Record<string, string>>({})
  const [errors,     setErrors]     = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [submitErr,  setSubmitErr]  = useState<string | null>(null)
  const [isMobile,   setIsMobile]   = useState(false)

  useEffect(() => {
    // When loaded inside an embed iframe, the parent's embed.js passes ?vw=<viewport>
    // so we can reflect the actual device size, not the (often narrow) iframe.
    const params = new URLSearchParams(window.location.search)
    const parentVw = Number(params.get('vw'))
    if (parentVw > 0) {
      setIsMobile(parentVw <= 640)
      return
    }
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Gating — early returns after all hooks
  if (gate === 'loading' || gate === 'waiting_trigger') return null
  if (gate === 'wrong_device' || gate === 'page_blocked' || gate === 'source_blocked' || gate === 'utm_blocked') return null
  if (gate === 'scheduled_closed') {
    return (
      <div className="mx-auto text-center py-16 px-6" style={{ width: mWidth, maxWidth: '100%', fontFamily: `"${fontFam}", sans-serif` }}>
        <p className="text-lg font-semibold text-gray-700 mb-2">This form is currently unavailable.</p>
        <p className="text-sm text-gray-400">Please check back later.</p>
      </div>
    )
  }

  const currentStep   = inputSteps[stepIdx]
  const stepBlocks    = currentStep
    ? form.blocks.filter(b => b.stepId === currentStep.id)
    : []
  const isLastStep    = stepIdx === inputSteps.length - 1
  const buttonBlock   = stepBlocks.find(b => b.type === 'button')
  const buttonLabel   = buttonBlock?.props.label ?? (isLastStep ? 'Submit' : 'Continue')
  const contentBlocks = stepBlocks.filter(b => b.type !== 'button')

  // ── Layout image extraction (mirrors FormCanvas) ──────────────────────────
  const imgPos       = isMobile ? 'top' : themeImgPos
  const layoutImgIdx = contentBlocks.findIndex(b => b.type === 'image' && b.props.src)
  const layoutImg    = layoutImgIdx >= 0 ? contentBlocks[layoutImgIdx] : null
  const layoutImgSrc = layoutImg ? (layoutImg.props.src as string) : null
  const fieldBlocks  = layoutImg ? contentBlocks.filter((_, i) => i !== layoutImgIdx) : contentBlocks

  const desktopObjPos = (layoutImg?.props.objectPosition       as string | undefined) ?? theme.imageObjectPosition ?? 'center center'
  const mobileObjPos  = (layoutImg?.props.objectPositionMobile as string | undefined) ?? 'center top'
  const storedObjPos  = isMobile ? mobileObjPos : desktopObjPos

  const maxW     = mWidth
  const cardBase: React.CSSProperties = { borderRadius: mRadius, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }

  function setValue(blockId: string, val: string) {
    setValues(prev => ({ ...prev, [blockId]: val }))
    if (errors[blockId]) setErrors(prev => ({ ...prev, [blockId]: false }))
  }

  function validateStep() {
    const newErrors: Record<string, boolean> = {}
    let valid = true
    for (const block of contentBlocks) {
      if (block.props.required && !values[block.id]) {
        newErrors[block.id] = true
        valid = false
      }
    }
    setErrors(newErrors)
    return valid
  }

  async function handleNext() {
    if (!validateStep()) return
    if (!isLastStep) {
      setStepIdx(i => i + 1)
      return
    }
    // Final step — submit
    setSubmitting(true)
    setSubmitErr(null)
    const result = await submitForm(form.public_slug!, values, { source_url: sourceUrl })
    setSubmitting(false)
    if (!result.success) {
      setSubmitErr(result.error ?? 'Something went wrong. Please try again.')
      return
    }
    if (result.redirectUrl) {
      window.location.href = result.redirectUrl
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto" style={{ width: maxW, maxWidth: '100%', ...cardBase, background: bg }}>
        <SuccessScreen step={successStep} theme={theme} title={form.behaviour?.display?.successTitle} body={form.behaviour?.display?.successBody} />
      </div>
    )
  }

  // ── Shared form fields section ─────────────────────────────────────────────
  const formContent = (
    <div className="px-7 py-7" style={{ fontFamily: `"${fontFam}", sans-serif` }}>
      <ProgressBar current={stepIdx + 1} total={inputSteps.length} primary={primary} />
      <div className="space-y-4">
        {fieldBlocks.map(block => (
          <BlockInput
            key={block.id}
            block={block}
            theme={theme}
            value={values[block.id] ?? ''}
            error={!!errors[block.id]}
            onChange={v => setValue(block.id, v)}
          />
        ))}
      </div>
      {submitErr && <p className="mt-4 text-sm text-red-500">{submitErr}</p>}
      <button
        onClick={handleNext}
        disabled={submitting}
        className="mt-6 w-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: primary, borderRadius: theme.buttons?.radius ?? '8px', fontSize: bodySize }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? 'Submitting…' : buttonLabel}
      </button>
    </div>
  )

  // ── Background layout ──────────────────────────────────────────────────────
  if (imgPos === 'background' && layoutImgSrc) {
    return (
      <div className="mx-auto" style={{ width: maxW, maxWidth: '100%' }}>
        <div className="relative overflow-hidden" style={cardBase}>
          <img src={layoutImgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.42)' }} />
          <div className="relative z-10" style={{ backgroundColor: bg }}>
            {formContent}
          </div>
        </div>
      </div>
    )
  }

  // ── Left / Right layout ────────────────────────────────────────────────────
  if ((imgPos === 'left' || imgPos === 'right') && layoutImgSrc) {
    const imgPanel = (
      <div className="w-[40%] shrink-0 relative self-stretch overflow-hidden">
        <img
          src={layoutImgSrc}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: storedObjPos }}
        />
      </div>
    )
    return (
      <div className="mx-auto" style={{ width: maxW, maxWidth: '100%' }}>
        <div className="overflow-hidden flex" style={cardBase}>
          {imgPos === 'left' && imgPanel}
          <div className="w-[60%] shrink-0 min-w-0" style={{ backgroundColor: bg }}>
            {formContent}
          </div>
          {imgPos === 'right' && imgPanel}
        </div>
      </div>
    )
  }

  // ── Top layout (default) ───────────────────────────────────────────────────
  return (
    <div className="mx-auto" style={{ width: maxW, maxWidth: '100%' }}>
      <div
        className="overflow-hidden"
        style={{
          ...cardBase,
          backgroundColor:    bg,
          backgroundImage:    bgImage ? `url(${bgImage})` : undefined,
          backgroundSize:     'cover',
          backgroundPosition: theme.colors?.backgroundImagePosition ?? 'center center',
        }}
      >
        {layoutImgSrc && (
          <img src={layoutImgSrc} alt="" className="w-full object-cover" style={{ height: 200, display: 'block', objectPosition: storedObjPos }} />
        )}
        {formContent}
      </div>
    </div>
  )
}
