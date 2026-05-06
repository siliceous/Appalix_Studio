'use client'

import type { FormTheme } from '@/features/forms/types'

// ── Primitives ────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2.5">
      <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function ColorSwatch({
  value,
  onChange,
}: {
  value:    string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden cursor-pointer shrink-0 shadow-sm">
        <div className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 text-[11px] font-mono border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}

function Select({ value, options, onChange }: {
  value:    string
  options:  { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function RadiusInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="8px"
      className="w-20 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 text-right"
    />
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { value: 'Inter',      label: 'Inter'       },
  { value: 'Roboto',     label: 'Roboto'      },
  { value: 'Open Sans',  label: 'Open Sans'   },
  { value: 'Lato',       label: 'Lato'        },
  { value: 'Poppins',    label: 'Poppins'     },
  { value: 'Montserrat', label: 'Montserrat'  },
  { value: 'Nunito',     label: 'Nunito'      },
  { value: 'Georgia',    label: 'Georgia'     },
]

const SIZE_OPTIONS = [
  { value: '12px', label: '12px' },
  { value: '13px', label: '13px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
]

const SHADOW_OPTIONS = [
  { value: 'none',   label: 'None'   },
  { value: 'small',  label: 'Small'  },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large'  },
]

const BUTTON_STYLE_OPTIONS = [
  { value: 'solid',   label: 'Solid'   },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost',   label: 'Ghost'   },
]

const WIDTH_OPTIONS = [
  { value: '400px', label: '400px' },
  { value: '480px', label: '480px' },
  { value: '520px', label: '520px' },
  { value: '600px', label: '600px' },
  { value: '680px', label: '680px' },
  { value: '100%',  label: 'Full'   },
]

interface Props {
  theme:    FormTheme
  onChange: (patch: Partial<FormTheme>) => void
}

export function FormThemePanel({ theme: t, onChange }: Props) {
  const colors     = t.colors     ?? {}
  const typography = t.typography ?? {}
  const buttons    = t.buttons    ?? {}
  const fields     = t.fields     ?? {}
  const modal      = t.modal      ?? {}

  return (
    <div className="px-4 py-4 space-y-6">

      {/* Colors */}
      <div>
        <SectionHeader label="Colors" />
        <Row label="Primary">
          <ColorSwatch
            value={colors.primary ?? '#6366f1'}
            onChange={v => onChange({ colors: { ...colors, primary: v } })}
          />
        </Row>
        <Row label="Background">
          <ColorSwatch
            value={colors.background ?? '#ffffff'}
            onChange={v => onChange({ colors: { ...colors, background: v } })}
          />
        </Row>
        <Row label="Text">
          <ColorSwatch
            value={colors.text ?? '#111827'}
            onChange={v => onChange({ colors: { ...colors, text: v } })}
          />
        </Row>
        <Row label="Muted text">
          <ColorSwatch
            value={colors.muted ?? '#6b7280'}
            onChange={v => onChange({ colors: { ...colors, muted: v } })}
          />
        </Row>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700/60" />

      {/* Typography */}
      <div>
        <SectionHeader label="Typography" />
        <Row label="Font">
          <Select
            value={typography.fontFamily ?? 'Inter'}
            options={FONT_OPTIONS}
            onChange={v => onChange({ typography: { ...typography, fontFamily: v } })}
          />
        </Row>
        <Row label="Heading size">
          <Select
            value={typography.headingSize ?? '24px'}
            options={SIZE_OPTIONS}
            onChange={v => onChange({ typography: { ...typography, headingSize: v } })}
          />
        </Row>
        <Row label="Body size">
          <Select
            value={typography.bodySize ?? '14px'}
            options={SIZE_OPTIONS}
            onChange={v => onChange({ typography: { ...typography, bodySize: v } })}
          />
        </Row>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700/60" />

      {/* Buttons */}
      <div>
        <SectionHeader label="Button" />
        <Row label="Style">
          <Select
            value={buttons.style ?? 'solid'}
            options={BUTTON_STYLE_OPTIONS}
            onChange={v => onChange({ buttons: { ...buttons, style: v as NonNullable<FormTheme['buttons']>['style'] } })}
          />
        </Row>
        <Row label="Radius">
          <RadiusInput
            value={buttons.radius ?? '8px'}
            onChange={v => onChange({ buttons: { ...buttons, radius: v } })}
          />
        </Row>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700/60" />

      {/* Fields */}
      <div>
        <SectionHeader label="Input fields" />
        <Row label="Border color">
          <ColorSwatch
            value={fields.borderColor ?? '#d1d5db'}
            onChange={v => onChange({ fields: { ...fields, borderColor: v } })}
          />
        </Row>
        <Row label="Radius">
          <RadiusInput
            value={fields.radius ?? '6px'}
            onChange={v => onChange({ fields: { ...fields, radius: v } })}
          />
        </Row>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700/60" />

      {/* Modal / Container */}
      <div>
        <SectionHeader label="Container" />
        <Row label="Width">
          <Select
            value={modal.width ?? '520px'}
            options={WIDTH_OPTIONS}
            onChange={v => onChange({ modal: { ...modal, width: v } })}
          />
        </Row>
        <Row label="Radius">
          <RadiusInput
            value={modal.radius ?? '8px'}
            onChange={v => onChange({ modal: { ...modal, radius: v } })}
          />
        </Row>
        <Row label="Shadow">
          <Select
            value={modal.shadow ?? 'medium'}
            options={SHADOW_OPTIONS}
            onChange={v => onChange({ modal: { ...modal, shadow: v as NonNullable<FormTheme['modal']>['shadow'] } })}
          />
        </Row>
      </div>

    </div>
  )
}
