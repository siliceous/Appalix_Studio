'use client'

import React, { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, LayoutTemplate, Lock,
  Mail, MessageSquare, ChevronDown, X, Save, Loader2,
} from 'lucide-react'
import {
  createSageEmailTemplate,
  updateSageEmailTemplate,
  deleteSageEmailTemplate,
} from '@/app/actions/sage-email-templates'
import type {
  SageEmailTemplate,
  EmailTemplateCategory,
  EmailTemplateChannel,
  AutomationType,
} from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  initial_outreach: 'Initial Outreach',
  follow_up:        'Follow-up',
  qualification:    'Qualification',
  meeting_request:  'Meeting Request',
  reengagement:     'Reengagement',
  handoff:          'Handoff',
  nurture:          'Nurture',
  general:          'General',
}

const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  warm_introduction:  'Warm Intro',
  qualification:      'Qualification',
  reengagement:       'Reengagement',
  meeting_conversion: 'Meeting',
  nurture:            'Nurture',
  custom:             'Custom',
}

const CATEGORY_OPTIONS: EmailTemplateCategory[] = [
  'initial_outreach', 'follow_up', 'qualification',
  'meeting_request', 'reengagement', 'handoff', 'nurture', 'general',
]

const AUTOMATION_TYPE_OPTIONS: (AutomationType | '')[] = [
  '', 'warm_introduction', 'qualification', 'reengagement', 'meeting_conversion', 'nurture', 'custom',
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateFormState {
  name:             string
  description:      string
  category:         EmailTemplateCategory
  automation_type:  AutomationType | ''
  channel:          EmailTemplateChannel
  subject_template: string
  body_template:    string
}

const BLANK_FORM: TemplateFormState = {
  name:             '',
  description:      '',
  category:         'initial_outreach',
  automation_type:  '',
  channel:          'email',
  subject_template: '',
  body_template:    '',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  templates: SageEmailTemplate[]
  canWrite:  boolean
}

export function TemplatesClient({ templates, canWrite }: Props) {
  const router              = useRouter()
  const [isPending, startT] = useTransition()

  const [filter,  setFilter]  = useState<EmailTemplateCategory | 'all'>('all')
  const [channel, setChannel] = useState<EmailTemplateChannel | 'all'>('all')
  const [modal,   setModal]   = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<SageEmailTemplate | null>(null)
  const [form,    setForm]    = useState<TemplateFormState>(BLANK_FORM)
  const [error,   setError]   = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = templates.filter(t => {
    if (filter  !== 'all' && t.category !== filter)  return false
    if (channel !== 'all' && t.channel  !== channel) return false
    return true
  })

  const workspace = filtered.filter(t => !t.is_system)
  const system    = filtered.filter(t =>  t.is_system)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(BLANK_FORM)
    setEditing(null)
    setError(null)
    setModal('create')
  }

  function openEdit(t: SageEmailTemplate) {
    setForm({
      name:             t.name,
      description:      t.description ?? '',
      category:         t.category,
      automation_type:  t.automation_type ?? '',
      channel:          t.channel,
      subject_template: t.subject_template ?? '',
      body_template:    t.body_template,
    })
    setEditing(t)
    setError(null)
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setEditing(null)
    setError(null)
  }

  function field(key: keyof TemplateFormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim())         return setError('Name is required.')
    if (!form.body_template.trim()) return setError('Body template is required.')
    setError(null)

    startT(async () => {
      try {
        const payload = {
          name:              form.name.trim(),
          description:       form.description.trim() || undefined,
          category:          form.category,
          automation_type:   form.automation_type || undefined,
          channel:           form.channel,
          subject_template:  form.subject_template.trim() || undefined,
          body_template:     form.body_template,
        }

        if (modal === 'create') {
          await createSageEmailTemplate(payload)
        } else if (editing) {
          await updateSageEmailTemplate(editing.id, payload)
        }

        closeModal()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed.')
      }
    })
  }

  async function handleDelete(id: string) {
    startT(async () => {
      try {
        await deleteSageEmailTemplate(id)
        setDeleteId(null)
        router.refresh()
      } catch (e) {
        console.error(e)
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 ml-3 mr-4">

      {/* Page header */}
      <div className="pt-5 pb-3 px-4 flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Outreach templates for Sage automations. Variables use {'{{double_braces}}'}  syntax.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#15A4AE] hover:bg-[#1290a0] text-white rounded-xl transition-colors mt-0.5"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap shrink-0">
        {/* Category filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as EmailTemplateCategory | 'all')}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Channel filter */}
        <div className="relative">
          <select
            value={channel}
            onChange={e => setChannel(e.target.value as EmailTemplateChannel | 'all')}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40"
          >
            <option value="all">All channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Template list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-6">

        {/* Workspace templates */}
        {workspace.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Your Templates
            </p>
            <div className="space-y-2">
              {workspace.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  canWrite={canWrite}
                  onEdit={() => openEdit(t)}
                  onDelete={() => setDeleteId(t.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* System templates */}
        {system.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Built-in Templates
            </p>
            <div className="space-y-2">
              {system.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  canWrite={false}
                  onEdit={() => openEdit(t)}
                  onDelete={() => {}}
                  readOnly
                />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutTemplate className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No templates found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {canWrite ? 'Create your first template to get started.' : 'No templates match this filter.'}
            </p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Delete template?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8 shrink-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {modal === 'create' ? 'New Template' : editing?.is_system ? 'View Template' : 'Edit Template'}
              </p>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {editing?.is_system && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  Built-in template — read-only. Create a new template to customise.
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => field('name', e.target.value)}
                  disabled={editing?.is_system}
                  placeholder="e.g. SaaS Initial Outreach"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => field('description', e.target.value)}
                  disabled={editing?.is_system}
                  placeholder="Optional — what is this template for?"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                />
              </div>

              {/* Category + Channel row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category *</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={e => field('category', e.target.value)}
                      disabled={editing?.is_system}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                    >
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Channel</label>
                  <div className="relative">
                    <select
                      value={form.channel}
                      onChange={e => field('channel', e.target.value)}
                      disabled={editing?.is_system}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Automation type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Automation Type
                  <span className="ml-1 font-normal text-gray-400">(optional — used for exact-match lookup)</span>
                </label>
                <div className="relative">
                  <select
                    value={form.automation_type}
                    onChange={e => field('automation_type', e.target.value)}
                    disabled={editing?.is_system}
                    className="w-full appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                  >
                    <option value="">Any automation</option>
                    {(['warm_introduction', 'qualification', 'reengagement', 'meeting_conversion', 'nurture', 'custom'] as AutomationType[]).map(t => (
                      <option key={t} value={t}>{AUTOMATION_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Subject (email only) */}
              {form.channel === 'email' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={form.subject_template}
                    onChange={e => field('subject_template', e.target.value)}
                    disabled={editing?.is_system}
                    placeholder="e.g. Quick intro from {{sender_name}}"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 font-mono focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50"
                  />
                </div>
              )}

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Body *</label>
                <textarea
                  ref={bodyRef}
                  value={form.body_template}
                  onChange={e => field('body_template', e.target.value)}
                  disabled={editing?.is_system}
                  rows={10}
                  placeholder={'Use {{first_name}}, {{company_name}}, {{sender_name}}, etc.'}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 font-mono focus:outline-none focus:ring-1 focus:ring-[#15A4AE]/40 disabled:opacity-50 resize-none"
                />
              </div>

              {/* Variable hints */}
              <div className="flex flex-wrap gap-1.5">
                {['{{first_name}}', '{{company_name}}', '{{sender_name}}', '{{sender_title}}', '{{value_proposition}}', '{{calendar_link}}'].map(v => (
                  <button
                    key={v}
                    type="button"
                    disabled={editing?.is_system}
                    onClick={() => {
                      if (editing?.is_system) return
                      const el = bodyRef.current
                      if (!el) return
                      const start = el.selectionStart ?? el.value.length
                      const end   = el.selectionEnd   ?? el.value.length
                      const next  = el.value.slice(0, start) + v + el.value.slice(end)
                      field('body_template', next)
                      requestAnimationFrame(() => {
                        el.focus()
                        el.setSelectionRange(start + v.length, start + v.length)
                      })
                    }}
                    className="px-2 py-0.5 text-[11px] font-mono bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-[#15A4AE]/10 hover:text-[#15A4AE] transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    {v}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
              )}
            </div>

            {/* Modal footer */}
            {!editing?.is_system && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/8 flex justify-end gap-2 shrink-0">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#15A4AE] hover:bg-[#1290a0] text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {modal === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template, canWrite, onEdit, onDelete, readOnly,
}: {
  template: SageEmailTemplate
  canWrite: boolean
  onEdit:   () => void
  onDelete: () => void
  readOnly?: boolean
}) {
  return (
    <div className="bg-white dark:bg-[#232323] border border-gray-100 dark:border-white/8 rounded-xl px-4 py-3.5 flex items-start gap-3 hover:border-gray-200 dark:hover:border-white/12 transition-colors group">

      {/* Channel icon */}
      <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center mt-0.5">
        {template.channel === 'email'
          ? <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          : <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{template.name}</p>
          {readOnly && (
            <Lock className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
          )}
        </div>

        {template.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{template.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <CategoryBadge category={template.category} />
          {template.automation_type && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[#15A4AE]/10 text-[#15A4AE] font-medium">
              {AUTOMATION_TYPE_LABELS[template.automation_type]}
            </span>
          )}
          {template.variables.length > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          title={readOnly ? 'View' : 'Edit'}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {canWrite && !readOnly && (
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function CategoryBadge({ category }: { category: EmailTemplateCategory }) {
  const colours: Partial<Record<EmailTemplateCategory, string>> = {
    initial_outreach: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    follow_up:        'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    qualification:    'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    meeting_request:  'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
    reengagement:     'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
    handoff:          'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    nurture:          'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
    general:          'bg-gray-50 dark:bg-white/8 text-gray-600 dark:text-gray-400',
  }
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${colours[category] ?? colours.general}`}>
      {CATEGORY_LABELS[category]}
    </span>
  )
}
