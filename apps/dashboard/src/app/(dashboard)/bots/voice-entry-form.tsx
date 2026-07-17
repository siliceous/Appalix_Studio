'use client'

import { useState } from 'react'
import { Plus, ChevronRight, FileText, AlignLeft, Cloud, HardDrive } from 'lucide-react'
import { createVoiceKnowledgeEntry } from '@/app/actions/voice'
import { TriggerPhrasesInput } from './trigger-phrases-input'
import { EnhanceableInput, EnhanceableTextarea } from '@/components/ui/enhance-with-ai'
import type { VoiceKnowledgeEntry } from '@/lib/types'

const KB_CATEGORIES: { id: VoiceKnowledgeEntry['category']; label: string }[] = [
  { id: 'faq',        label: 'FAQs' },
  { id: 'objection',  label: 'Objection Handling' },
  { id: 'booking',    label: 'Booking Phrases' },
  { id: 'escalation', label: 'Escalation Phrases' },
  { id: 'script',     label: 'Call Scripts' },
  { id: 'compliance', label: 'Compliance Lines' },
  { id: 'greeting',   label: 'Greetings' },
  { id: 'fallback',   label: 'Fallback Phrases' },
]

const fieldClass =
  'w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#15A4AE] bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-200'

export function VoiceEntryForm({
  activeKbBotId,
  activeKbCategory,
}: {
  activeKbBotId?: string
  activeKbCategory?: VoiceKnowledgeEntry['category']
}) {
  const [title, setTitle] = useState('')

  return (
    <details className="group rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
      <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors list-none select-none">
        <Plus className="w-3.5 h-3.5 text-[#15A4AE]" />
        Add new entry
        <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
      </summary>

      <form
        action={createVoiceKnowledgeEntry}
        className="px-4 pb-4 pt-3 space-y-3 border-t border-dashed border-gray-200 dark:border-white/10"
      >
        <input type="hidden" name="bot_id" value={activeKbBotId ?? ''} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
            <select name="category" defaultValue={activeKbCategory ?? 'faq'} className={fieldClass}>
              {KB_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Usage</label>
            <select name="usage_type" defaultValue="auto" className={fieldClass}>
              <option value="auto">Auto</option>
              <option value="always">Always</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Primary phrase</label>
          <EnhanceableInput
            name="title"
            fieldType="primary_phrase"
            required
            placeholder='e.g. "What is your pricing?"'
            className={fieldClass}
            onChange={setTitle}
          />
        </div>

        <TriggerPhrasesInput contextPhrase={title} />

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Approved response</label>
          <EnhanceableTextarea
            name="content"
            fieldType="approved_response"
            rows={3}
            placeholder='e.g. "Our plans start from $49 per month…"'
            className={`${fieldClass} resize-none`}
            helperText="Write as spoken language — short sentences, natural pauses."
          />
        </div>

        {/* Enrichment sources */}
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Enrich with a file or cloud source</p>
          <div className="flex items-center gap-2 flex-wrap">
            <a href="/sources/new?type=file" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:opacity-80 transition-opacity whitespace-nowrap">
              <FileText className="w-3.5 h-3.5" />PDF / Word / ZIP
            </a>
            <a href="/sources/new?type=csv" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity whitespace-nowrap">
              <AlignLeft className="w-3.5 h-3.5" />CSV
            </a>
            <a href="/sources/new?type=excel" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity whitespace-nowrap">
              <FileText className="w-3.5 h-3.5" />XL / XLS
            </a>
            <a href="/sources/new?type=google_drive" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-brand-200 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:opacity-80 transition-opacity whitespace-nowrap">
              <Cloud className="w-3.5 h-3.5" />Google Drive
            </a>
            <a href="/sources/new?type=onedrive" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-sky-200 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:opacity-80 transition-opacity whitespace-nowrap">
              <HardDrive className="w-3.5 h-3.5" />OneDrive
            </a>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="px-3 py-1.5 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-xs font-medium rounded-lg transition-colors">
            Save entry
          </button>
        </div>
      </form>
    </details>
  )
}
