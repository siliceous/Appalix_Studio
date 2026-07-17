'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, Plus, Trash2, ArrowRight, Loader2, X, GripVertical } from 'lucide-react'
import type { SageProjectBoard } from '@/lib/types'
import { createProjectBoard, deleteProjectBoard } from '@/app/actions/sage-projects'

interface Props {
  boards: SageProjectBoard[]
}

const DEFAULT_STAGES = ['To Do', 'In Progress', 'Review', 'Done']

export function ProjectBoardsClient({ boards: initialBoards }: Props) {
  const router = useRouter()
  const [boards,    setBoards]    = useState(initialBoards)
  const [showNew,   setShowNew]   = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [creating,  setCreating]  = useState(false)
  const [formError, setFormError] = useState('')

  // New board form state
  const [boardName, setBoardName] = useState('')
  const [boardDesc, setBoardDesc] = useState('')
  const [stages,    setStages]    = useState<string[]>([...DEFAULT_STAGES])

  function addStage() { setStages(prev => [...prev, '']) }
  function removeStage(i: number) { setStages(prev => prev.filter((_, idx) => idx !== i)) }
  function updateStage(i: number, val: string) { setStages(prev => prev.map((s, idx) => idx === i ? val : s)) }

  function resetForm() {
    setBoardName(''); setBoardDesc(''); setStages([...DEFAULT_STAGES]); setFormError('')
  }

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!boardName.trim()) { setFormError('Board name is required'); return }
    setCreating(true)
    setFormError('')
    try {
      const filtered = stages.filter(s => s.trim())
      const result = await createProjectBoard({ name: boardName, description: boardDesc || undefined, stages: filtered.length ? filtered : undefined })
      if (result.error) { setFormError(result.error); setCreating(false); return }
      // Update local state immediately — no manual refresh needed
      const newBoard = {
        id:           result.id!,
        workspace_id: '',
        name:         boardName.trim(),
        description:  boardDesc.trim() || null,
        created_at:   new Date().toISOString(),
        stages:       (filtered.length ? filtered : DEFAULT_STAGES).map((name, i) => ({
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
    <div className="p-8 max-w-5xl mx-auto relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage client delivery across multiple project boards</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#15A4AE] hover:bg-[#128a93] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6">
            <FolderKanban className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No project boards yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
            Create a board to organise projects into stages — like a pipeline for delivery work.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#15A4AE] hover:bg-[#128a93] text-white font-medium rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Create your first board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {boards.map(board => (
            <div key={board.id} className="group bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FolderKanban className="w-4 h-4 text-[#15A4AE] shrink-0" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{board.name}</h3>
                  </div>
                  {board.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{board.description}</p>
                  )}
                  {board.stages && board.stages.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {board.stages.slice(0, 4).map(s => (
                        <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
                          {s.name}
                        </span>
                      ))}
                      {board.stages.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/8 text-gray-400">+{board.stages.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(board.id)}
                  disabled={deleting === board.id}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                >
                  {deleting === board.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    : <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />}
                </button>
              </div>

              <Link
                href={`/sage/projects/board/${board.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-[#15A4AE]/8 dark:hover:bg-[#15A4AE]/10 border dark:border-white/8 hover:border-[#15A4AE]/20 dark:hover:border-[#15A4AE]/30 transition-all group/link"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover/link:text-[#15A4AE] font-medium transition-colors">Open board</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover/link:text-[#15A4AE] transition-colors" />
              </Link>
            </div>
          ))}
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

                {/* Left — name + description */}
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

                {/* Right — stages */}
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

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-8 py-4 border-t dark:border-white/8 bg-gray-50 dark:bg-white/[0.02] rounded-b-2xl">
                {formError
                  ? <p className="text-xs text-red-500">{formError}</p>
                  : <span />
                }
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
  )
}

