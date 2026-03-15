'use client'

import { useState, useEffect } from 'react'
import { Kanban, Plus, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { CreatePipelineModal } from '@/components/sage/create-pipeline-modal'
import { deletePipeline } from '@/app/actions/sage'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { SagePipeline } from '@/lib/types'

const TEMPLATE_COLORS: Record<string, string> = {
  sales:       'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  agency:      'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  consulting:  'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  support:     'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  onboarding:  'bg-brand-50 text-brand-700 dark:bg-[#15A4AE]/10 dark:text-[#15A4AE]',
}

export default function PipelinesPage() {
  const [pipelines,  setPipelines]  = useState<SagePipeline[]>([])
  const [showModal,  setShowModal]  = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [canWrite,   setCanWrite]   = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: membershipRaw } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .limit(1)
        .single()
      if (!membershipRaw) return
      const m = membershipRaw as { workspace_id: string; role: string }
      setCanWrite(m.role !== 'viewer')

      const { data } = await supabase
        .from('sage_pipelines')
        .select('*')
        .eq('workspace_id', m.workspace_id)
        .order('created_at', { ascending: true })

      setPipelines((data ?? []) as SagePipeline[])
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this pipeline and all its deals? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deletePipeline(id)
      setPipelines(prev => prev.filter(p => p.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pipelines</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track deals from lead to close
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Pipeline
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : pipelines.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6">
            <Kanban className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No pipelines yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
            Create your first pipeline to start tracking leads from chat into closed deals.
          </p>
          {canWrite && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Create your first pipeline
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pipelines.map(pipeline => {
            const tc = pipeline.template_type ? TEMPLATE_COLORS[pipeline.template_type] : null
            return (
              <div
                key={pipeline.id}
                className="group bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 p-5 hover:shadow-md transition-shadow flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Kanban className="w-4 h-4 text-brand-600 dark:text-[#15A4AE] shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{pipeline.name}</h3>
                    </div>
                    {pipeline.template_type && tc && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tc}`}>
                        {pipeline.template_type}
                      </span>
                    )}
                  </div>
                  {canWrite && (
                    <button
                      onClick={() => handleDelete(pipeline.id)}
                      disabled={deleting === pipeline.id}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      {deleting === pipeline.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                        : <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      }
                    </button>
                  )}
                </div>

                <Link
                  href={`/sage/pipelines/${pipeline.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-brand-50 dark:hover:bg-[#15A4AE]/10 border dark:border-white/8 hover:border-brand-200 dark:hover:border-[#15A4AE]/30 transition-all group/link"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400 group-hover/link:text-brand-700 dark:group-hover/link:text-[#15A4AE] font-medium transition-colors">
                    Open board
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover/link:text-brand-600 dark:group-hover/link:text-[#15A4AE] transition-colors" />
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <CreatePipelineModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
