'use client'

import { nanoid } from 'nanoid'
import {
  Mail, Phone, Type, MousePointerClick, Image as ImageIcon,
  Minus, AlignLeft, CheckSquare, ChevronDown, Circle,
} from 'lucide-react'
import type { FormBlock, BlockType, ColumnRatio } from '@/features/forms/types'

// ── Block catalogue ───────────────────────────────────────────────────────────

const ITEMS: {
  type:  BlockType
  label: string
  icon:  React.ElementType
  defaultProps: FormBlock['props']
}[] = [
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    defaultProps: { label: 'Email address', placeholder: 'Enter your email', required: true },
  },
  {
    type: 'phone',
    label: 'Phone number',
    icon: Phone,
    defaultProps: { label: 'Phone number', placeholder: '+1 555 000 0000', required: false },
  },
  {
    type: 'text_input',
    label: 'Input',
    icon: Type,
    defaultProps: { label: 'Your answer', placeholder: 'Type here…', required: false },
  },
  {
    type: 'textarea',
    label: 'Textarea',
    icon: AlignLeft,
    defaultProps: { label: 'Message', placeholder: 'Tell us more…', required: false },
  },
  {
    type: 'button',
    label: 'Button',
    icon: MousePointerClick,
    defaultProps: { label: 'Submit', action: 'submit' },
  },
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    defaultProps: { content: 'Add your text here', variant: 'body' },
  },
  {
    type: 'image',
    label: 'Image',
    icon: ImageIcon,
    defaultProps: { src: '', alt: '' },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: Minus,
    defaultProps: {},
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: CheckSquare,
    defaultProps: { label: 'I agree to the terms', required: false },
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    icon: ChevronDown,
    defaultProps: { label: 'Select an option', options: ['Option 1', 'Option 2'], required: false },
  },
  {
    type: 'radio',
    label: 'Radio',
    icon: Circle,
    defaultProps: { label: 'Choose one', options: ['Option A', 'Option B'], required: false },
  },
]

// ── Column layout catalogue ───────────────────────────────────────────────────

const COLUMN_LAYOUTS: { ratio: ColumnRatio; label: string; widths: number[] }[] = [
  { ratio: '1:1',   label: '2 Equal', widths: [1, 1]    },
  { ratio: '2:1',   label: '2 : 1',   widths: [2, 1]    },
  { ratio: '1:2',   label: '1 : 2',   widths: [1, 2]    },
  { ratio: '1:1:1', label: '3 Equal', widths: [1, 1, 1] },
]

// Visual miniature of column proportions
function ColumnPreview({ widths }: { widths: number[] }) {
  const total = widths.reduce((a, b) => a + b, 0)
  return (
    <div className="flex gap-0.5 w-full h-5">
      {widths.map((w, i) => (
        <div
          key={i}
          className="rounded-sm bg-gray-300 dark:bg-gray-500 group-hover:bg-brand-400 transition-colors"
          style={{ flex: w / total * total }}
        />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  selectedStepId: string
  onAddBlock:     (block: FormBlock) => void
}

export function FormBlocksSidebar({ selectedStepId, onAddBlock }: Props) {
  function handleAdd(item: typeof ITEMS[number]) {
    const block: FormBlock = {
      id:     `b_${nanoid(8)}`,
      stepId: selectedStepId,
      type:   item.type,
      props:  { ...item.defaultProps },
    }
    onAddBlock(block)
  }

  function handleAddColumn(layout: typeof COLUMN_LAYOUTS[number]) {
    const block: FormBlock = {
      id:     `b_${nanoid(8)}`,
      stepId: selectedStepId,
      type:   'columns',
      props:  {
        ratio:   layout.ratio,
        columns: layout.widths.map(() => []),
      },
    }
    onAddBlock(block)
  }

  return (
    <div className="w-[160px] shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden bg-white dark:bg-gray-900">

      <div className="shrink-0 px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Items</p>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-2 py-3">

        {/* Block items */}
        <div className="grid grid-cols-2 gap-1.5 mb-5">
          {ITEMS.map(item => (
            <button
              key={item.type + item.label}
              draggable
              onDragStart={e => {
                e.dataTransfer.effectAllowed = 'copy'
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: item.type, props: item.defaultProps }))
              }}
              onClick={() => handleAdd(item)}
              title={`Add ${item.label}`}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 transition-colors cursor-grab active:cursor-grabbing group"
            >
              <item.icon className="w-6 h-6 text-gray-400 group-hover:text-brand-500 transition-colors" />
              <span className="text-[11px] text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 text-center leading-tight transition-colors">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Column layouts */}
        <div className="border-t border-gray-100 dark:border-white/8 pt-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Layouts</p>
          <div className="grid grid-cols-2 gap-1.5">
            {COLUMN_LAYOUTS.map(layout => (
              <button
                key={layout.ratio}
                onClick={() => handleAddColumn(layout)}
                title={`Add ${layout.label} layout`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 transition-colors cursor-pointer group"
              >
                <ColumnPreview widths={layout.widths} />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 text-center leading-tight transition-colors">
                  {layout.label}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
