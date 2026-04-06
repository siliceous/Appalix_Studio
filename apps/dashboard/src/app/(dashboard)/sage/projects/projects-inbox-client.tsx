'use client'

import { useState } from 'react'
import {
  FolderKanban, Plus, Trash2, Loader2, Activity,
  Clock, X, GripVertical, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { createProjectBoard, deleteProjectBoard } from '@/app/actions/sage-projects'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { CsvImportButton } from '@/components/ui/csv-import-button'
import { exportProjects } from '@/app/actions/csv-export'
import { importProjects } from '@/app/actions/csv-import'
import { timeAgo } from '@/lib/utils'
import type { SageActivityLog, SageProjectBoard, SageProjectBoardStage } from '@/lib/types'

type BoardWithMeta = SageProjectBoard & {
  stages:        SageProjectBoardStage[]
  project_count: number
}

interface Props {
  boards:   BoardWithMeta[]
  activity: SageActivityLog[]
}

const DEFAULT_STAGES = ['To Do', 'In Progress', 'Review', 'Done']

function eventLabel(type: string) {
  const map: Record<string, string> = {
    project_created: 'Project created',
    project_updated: 'Project updated',
    stage_changed:   'Project moved to new stage',
    task_completed:  'Task completed',
  }
  return map[type] ?? type.replace(/_/g, ' ')
}

export function ProjectsInboxClient({ boards: initialBoards, activity }: Props) {
  const [boards,       setBoards]       = useState(initialBoards)
  const [showNew,      setShowNew]      = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [activityOpen, setActivityOpen] = useState(true)
  const [creating,     setCreating]     = useState(false)
  const [formError,    setFormError]    = useState('')
  const [boardName,    setBoardName]    = useState('')
  const [boardDesc,    setBoardDesc]    = useState('')
  const [stages,       setStages]       = useState<string[]>([...DEFAULT_STAGES])

  function addStage() { setStages(prev => [...prev, '']) }
  function removeStage(i: number) { setStages(prev => prev.filter((_, idx) => idx !== i)) }
  function updateStage(i: number, val: string) { setStages(prev => prev.map((s, idx) => idx === i ? val : s)) }
  function resetForm() { setBoardName(''); setBoardDesc(''); setStages([...DEFAULT_STAGES]); setFormError('') }

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!boardName.trim()) { setFormError('Board name is required'); return }
    setCreating(true); setFormError('')
    try {
      const filtered = stages.filter(s => s.trim())
      const result = await createProjectBoard({ name: boardName, description: boardDesc || undefined, stages: filtered.length ? filtered : undefined })
      if (result.error) { setFormError(result.error); setCreating(false); return }
      const newBoard: BoardWithMeta = {
        id:            result.id!,
        workspace_id:  '',
        name:          boardName.trim(),
        description:   boardDesc.trim() || null,
        created_at:    new Date().toISOString(),
        project_count: 0,
        stages: (filtered.length ? filtered : DEFAULT_STAGES).map((name, i) => ({
          id: `temp-${i}`, board_id: result.id!, name, color: '#6b7280', position: i, created_at: new Date().toISOString(),
        })),
      }
      setBoards(prev => [...prev, newBoard])
      setShowNew(false)
      resetForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(boardId: string) {
    if (!confirm('Delete this board? Projects will be unassigned but not deleted.')) return
    setDeleting(boardId)
    await deleteProjectBoard(boardId)
    setBoards(prev => prev.filter(b => b.id !== boardId))
    setDeleting(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Page heading ── */}
      <div className="shrink-0 pl-9 pt-5 pb-3 pr-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Projects</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Organise work across boards and track progress through every stage</p>
      </div>

    <div className="flex-1 min-h-0 flex gap-3 px-3 pb-3">

      {/* ── Left: Project Boards ─────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/60 dark:border-white/8 overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_30px_-5px_rgba(0,0,0,0.12),0_1px_0px_rgba(255,255,255,0.8)_inset] dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_20px_40px_-10px_rgba(0,0,0,0.5),0_1px_0px_rgba(255,255,255,0.04)_inset]">
        <div className="px-4 py-2.5 bg-[#141c2b] border-b border-white/10 flex items-center justify-between shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.35),0_1px_0px_rgba(255,255,255,0.06)_inset]">
          <div>
            <h2 className="text-sm font-bold text-white">Project Boards</h2>
            <p className="text-[11px] text-white/50 mt-0.5">{boards.length} board{boards.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors border border-white/20"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FolderKanban className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-xs text-gray-400">No boards yet.</p>
              <p className="text-[11px] text-gray-400 mt-1">Create one to organise projects.</p>
            </div>
          ) : boards.map(board => (
            <Link
              key={board.id}
              href={`/sage/projects/board/${board.id}`}
              className="group block rounded-xl border border-gray-100 dark:border-white/8 bg-white dark:bg-[#232323] shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12),0_6px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FolderKanban className="w-3.5 h-3.5 text-[#15A4AE] shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{board.name}</span>
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); handleDelete(board.id) }}
                    disabled={deleting === board.id}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0"
                  >
                    {deleting === board.id
                      ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                      : <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />}
                  </button>
                </div>
                {board.description && (
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 ml-5">{board.description}</p>
                )}
                {board.stages.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 ml-5">
                    {board.stages.slice(0, 3).map(s => (
                      <span key={s.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                        {s.name}
                      </span>
                    ))}
                    {board.stages.length > 3 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-400">
                        +{board.stages.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-2 ml-5">
                  {board.project_count} project{board.project_count !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Center ───────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#232323] rounded-2xl border border-gray-200/60 dark:border-white/8 overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_30px_-5px_rgba(0,0,0,0.12),0_1px_0px_rgba(255,255,255,0.8)_inset] dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_20px_40px_-10px_rgba(0,0,0,0.5),0_1px_0px_rgba(255,255,255,0.04)_inset]">
        <div className="shrink-0 bg-[#141c2b] border-b border-white/10 px-6 py-3 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.35),0_1px_0px_rgba(255,255,255,0.06)_inset]">
          <div>
            <h2 className="text-sm font-semibold text-white">Project Boards</h2>
            <p className="text-xs text-white/50 mt-0.5">Select a board from the left to open it</p>
          </div>
          <div className="flex items-center gap-1.5">
            <CsvExportButton action={exportProjects} label="Export CSV" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors border border-white/20" />
            <CsvImportButton action={importProjects} label="Import CSV" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors border border-white/20" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-6">
          <div className="text-center">
            <FolderKanban className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">All caught up</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">Every project is assigned to a board. New projects without a board will appear here.</p>
          </div>
        </div>
      </main>

      {/* ── Right: Activity ───────────────────────────────── */}
      {activityOpen ? (
        <aside className="w-64 shrink-0 flex flex-col overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-[#242424] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)] border border-gray-200/70 dark:border-white/8">
            <div className="px-3 py-2.5 bg-[#141c2b] border-b border-white/10 flex items-center justify-between shrink-0 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white/70" />
                <h3 className="text-xs font-semibold text-white">Activity</h3>
              </div>
              <button
                onClick={() => setActivityOpen(false)}
                className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y dark:divide-white/8 flex-1 overflow-y-auto">
              {activity.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">No activity yet.</p>
              ) : activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#15A4AE] mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-snug">{eventLabel(a.event_type)}</p>
                    {a.payload && typeof a.payload === 'object' && 'name' in a.payload && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {String((a.payload as Record<string, unknown>).name)}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                      <Clock className="w-2.5 h-2.5" /> {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      ) : (
        <div
          className="w-8 shrink-0 bg-[#f5f4f1] dark:bg-[#1c1c1c] flex flex-col items-center py-4 gap-3 cursor-pointer hover:bg-[#ede9e2] dark:hover:bg-white/4 transition-colors"
          onClick={() => setActivityOpen(true)}
          title="Show activity"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span
            className="text-[10px] text-gray-400 font-medium select-none"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.05em' }}
          >
            Activity
          </span>
        </div>
      )}

      {/* New Board Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border dark:border-white/10 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-8 py-5 border-b dark:border-white/8">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Project Board</h2>
                <p className="text-xs text-gray-400 mt-0.5">Define the board name and the stages projects will move through</p>
              </div>
              <button onClick={() => { setShowNew(false); resetForm() }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-2 divide-x dark:divide-white/8">
                <div className="px-8 py-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Board name *</label>
                    <input
                      autoFocus type="text" value={boardName} onChange={e => setBoardName(e.target.value)}
                      placeholder="e.g. Client Delivery, Internal Projects"
                      className="w-full px-3 py-2.5 text-sm border dark:border-white/10 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Description <span className="font-normal text-gray-400">(optional)</span></label>
                    <textarea
                      value={boardDesc} onChange={e => setBoardDesc(e.target.value)} rows={3}
                      placeholder="What kind of projects go here?"
                      className="w-full px-3 py-2.5 text-sm border dark:border-white/10 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
                    />
                  </div>
                </div>
                <div className="px-8 py-6 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Stages</label>
                    <span className="text-[10px] text-gray-400">click to rename · × to remove</span>
                  </div>
                  <div className="flex-1 space-y-2 max-h-56 overflow-y-auto pr-1">
                    {stages.map((stage, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                        <span className="text-xs text-gray-300 dark:text-gray-600 w-4 text-right shrink-0">{i + 1}</span>
                        <input
                          type="text" value={stage} onChange={e => updateStage(i, e.target.value)}
                          placeholder="Stage name"
                          className="flex-1 px-3 py-2 text-sm border dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
                        />
                        <button type="button" onClick={() => removeStage(i)} disabled={stages.length <= 1}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-20">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addStage}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#15A4AE] hover:opacity-80 transition-opacity">
                    <Plus className="w-3.5 h-3.5" /> Add Stage
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-8 py-4 border-t dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] rounded-b-2xl">
                {formError ? <p className="text-xs text-red-500">{formError}</p> : <span />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowNew(false); resetForm() }}
                    className="px-5 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex items-center gap-2 px-5 py-2 text-sm bg-[#15A4AE] hover:bg-[#128a93] text-white font-semibold rounded-xl transition-colors disabled:opacity-60">
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {creating ? 'Creating…' : 'Create Board'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
