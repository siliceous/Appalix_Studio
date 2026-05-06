'use client'

import { useState, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Monitor, Smartphone, Loader2, Check,
  AlertCircle, Eye, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateForm, publishForm, pauseForm } from '@/app/actions/forms'
import type { Form, FormStep, FormBlock, FormBehaviour, FormTheme, SaveState, RightTab } from '@/features/forms/types'
import { FormBlocksSidebar }  from './FormBlocksSidebar'
import { FormCanvas }         from './FormCanvas'
import { FormStepController } from './FormStepController'
import { FormBehaviourPanel } from './FormBehaviourPanel'
import { FormThemePanel }     from './FormThemePanel'
import { FormImagesPanel }    from './FormImagesPanel'

const AUTOSAVE_DELAY = 800

interface Props { initialForm: Form }

export function FormEditorShell({ initialForm }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // ── Core state ────────────────────────────────────────────────────────────

  const [form,           setForm]           = useState<Form>(initialForm)
  const [selectedStepId, setSelectedStepId] = useState<string>(
    initialForm.steps[0]?.id ?? 'step_1'
  )
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [rightTab,        setRightTab]        = useState<RightTab>('behaviour')
  const [saveState,       setSaveState]       = useState<SaveState>('idle')
  const [publishing,      setPublishing]      = useState(false)
  const [previewDevice,   setPreviewDevice]   = useState<'desktop' | 'mobile'>('desktop')
  const [editingName,     setEditingName]     = useState(false)
  const [nameDraft,       setNameDraft]       = useState(initialForm.name)
  const [statusMenuOpen,  setStatusMenuOpen]  = useState(false)

  // ── Autosave ──────────────────────────────────────────────────────────────

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestForm = useRef(form)
  latestForm.current = form

  const scheduleAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(async () => {
      const f = latestForm.current
      const result = await updateForm(f.id, {
        name:      f.name,
        steps:     f.steps,
        blocks:    f.blocks,
        behaviour: f.behaviour,
        theme:     f.theme,
      })
      setSaveState(result.error ? 'error' : 'saved')
      if (!result.error) setTimeout(() => setSaveState('idle'), 2000)
    }, AUTOSAVE_DELAY)
  }, [])

  // Trigger autosave whenever form content changes (not on initial mount)
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    scheduleAutosave()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.steps, form.blocks, form.behaviour, form.theme])

  // ── Block mutations ───────────────────────────────────────────────────────

  function addBlock(block: FormBlock) {
    setForm(f => ({ ...f, blocks: [...f.blocks, { ...block, stepId: selectedStepId }] }))
    setSelectedBlockId(block.id)
  }

  function updateBlock(blockId: string, props: Partial<FormBlock['props']>) {
    setForm(f => ({
      ...f,
      blocks: f.blocks.map(b => b.id === blockId ? { ...b, props: { ...b.props, ...props } } : b),
    }))
  }

  function deleteBlock(blockId: string) {
    setForm(f => ({ ...f, blocks: f.blocks.filter(b => b.id !== blockId) }))
    if (selectedBlockId === blockId) setSelectedBlockId(null)
  }

  function addBlockToColumn(columnBlockId: string, colIdx: number, newBlock: FormBlock) {
    setForm(f => ({
      ...f,
      blocks: f.blocks.map(b => {
        if (b.id !== columnBlockId) return b
        const cols = [...((b.props.columns as FormBlock[][] | undefined) ?? [])]
        cols[colIdx] = [...(cols[colIdx] ?? []), newBlock]
        return { ...b, props: { ...b.props, columns: cols } }
      }),
    }))
  }

  function moveBlock(blockId: string, direction: 'up' | 'down') {
    setForm(f => {
      const stepBlocks = f.blocks.filter(b => b.stepId === selectedStepId)
      const others     = f.blocks.filter(b => b.stepId !== selectedStepId)
      const idx = stepBlocks.findIndex(b => b.id === blockId)
      if (idx === -1) return f
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= stepBlocks.length) return f
      const reordered = [...stepBlocks]
      ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
      return { ...f, blocks: [...others, ...reordered] }
    })
  }

  // ── Step mutations ────────────────────────────────────────────────────────

  function addStep() {
    const inputSteps = form.steps.filter(s => s.type !== 'success')
    const newId    = `step_${inputSteps.length + 1}`
    const newStep: FormStep = { id: newId, name: `Step ${inputSteps.length + 1}`, order: inputSteps.length + 1, type: 'input' }
    setForm(f => {
      const withoutSuccess = f.steps.filter(s => s.type !== 'success')
      const success = f.steps.filter(s => s.type === 'success')
      return { ...f, steps: [...withoutSuccess, newStep, ...success] }
    })
    setSelectedStepId(newId)
  }

  function deleteStep(stepId: string) {
    const step = form.steps.find(s => s.id === stepId)
    if (!step || step.type === 'success') return
    setForm(f => ({
      ...f,
      steps:  f.steps.filter(s => s.id !== stepId),
      blocks: f.blocks.filter(b => b.stepId !== stepId),
    }))
    const remaining = form.steps.filter(s => s.id !== stepId)
    setSelectedStepId(remaining[0]?.id ?? 'success')
  }

  // ── Behaviour + Theme ─────────────────────────────────────────────────────

  function updateBehaviour(patch: Partial<FormBehaviour>) {
    setForm(f => ({ ...f, behaviour: { ...f.behaviour, ...patch } }))
  }

  function updateTheme(patch: Partial<FormTheme>) {
    setForm(f => ({ ...f, theme: { ...f.theme, ...patch } }))
  }

  // ── Name commit ───────────────────────────────────────────────────────────

  function commitName() {
    if (nameDraft.trim() && nameDraft !== form.name) {
      setForm(f => ({ ...f, name: nameDraft.trim() }))
    }
    setEditingName(false)
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  async function handlePublish() {
    setPublishing(true)
    const result = await publishForm(form.id)
    setPublishing(false)
    if (!result.error) {
      setForm(f => ({ ...f, status: 'published' }))
    }
  }

  async function handlePause() {
    startTransition(async () => {
      await pauseForm(form.id)
      setForm(f => ({ ...f, status: 'paused' }))
    })
  }

  // ── Status colour ─────────────────────────────────────────────────────────

  const STATUS_STYLE = {
    draft:     'bg-gray-100 dark:bg-white/8 text-gray-500',
    published: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
    paused:    'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
    archived:  'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400',
  }

  const currentStepBlocks = form.blocks.filter(b => b.stepId === selectedStepId)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">

        {/* Back */}
        <button
          onClick={() => router.push('/dashboard/forms')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Form name */}
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(form.name); setEditingName(false) } }}
            className="text-sm font-semibold bg-transparent border-b border-brand-400 focus:outline-none text-gray-900 dark:text-gray-100 min-w-0 max-w-[260px]"
          />
        ) : (
          <button
            onClick={() => { setNameDraft(form.name); setEditingName(true) }}
            className="group flex items-center gap-1.5 min-w-0 max-w-[260px]"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{form.name}</span>
          </button>
        )}

        {/* Status badge */}
        <div className="relative">
          <button
            onClick={() => setStatusMenuOpen(v => !v)}
            className={cn(
              'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full transition-colors',
              STATUS_STYLE[form.status]
            )}
          >
            {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
            <ChevronDown className="w-3 h-3" />
          </button>
          {statusMenuOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px]">
              {form.status === 'published' && (
                <button onClick={() => { handlePause(); setStatusMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs text-amber-600 hover:bg-gray-50 dark:hover:bg-white/5">
                  Pause form
                </button>
              )}
              <button onClick={() => setStatusMenuOpen(false)}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Device toggle */}
        <div className="ml-auto flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/8 rounded-lg">
          <button
            onClick={() => setPreviewDevice('desktop')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              previewDevice === 'desktop'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-700 dark:text-gray-200'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewDevice('mobile')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              previewDevice === 'mobile'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-700 dark:text-gray-200'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preview */}
        <a
          href={form.public_slug ? `/f/${form.public_slug}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 transition-colors',
            form.status === 'published'
              ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
              : 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
        >
          <Eye className="w-3.5 h-3.5" />Preview
        </a>

        {/* Save state indicator */}
        <div className={cn(
          'flex items-center gap-1.5 text-xs transition-all duration-200',
          saveState === 'idle'   && 'opacity-0',
          saveState === 'saving' && 'text-gray-400',
          saveState === 'saved'  && 'text-emerald-500',
          saveState === 'error'  && 'text-red-500',
        )}>
          {saveState === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
          {saveState === 'saved'  && <Check className="w-3 h-3" />}
          {saveState === 'error'  && <AlertCircle className="w-3 h-3" />}
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error saving' : ''}
        </div>

        {/* Publish / Enable */}
        <button
          onClick={handlePublish}
          disabled={publishing || form.status === 'published'}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white transition-colors"
        >
          {publishing
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Publishing…</>
            : form.status === 'published' ? 'Published' : 'Enable form'
          }
        </button>
      </div>

      {/* ── Three-panel body ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: blocks sidebar */}
        <FormBlocksSidebar onAddBlock={addBlock} selectedStepId={selectedStepId} />

        {/* Center: canvas + step bar */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-950">
          <FormCanvas
            blocks={currentStepBlocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlock={updateBlock}
            onDeleteBlock={deleteBlock}
            onMoveBlock={moveBlock}
            onAddToColumn={addBlockToColumn}
            theme={form.theme}
            formType={form.type}
            previewDevice={previewDevice}
          />
          <FormStepController
            steps={form.steps}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
            onAddStep={addStep}
            onDeleteStep={deleteStep}
          />
        </div>

        {/* Right: Behaviour / Theme */}
        <div className="w-[280px] shrink-0 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
          {/* Tab header */}
          <div className="shrink-0 flex border-b border-gray-200 dark:border-gray-700">
            {(['behaviour', 'theme', 'images'] as RightTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-medium capitalize transition-colors',
                  rightTab === tab
                    ? 'text-gray-900 dark:text-gray-100 border-b-2 border-brand-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                {tab === 'behaviour' ? 'Behaviour' : tab === 'theme' ? 'Theme' : 'Images'}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {rightTab === 'behaviour' && <FormBehaviourPanel behaviour={form.behaviour} onChange={updateBehaviour} />}
            {rightTab === 'theme'     && <FormThemePanel     theme={form.theme}         onChange={updateTheme} />}
            {rightTab === 'images'    && (
              <FormImagesPanel
                theme={form.theme}
                onUpdateTheme={updateTheme}
                selectedBlockId={selectedBlockId}
                blocks={form.blocks}
                onUpdateBlock={updateBlock}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
