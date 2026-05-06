'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { submitForm } from '@/app/actions/form-submissions'
import type { Form, FormBlock, FormStep, FormTheme } from '@/features/forms/types'

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
  const primary   = theme.colors?.primary    ?? '#6366f1'
  const textCol   = theme.colors?.text       ?? '#111827'
  const fRadius   = theme.fields?.radius     ?? '6px'
  const fBorder   = error ? '#ef4444' : (theme.fields?.borderColor ?? '#d1d5db')
  const bRadius   = theme.buttons?.radius    ?? '8px'
  const fontFam   = theme.typography?.fontFamily ?? 'Inter'
  const bodySize  = theme.typography?.bodySize   ?? '14px'
  const headSize  = theme.typography?.headingSize ?? '22px'

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
          fontFamily: `"${fontFam}", sans-serif`,
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

  const labelEl = block.props.label && (
    <label
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

function SuccessScreen({ step, theme }: { step: FormStep | undefined; theme: FormTheme }) {
  const primary  = theme.colors?.primary    ?? '#6366f1'
  const textCol  = theme.colors?.text       ?? '#111827'
  const fontFam  = theme.typography?.fontFamily ?? 'Inter'
  const successBlocks = step ? [] : [] // success step blocks if any

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: `${primary}20` }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: primary }} />
      </div>
      <div style={{ fontFamily: `"${fontFam}", sans-serif`, color: textCol }}>
        <p className="text-xl font-bold mb-1">Thank you!</p>
        <p className="text-sm opacity-70">Your response has been submitted.</p>
      </div>
    </div>
  )
}

// ── Main FormRenderer ─────────────────────────────────────────────────────────

interface Props {
  form:      Form
  sourceUrl: string
}

export function FormRenderer({ form, sourceUrl }: Props) {
  const theme   = form.theme   ?? {}
  const primary = theme.colors?.primary    ?? '#6366f1'
  const bg      = theme.colors?.background ?? '#ffffff'
  const bRadius = theme.buttons?.radius    ?? '8px'
  const mRadius = theme.modal?.radius      ?? '8px'
  const mWidth  = theme.modal?.width       ?? '520px'
  const fontFam = theme.typography?.fontFamily ?? 'Inter'
  const bodySize = theme.typography?.bodySize ?? '14px'

  // ── Steps sorted, without success ─────────────────────────────────────────
  const inputSteps  = [...form.steps].filter(s => s.type !== 'success').sort((a, b) => a.order - b.order)
  const successStep = form.steps.find(s => s.type === 'success')

  // ── State ──────────────────────────────────────────────────────────────────
  const [stepIdx,    setStepIdx]    = useState(0)
  const [values,     setValues]     = useState<Record<string, string>>({})
  const [errors,     setErrors]     = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [submitErr,  setSubmitErr]  = useState<string | null>(null)

  const currentStep   = inputSteps[stepIdx]
  const stepBlocks    = currentStep
    ? form.blocks.filter(b => b.stepId === currentStep.id)
    : []
  const isLastStep    = stepIdx === inputSteps.length - 1
  const buttonBlock   = stepBlocks.find(b => b.type === 'button')
  const buttonLabel   = buttonBlock?.props.label ?? (isLastStep ? 'Submit' : 'Continue')
  const contentBlocks = stepBlocks.filter(b => b.type !== 'button')

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
      <div
        className="w-full mx-auto shadow-xl overflow-hidden"
        style={{ maxWidth: mWidth, background: bg, borderRadius: mRadius }}
      >
        <SuccessScreen step={successStep} theme={theme} />
      </div>
    )
  }

  return (
    <div
      className="w-full mx-auto shadow-xl overflow-hidden"
      style={{ maxWidth: mWidth, background: bg, borderRadius: mRadius }}
    >
      <div className="px-7 py-7" style={{ fontFamily: `"${fontFam}", sans-serif` }}>

        <ProgressBar
          current={stepIdx + 1}
          total={inputSteps.length}
          primary={primary}
        />

        <div className="space-y-4">
          {contentBlocks.map(block => (
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

        {submitErr && (
          <p className="mt-4 text-sm text-red-500">{submitErr}</p>
        )}

        <button
          onClick={handleNext}
          disabled={submitting}
          className="mt-6 w-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: primary, borderRadius: bRadius, fontSize: bodySize }}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Submitting…' : buttonLabel}
        </button>

      </div>
    </div>
  )
}
