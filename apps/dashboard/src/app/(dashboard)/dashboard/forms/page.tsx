import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { Metadata } from 'next'
import type { WorkspaceMember } from '@/lib/types'
import type { SageForm, SageFormSubmission } from '@/app/actions/sage-forms'
import { FormsTable, type FormFilters } from '@/components/dashboard/forms-table'
import { SubpageToolbar, type SubpagePreset } from '@/components/dashboard/subpage-toolbar'
import { getAutoSettings } from '@/app/actions/sage-auto-settings'

export const metadata: Metadata = { title: 'Forms' }

function getDateRange(preset: SubpagePreset, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  if (preset === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : null,
      to:   customTo   ? new Date(customTo + 'T23:59:59').toISOString() : null,
    }
  }
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: null }
  }
  if (preset === 'yesterday') {
    const from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0)
    const to   = new Date(now); to.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 7)
    return { from: from.toISOString(), to: null }
  }
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30)
    return { from: from.toISOString(), to: null }
  }
  return { from: null, to: null }
}

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<FormFilters>
}) {
  const [params, autoSettings] = await Promise.all([searchParams, getAutoSettings()])
  const preset = (['today','yesterday','7d','30d','custom'].includes(params.preset ?? '') ? params.preset : 'all') as SubpagePreset
  const { from: dateFrom, to: dateTo } = getDateRange(preset, params.from, params.to)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const membership = membershipRaw as Pick<WorkspaceMember, 'workspace_id'> | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subsQuery = (supabase as any)
    .from('sage_form_submissions')
    .select('id, form_id, fields, ai_priority, ai_summary, ai_insights, ai_action, ai_entities, ai_analyzed_at, actioned_at, action_type, created_at')
    .eq('workspace_id', workspaceId)

  if (dateFrom)        subsQuery = subsQuery.gte('created_at', dateFrom)
  if (dateTo)          subsQuery = subsQuery.lt('created_at', dateTo)
  if (params.form)     subsQuery = subsQuery.eq('form_id', params.form)
  if (params.status === 'pending') {
    subsQuery = subsQuery.is('actioned_at', null)
  } else if (params.status) {
    subsQuery = subsQuery.eq('action_type', params.status)
  }

  subsQuery = subsQuery.order('created_at', { ascending: false }).limit(200)

  const [formsRes, submissionsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('sage_forms').select('id, name, description, is_active, created_at').eq('workspace_id', workspaceId).order('name', { ascending: true }),
    subsQuery,
  ])

  let submissions = (submissionsRes.data ?? []) as SageFormSubmission[]
  const forms     = (formsRes.data       ?? []) as SageForm[]

  // Client-side search filter (name/email from fields or ai_entities)
  if (params.q) {
    const q = params.q.toLowerCase()
    submissions = submissions.filter(s => {
      const name  = (s.ai_entities?.name  ?? s.fields.name  ?? '').toLowerCase()
      const email = (s.ai_entities?.email ?? s.fields.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }

  return (
    <div className="-m-8 flex flex-col h-screen overflow-hidden">
      <SubpageToolbar
        sourceKey="forms"
        preset={preset}
        customFrom={params.from}
        customTo={params.to}
        autoEnabled={autoSettings.forms_auto_enabled}
      />
      <div className="flex-1 overflow-y-auto">
        <FormsTable
          submissions={submissions}
          forms={forms}
          filters={params}
        />
      </div>
    </div>
  )
}
