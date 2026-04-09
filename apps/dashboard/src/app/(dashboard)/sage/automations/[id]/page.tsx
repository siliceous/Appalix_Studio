import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { MonitorClient } from './monitor-client'
import type { AutomationExecutionRow, AutomationStepState } from '@/lib/types'

export const metadata: Metadata = { title: 'Execution Monitor · Sage' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function MonitorPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const admin = createAdminClient()

  // Fetch execution
  const { data: execRaw } = await admin
    .from('automation_executions')
    .select('*')
    .eq('id', id)
    .single()

  if (!execRaw) notFound()

  type RawExec = {
    id: string; workspace_id: string; template_id: string | null; contact_id: string | null
    deal_id: string | null; lead_automation_id: string | null; trigger_type: string
    status: string; current_step_id: string | null; step_count: number
    next_step_at: string | null; completed_at: string | null; failed_at: string | null
    stopped_at: string | null; failure_reason: string | null; output_summary: Record<string, unknown>
    created_at: string; updated_at: string
  }

  const exec = execRaw as RawExec

  // Parallel fetch: contact, template, step executions
  const [contactRes, templateRes, stepExecsRes] = await Promise.all([
    exec.contact_id
      ? admin.from('sage_contacts').select('id, name, email, phone, company_name').eq('id', exec.contact_id).single()
      : { data: null },
    exec.template_id
      ? admin.from('automation_templates').select('id, name, steps, entry_step_id, automation_type').eq('id', exec.template_id).single()
      : { data: null },
    admin
      .from('automation_step_executions')
      .select('step_id, step_type, step_label, status, started_at, completed_at, resume_at, output_data, error_data, attempt')
      .eq('execution_id', id)
      .order('created_at', { ascending: true }),
  ])

  const contact = contactRes.data as { id: string; name: string; email: string | null; phone: string | null; company_name: string | null } | null

  type RawStep = { id: string; type: string; label?: string; delay_hours?: number; next_step_id?: string; branch_yes_id?: string; branch_no_id?: string; config?: Record<string, unknown> }
  type RawTemplate = { id: string; name: string; steps: Array<RawStep>; entry_step_id: string | null; automation_type: string }
  const template = templateRes.data as RawTemplate | null

  type RawStepExec = { step_id: string; step_type: string; step_label: string | null; status: string; started_at: string | null; completed_at: string | null; resume_at: string | null; output_data: Record<string, unknown>; error_data: Record<string, unknown> | null; attempt: number }
  const stepExecs = (stepExecsRes.data ?? []) as RawStepExec[]

  const execMap = new Map<string, RawStepExec>()
  for (const se of stepExecs) execMap.set(se.step_id, se)

  // Walk template steps
  let steps: AutomationStepState[] = []
  if (template?.steps) {
    const stepById = new Map<string, RawStep>(template.steps.map((st) => [st.id, st] as [string, RawStep]))
    const entryId = template.entry_step_id ?? template.steps[0]?.id
    const visited = new Set<string>()
    let cursor: string | undefined = entryId

    while (cursor && stepById.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor)
      const s: RawStep = stepById.get(cursor)!
      const se = execMap.get(s.id)
      const isCurrent = s.id === exec.current_step_id

      let status: AutomationStepState['status'] = 'pending'
      if (se)         status = se.status as AutomationStepState['status']
      else if (isCurrent) status = exec.status === 'waiting' ? 'waiting' : 'running'

      const branch_taken: 'yes' | 'no' | null = s.type === 'condition'
        ? ((se?.output_data?.branch_taken ?? null) as 'yes' | 'no' | null)
        : null

      steps.push({
        id: s.id, type: s.type, label: s.label ?? s.type,
        delay_hours: s.delay_hours ?? 0, status, isCurrent,
        completed_at: se?.completed_at ?? null,
        resume_at: se?.resume_at ?? null,
        output_data: se?.output_data ?? {},
        error_data: se?.error_data ?? null,
        branch_yes_id: s.branch_yes_id ?? null,
        branch_no_id: s.branch_no_id ?? null,
        branch_taken, config: s.config ?? {},
      })

      if (s.type === 'condition') {
        cursor = branch_taken === 'no' ? s.branch_no_id : (s.branch_yes_id ?? s.next_step_id)
      } else {
        cursor = s.next_step_id
      }
    }
  }

  const execRow: AutomationExecutionRow = {
    id:                 exec.id,
    workspace_id:       exec.workspace_id,
    template_id:        exec.template_id,
    template_name:      template?.name ?? null,
    contact_id:         exec.contact_id,
    contact_name:       contact?.name ?? null,
    contact_email:      contact?.email ?? null,
    deal_id:            exec.deal_id,
    lead_automation_id: exec.lead_automation_id,
    trigger_type:       exec.trigger_type,
    status:             exec.status,
    current_step_id:    exec.current_step_id,
    step_count:         exec.step_count,
    next_step_at:       exec.next_step_at,
    completed_at:       exec.completed_at,
    failed_at:          exec.failed_at,
    created_at:         exec.created_at,
    updated_at:         exec.updated_at,
  }

  return (
    <MonitorClient
      exec={execRow}
      contact={contact}
      templateName={template?.name ?? null}
      automationType={(template?.automation_type ?? null) as string | null}
      steps={steps}
      triggerType={exec.trigger_type}
      failureReason={exec.failure_reason}
    />
  )
}
