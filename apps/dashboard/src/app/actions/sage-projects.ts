'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SageProject, SageProjectTask, SageProjectTaskTemplate, SageProjectActivity, SageProjectBoard, SageProjectTemplate, SageTemplateTask, SageProjectType, SageProjectBillingStatus, SageProjectSource } from '@/lib/types'

async function getAuthContext(): Promise<{ workspaceId: string; userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!data) redirect('/login')
  return { workspaceId: (data as { workspace_id: string }).workspace_id, userId: user.id }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(fields: {
  name:            string
  deal_id?:        string
  contact_id?:     string
  company_id?:     string
  project_type?:   SageProjectType
  service_type?:   string
  template_id?:    string
  priority?:       'low' | 'medium' | 'high'
  status?:         'onboarding' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  billing_status?: SageProjectBillingStatus
  is_recurring?:   boolean
  source?:         SageProjectSource
  next_action?:    string
  blocker_flag?:   boolean
  blocker_reason?: string
  start_date?:     string
  due_date?:       string
  value?:          number
  currency?:       string
  notes?:          string
  deliverables?:   string
  board_id?:       string
  stage_id?:       string
}): Promise<{ id?: string; error?: string }> {
  const { workspaceId, userId } = await getAuthContext()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sage_projects')
    .insert({
      workspace_id:    workspaceId,
      owner_id:        userId,
      name:            fields.name.trim(),
      deal_id:         fields.deal_id         ?? null,
      contact_id:      fields.contact_id      ?? null,
      company_id:      fields.company_id      ?? null,
      project_type:    fields.project_type    ?? 'client_work',
      service_type:    fields.service_type    ?? null,
      template_id:     fields.template_id     ?? null,
      priority:        fields.priority        ?? 'medium',
      status:          fields.status          ?? 'onboarding',
      billing_status:  fields.billing_status  ?? 'not_invoiced',
      is_recurring:    fields.is_recurring    ?? false,
      source:          fields.source          ?? null,
      next_action:     fields.next_action     ?? null,
      blocker_flag:    fields.blocker_flag    ?? false,
      blocker_reason:  fields.blocker_reason  ?? null,
      start_date:      fields.start_date      ?? null,
      due_date:        fields.due_date        ?? null,
      value:           fields.value           ?? null,
      currency:        fields.currency        ?? 'USD',
      notes:           fields.notes?.trim()           ?? null,
      deliverables:    fields.deliverables?.trim()    ?? null,
      board_id:        fields.board_id        ?? null,
      stage_id:        fields.stage_id        ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  const projectId = (data as { id: string }).id

  // Log activity
  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'project',
    entity_id:    projectId,
    event_type:   'project_created',
    payload:      { name: fields.name.trim() },
    user_id:      userId,
  })

  // Seed tasks: prefer template_id (new system), fall back to service_type (legacy)
  if (fields.template_id) {
    const { data: tTasks } = await admin
      .from('sage_template_tasks')
      .select('title, description, due_offset_days, order_index')
      .eq('template_id', fields.template_id)
      .order('order_index', { ascending: true })

    if (tTasks && tTasks.length > 0) {
      type TT = { title: string; description: string | null; due_offset_days: number; order_index: number }
      const startDate = fields.start_date ? new Date(fields.start_date) : new Date()
      const rows = (tTasks as TT[]).map(t => {
        const due = new Date(startDate)
        due.setDate(due.getDate() + t.due_offset_days)
        return {
          workspace_id: workspaceId,
          project_id:   projectId,
          title:        t.title,
          description:  t.description ?? null,
          order_index:  t.order_index,
          due_date:     t.due_offset_days > 0 ? due.toISOString().slice(0, 10) : null,
        }
      })
      await admin.from('sage_project_tasks').insert(rows)
    }
  } else if (fields.service_type) {
    const { data: templates } = await admin
      .from('sage_project_task_templates')
      .select('title, description, order_index')
      .eq('service_type', fields.service_type)
      .is('workspace_id', null)
      .order('order_index', { ascending: true })

    if (templates && templates.length > 0) {
      const rows = (templates as SageProjectTaskTemplate[]).map(t => ({
        workspace_id: workspaceId,
        project_id:   projectId,
        title:        t.title,
        description:  t.description ?? null,
        order_index:  t.order_index,
      }))
      await admin.from('sage_project_tasks').insert(rows)
    }
  }

  revalidatePath('/sage/projects')
  return { id: projectId }
}

export async function updateProject(
  projectId: string,
  fields: Partial<{
    name:            string
    project_type:    SageProjectType
    service_type:    string | null
    template_id:     string | null
    status:          'onboarding' | 'active' | 'on_hold' | 'completed' | 'cancelled'
    priority:        'low' | 'medium' | 'high'
    billing_status:  SageProjectBillingStatus
    is_recurring:    boolean
    source:          SageProjectSource | null
    next_action:     string | null
    blocker_flag:    boolean
    blocker_reason:  string | null
    start_date:      string | null
    due_date:        string | null
    value:           number | null
    currency:        string
    notes:           string | null
    deliverables:    string | null
    owner_id:        string | null
    assigned_to:     string[]
    contact_id:      string | null
    company_id:      string | null
  }>
): Promise<{ error?: string }> {
  const { workspaceId, userId } = await getAuthContext()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_projects')
    .update(fields)
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'project',
    entity_id:    projectId,
    event_type:   'project_updated',
    payload:      fields,
    user_id:      userId,
  })

  revalidatePath('/sage/projects')
  revalidatePath(`/sage/projects/${projectId}`)
  return {}
}

export async function deleteProject(projectId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/sage/projects')
  return {}
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function createTask(projectId: string, fields: {
  title:        string
  description?: string
  assigned_to?: string
  priority?:    'low' | 'medium' | 'high'
  due_date?:    string
  order_index?: number
}): Promise<{ id?: string; error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  // Get max order_index for this project
  const { data: maxRow } = await admin
    .from('sage_project_tasks')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextIndex = fields.order_index ?? ((maxRow as { order_index: number } | null)?.order_index ?? -1) + 1

  const { data, error } = await admin
    .from('sage_project_tasks')
    .insert({
      workspace_id: workspaceId,
      project_id:   projectId,
      title:        fields.title.trim(),
      description:  fields.description?.trim() ?? null,
      assigned_to:  fields.assigned_to ?? null,
      priority:     fields.priority    ?? 'medium',
      due_date:     fields.due_date    ?? null,
      order_index:  nextIndex,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/sage/projects/${projectId}`)
  return { id: (data as { id: string }).id }
}

export async function updateTask(
  taskId: string,
  projectId: string,
  fields: Partial<{
    title:        string
    description:  string | null
    assigned_to:  string | null
    status:       'pending' | 'in_progress' | 'completed'
    priority:     'low' | 'medium' | 'high'
    due_date:     string | null
    order_index:  number
    completed_at: string | null
  }>
): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  // Auto-set completed_at when marking completed
  const update = { ...fields }
  if (fields.status === 'completed' && !fields.completed_at) {
    update.completed_at = new Date().toISOString()
  } else if (fields.status && fields.status !== 'completed') {
    update.completed_at = null
  }

  const { error } = await admin
    .from('sage_project_tasks')
    .update(update)
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath(`/sage/projects/${projectId}`)
  return {}
}

export async function deleteTask(taskId: string, projectId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_project_tasks')
    .delete()
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath(`/sage/projects/${projectId}`)
  return {}
}

export async function reorderTasks(
  projectId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const updates = orderedIds.map((id, index) =>
    admin
      .from('sage_project_tasks')
      .update({ order_index: index })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
  )

  await Promise.all(updates)
  revalidatePath(`/sage/projects/${projectId}`)
  return {}
}

// ── Data fetchers (used from server components) ────────────────────────────────

export async function getProjects(): Promise<SageProject[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { data } = await admin
    .from('sage_projects')
    .select('*, contact:sage_contacts(id, name, email), company:sage_companies(id, name)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (data ?? []) as SageProject[]
}

export async function getProject(projectId: string): Promise<SageProject | null> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { data } = await admin
    .from('sage_projects')
    .select('*, contact:sage_contacts(id, name, email), company:sage_companies(id, name), deal:sage_deals(id, title)')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  return data as SageProject | null
}

export async function getProjectTasks(projectId: string): Promise<SageProjectTask[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { data } = await admin
    .from('sage_project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .order('order_index', { ascending: true })

  return (data ?? []) as SageProjectTask[]
}

export async function getTaskTemplates(serviceType: string): Promise<SageProjectTaskTemplate[]> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('sage_project_task_templates')
    .select('*')
    .eq('service_type', serviceType)
    .is('workspace_id', null)
    .order('order_index', { ascending: true })

  return (data ?? []) as SageProjectTaskTemplate[]
}

// Called from deal detail page — converts a won deal into a project
export async function convertDealToProject(dealId: string, fields: {
  name:          string
  service_type?: string
  contact_id?:   string
  company_id?:   string
  value?:        number
  currency?:     string
}): Promise<{ id?: string; error?: string }> {
  return createProject({ ...fields, deal_id: dealId })
}

// ── Project Activities ────────────────────────────────────────────────────────

export type ProjectActivityType = 'note' | 'call' | 'meeting' | 'task'

export async function addProjectActivity(
  projectId: string,
  type:       ProjectActivityType,
  title?:     string,
  body?:      string,
  dueAt?:     string,
): Promise<{ error?: string }> {
  const { workspaceId, userId } = await getAuthContext()
  const admin = createAdminClient()

  const { error } = await admin
    .from('sage_project_activities')
    .insert({
      workspace_id: workspaceId,
      project_id:   projectId,
      type,
      title:        title?.trim() || null,
      body:         body?.trim()  || null,
      due_at:       dueAt         || null,
      created_by:   userId,
    })

  if (error) return { error: error.message }

  await admin.from('sage_activity_log').insert({
    workspace_id: workspaceId,
    entity_type:  'project',
    entity_id:    projectId,
    event_type:   `${type}_added`,
    payload:      { type, title: title?.trim() || null },
    user_id:      userId,
  })

  revalidatePath(`/sage/projects/${projectId}`)
  return {}
}

export async function completeProjectActivity(activityId: string, projectId: string): Promise<void> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  await admin
    .from('sage_project_activities')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', activityId)
    .eq('workspace_id', workspaceId)

  revalidatePath(`/sage/projects/${projectId}`)
}

export async function getProjectActivities(projectId: string): Promise<SageProjectActivity[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { data } = await admin
    .from('sage_project_activities')
    .select('*')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return (data ?? []) as SageProjectActivity[]
}

// ── Project Boards ─────────────────────────────────────────────────────────

export async function getProjectBoards(): Promise<SageProjectBoard[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_project_boards')
    .select('*, stages:sage_project_board_stages(id, name, color, position)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  return (data ?? []) as SageProjectBoard[]
}

export async function getProjectBoard(boardId: string): Promise<SageProjectBoard | null> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_project_boards')
    .select('*, stages:sage_project_board_stages(id, name, color, position)')
    .eq('id', boardId)
    .eq('workspace_id', workspaceId)
    .single()
  if (!data) return null
  const board = data as SageProjectBoard
  if (board.stages) board.stages = board.stages.sort((a, b) => a.position - b.position)
  return board
}

export async function createProjectBoard(fields: {
  name:        string
  description?: string
  stages?:     string[]  // stage names
}): Promise<{ id?: string; error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sage_project_boards')
    .insert({ workspace_id: workspaceId, name: fields.name.trim(), description: fields.description?.trim() ?? null })
    .select('id')
    .single()

  if (error) return { error: error.message }
  const boardId = (data as { id: string }).id

  const defaultStages = fields.stages?.filter(s => s.trim()) ?? ['To Do', 'In Progress', 'Review', 'Done']
  await admin.from('sage_project_board_stages').insert(
    defaultStages.map((name, i) => ({ board_id: boardId, name: name.trim(), position: i, color: '#6b7280' }))
  )

  revalidatePath('/sage/projects')
  return { id: boardId }
}

export async function deleteProjectBoard(boardId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_project_boards')
    .delete()
    .eq('id', boardId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/sage/projects')
  return {}
}

export async function updateBoardStages(boardId: string, stages: { name: string; color?: string }[]): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  // Verify ownership
  const { data: board } = await admin.from('sage_project_boards').select('id').eq('id', boardId).eq('workspace_id', workspaceId).single()
  if (!board) return { error: 'Board not found' }

  // Get existing stage colors
  const { data: existing } = await admin.from('sage_project_board_stages').select('name, color').eq('board_id', boardId)
  const colorMap: Record<string, string> = {}
  for (const s of existing ?? []) colorMap[s.name] = s.color

  await admin.from('sage_project_board_stages').delete().eq('board_id', boardId)
  const filtered = stages.filter(s => s.name.trim())
  if (filtered.length > 0) {
    await admin.from('sage_project_board_stages').insert(
      filtered.map((s, i) => ({ board_id: boardId, name: s.name.trim(), position: i, color: s.color ?? colorMap[s.name] ?? '#6b7280' }))
    )
  }

  revalidatePath('/sage/projects')
  revalidatePath(`/sage/projects/board/${boardId}`)
  return {}
}

export async function moveProjectToStage(projectId: string, boardId: string, stageId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_projects')
    .update({ board_id: boardId, stage_id: stageId })
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath(`/sage/projects/board/${boardId}`)
  return {}
}

export async function getProjectsByBoard(boardId: string): Promise<SageProject[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_projects')
    .select('*, contact:sage_contacts(id, name, email), company:sage_companies(id, name)')
    .eq('workspace_id', workspaceId)
    .eq('board_id', boardId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as SageProject[]
}

// ── Project Templates ──────────────────────────────────────────────────────────

export async function getProjectTemplates(): Promise<SageProjectTemplate[]> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_project_templates')
    .select('*, tasks:sage_template_tasks(id, title, description, default_assignee_role, due_offset_days, order_index)')
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  return (data ?? []) as SageProjectTemplate[]
}

export async function getProjectTemplate(templateId: string): Promise<SageProjectTemplate | null> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_project_templates')
    .select('*, tasks:sage_template_tasks(id, title, description, default_assignee_role, due_offset_days, order_index)')
    .eq('id', templateId)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .single()
  if (!data) return null
  const tpl = data as SageProjectTemplate
  if (tpl.tasks) tpl.tasks = tpl.tasks.sort((a, b) => a.order_index - b.order_index)
  return tpl
}

export async function createProjectTemplate(fields: {
  name:         string
  project_type: SageProjectType
  description?: string
  tasks?:       { title: string; description?: string; due_offset_days?: number; default_assignee_role?: 'owner' | 'team_member' | 'custom' }[]
}): Promise<{ id?: string; error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sage_project_templates')
    .insert({
      workspace_id: workspaceId,
      name:         fields.name.trim(),
      project_type: fields.project_type,
      description:  fields.description?.trim() ?? null,
      is_default:   false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  const templateId = (data as { id: string }).id

  if (fields.tasks && fields.tasks.length > 0) {
    await admin.from('sage_template_tasks').insert(
      fields.tasks.map((t, i) => ({
        template_id:           templateId,
        title:                 t.title.trim(),
        description:           t.description?.trim() ?? null,
        due_offset_days:       t.due_offset_days       ?? 0,
        default_assignee_role: t.default_assignee_role ?? 'owner',
        order_index:           i,
      }))
    )
  }

  revalidatePath('/sage/projects')
  return { id: templateId }
}

export async function updateProjectTemplate(
  templateId: string,
  fields: {
    name?:        string
    description?: string | null
    tasks?:       { title: string; description?: string; due_offset_days?: number; default_assignee_role?: 'owner' | 'team_member' | 'custom' }[]
  }
): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()

  if (fields.name !== undefined || fields.description !== undefined) {
    const { error } = await admin
      .from('sage_project_templates')
      .update({
        ...(fields.name        !== undefined && { name:        fields.name.trim() }),
        ...(fields.description !== undefined && { description: fields.description?.trim() ?? null }),
      })
      .eq('id', templateId)
      .eq('workspace_id', workspaceId)

    if (error) return { error: error.message }
  }

  if (fields.tasks) {
    await admin.from('sage_template_tasks').delete().eq('template_id', templateId)
    if (fields.tasks.length > 0) {
      await admin.from('sage_template_tasks').insert(
        fields.tasks.map((t, i) => ({
          template_id:           templateId,
          title:                 t.title.trim(),
          description:           t.description?.trim() ?? null,
          due_offset_days:       t.due_offset_days       ?? 0,
          default_assignee_role: t.default_assignee_role ?? 'owner',
          order_index:           i,
        }))
      )
    }
  }

  revalidatePath('/sage/projects')
  return {}
}

export async function deleteProjectTemplate(templateId: string): Promise<{ error?: string }> {
  const { workspaceId } = await getAuthContext()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_project_templates')
    .delete()
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)  // cannot delete global templates
  if (error) return { error: error.message }
  revalidatePath('/sage/projects')
  return {}
}
