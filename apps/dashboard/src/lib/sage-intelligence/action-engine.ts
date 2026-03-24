'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { SageActionPayload, SageActionResult, SageAccessScope } from './types'

async function logAction(
  scope:      SageAccessScope,
  actionType: string,
  inputQuery: string,
  payload:    Record<string, unknown>,
  result:     Record<string, unknown>,
  status:     'success' | 'failed',
  error?:     string,
) {
  const admin = createAdminClient()
  await admin.from('sage_action_logs').insert({
    workspace_id:   scope.workspaceId,
    user_id:        scope.userId,
    action_type:    actionType,
    input_query:    inputQuery,
    action_payload: payload,
    result_payload: result,
    status,
    error_message:  error ?? null,
  })
}

export async function executeSageAction(
  action:     SageActionPayload,
  scope:      SageAccessScope,
  inputQuery: string,
): Promise<SageActionResult> {
  const admin = createAdminClient()
  const { workspaceId, userId } = scope

  try {
    switch (action.type) {

      case 'create_reminder': {
        const p = action.params as {
          title: string
          note?: string
          dueAt: string
          dealId?: string
          contactId?: string
        }
        const { data, error } = await admin
          .from('sage_reminders')
          .insert({
            workspace_id: workspaceId,
            created_by:   userId,
            title:        p.title,
            note:         p.note ?? null,
            due_at:       p.dueAt,
            deal_id:      p.dealId    ?? null,
            contact_id:   p.contactId ?? null,
            is_sent:      false,
          })
          .select('id')
          .single()
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: (data as { id: string }).id }, 'success')
        return {
          success:    true,
          actionType: action.type,
          entityId:   (data as { id: string }).id,
          message:    `Reminder "${p.title}" created for ${p.dueAt}.`,
        }
      }

      case 'create_task': {
        const p = action.params as {
          title: string
          body?: string
          dueAt?: string
          dealId?: string
          type?: string
        }
        const { data, error } = await admin
          .from('sage_deal_activities')
          .insert({
            workspace_id: workspaceId,
            deal_id:      p.dealId ?? null,
            type:         p.type   ?? 'task',
            title:        p.title,
            body:         p.body   ?? null,
            due_at:       p.dueAt  ?? null,
            created_by:   userId,
          })
          .select('id')
          .single()
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: (data as { id: string }).id }, 'success')
        return {
          success:    true,
          actionType: action.type,
          entityId:   (data as { id: string }).id,
          message:    `Task "${p.title}" created.`,
        }
      }

      case 'create_ticket': {
        const p = action.params as {
          title: string
          description?: string
          priority?: string
          contactId?: string
        }
        const { data, error } = await admin
          .from('sage_tickets')
          .insert({
            workspace_id: workspaceId,
            title:        p.title,
            description:  p.description ?? null,
            priority:     p.priority    ?? 'medium',
            status:       'open',
            contact_id:   p.contactId   ?? null,
            owner_id:     userId,
          })
          .select('id')
          .single()
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: (data as { id: string }).id }, 'success')
        return {
          success:    true,
          actionType: action.type,
          entityId:   (data as { id: string }).id,
          message:    `Ticket "${p.title}" created.`,
        }
      }

      case 'convert_to_deal': {
        const p = action.params as {
          entityType:   'contact' | 'conversation' | 'form_submission'
          entityId:     string
          pipelineName?: string
          stageName?:   string
          dealTitle?:   string
          value?:       number
        }

        // 1. Resolve contactId from entity
        let contactId: string | null = null
        let contactName: string      = 'Contact'

        if (p.entityType === 'contact') {
          const { data: c } = await admin
            .from('sage_contacts')
            .select('id, name, email')
            .eq('id', p.entityId)
            .eq('workspace_id', workspaceId)
            .single()
          if (!c) throw new Error('Contact not found')
          contactId   = (c as { id: string }).id
          contactName = (c as { name: string; email: string }).name ?? (c as { email: string }).email ?? 'Contact'

        } else if (p.entityType === 'conversation') {
          const { data: conv } = await admin
            .from('conversations')
            .select('id, contact_id, sage_contacts(name, email)')
            .eq('id', p.entityId)
            .eq('workspace_id', workspaceId)
            .single()
          const row = conv as { contact_id: string | null; sage_contacts: { name: string; email: string } | null } | null
          contactId   = row?.contact_id ?? null
          contactName = row?.sage_contacts?.name ?? row?.sage_contacts?.email ?? 'Lead'

        } else if (p.entityType === 'form_submission') {
          const { data: sub } = await admin
            .from('form_submissions')
            .select('id, contact_id, sage_contacts(name, email)')
            .eq('id', p.entityId)
            .eq('workspace_id', workspaceId)
            .single()
          const row = sub as { contact_id: string | null; sage_contacts: { name: string; email: string } | null } | null
          contactId   = row?.contact_id ?? null
          contactName = row?.sage_contacts?.name ?? row?.sage_contacts?.email ?? 'Lead'
        }

        // 2. Resolve pipeline (by name or default)
        let pipelineId:   string | null = null
        let pipelineName: string        = 'Pipeline'

        if (p.pipelineName) {
          const { data: pipes } = await admin
            .from('sage_pipelines')
            .select('id, name')
            .eq('workspace_id', workspaceId)
            .ilike('name', `%${p.pipelineName}%`)
            .limit(1)
          const pipe = (pipes ?? [])[0] as { id: string; name: string } | undefined
          pipelineId   = pipe?.id   ?? null
          pipelineName = pipe?.name ?? p.pipelineName
        }

        if (!pipelineId) {
          const { data: def } = await admin
            .from('sage_pipelines')
            .select('id, name')
            .eq('workspace_id', workspaceId)
            .eq('is_default', true)
            .limit(1)
            .single()
          pipelineId   = (def as { id: string; name: string } | null)?.id   ?? null
          pipelineName = (def as { id: string; name: string } | null)?.name ?? 'Default'
        }

        if (!pipelineId) {
          const { data: any } = await admin
            .from('sage_pipelines')
            .select('id, name')
            .eq('workspace_id', workspaceId)
            .order('created_at')
            .limit(1)
            .single()
          pipelineId   = (any as { id: string; name: string } | null)?.id   ?? null
          pipelineName = (any as { id: string; name: string } | null)?.name ?? 'Pipeline'
        }

        if (!pipelineId) throw new Error('No pipeline found in workspace')

        // 3. Duplicate check — contact already in this pipeline?
        if (contactId) {
          const { data: existing } = await admin
            .from('sage_deals')
            .select('id, title')
            .eq('workspace_id', workspaceId)
            .eq('contact_id', contactId)
            .eq('pipeline_id', pipelineId)
            .neq('status', 'lost')
            .limit(1)
          if ((existing ?? []).length > 0) {
            const dup = (existing as { id: string; title: string }[])[0]
            await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { duplicate: dup.id }, 'failed', 'duplicate_deal')
            return {
              success:    false,
              actionType: action.type,
              entityId:   dup.id,
              message:    `${contactName} already has an open deal "${dup.title}" in the ${pipelineName} pipeline.`,
              error:      'duplicate_deal',
            }
          }
        }

        // 4. Resolve stage (by name or first stage)
        let stageId:   string | null = null
        let stageName: string        = 'Stage'

        if (p.stageName) {
          const { data: stages } = await admin
            .from('sage_pipeline_stages')
            .select('id, name')
            .eq('pipeline_id', pipelineId)
            .ilike('name', `%${p.stageName}%`)
            .order('position')
            .limit(1)
          const s = (stages ?? [])[0] as { id: string; name: string } | undefined
          stageId   = s?.id   ?? null
          stageName = s?.name ?? p.stageName
        }

        if (!stageId) {
          const { data: firstStage } = await admin
            .from('sage_pipeline_stages')
            .select('id, name')
            .eq('pipeline_id', pipelineId)
            .order('position')
            .limit(1)
            .single()
          stageId   = (firstStage as { id: string; name: string } | null)?.id   ?? null
          stageName = (firstStage as { id: string; name: string } | null)?.name ?? 'Stage 1'
        }

        // 5. Create deal
        const dealTitle = p.dealTitle ?? `Deal — ${contactName}`
        const { data, error } = await admin
          .from('sage_deals')
          .insert({
            workspace_id: workspaceId,
            title:        dealTitle,
            pipeline_id:  pipelineId,
            stage_id:     stageId,
            contact_id:   contactId ?? null,
            owner_id:     userId,
            value:        p.value ?? null,
            status:       'open',
          })
          .select('id')
          .single()
        if (error) throw error

        const dealId = (data as { id: string }).id
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: dealId, pipelineId, stageId }, 'success')
        return {
          success:    true,
          actionType: action.type,
          entityId:   dealId,
          message:    `Deal "${dealTitle}" created in **${pipelineName}** → **${stageName}**.`,
        }
      }

      case 'create_deal': {
        const p = action.params as {
          title: string
          contactId?: string
          pipelineId?: string
          value?: number
        }
        let pipelineId = p.pipelineId
        if (!pipelineId) {
          const { data: pipe } = await admin
            .from('sage_pipelines')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('is_default', true)
            .limit(1)
            .single()
          pipelineId = (pipe as { id: string } | null)?.id
        }
        const { data: stageData } = await admin
          .from('sage_pipeline_stages')
          .select('id')
          .eq('pipeline_id', pipelineId!)
          .order('position')
          .limit(1)
          .single()
        const stageId = (stageData as { id: string } | null)?.id

        const { data, error } = await admin
          .from('sage_deals')
          .insert({
            workspace_id: workspaceId,
            title:        p.title,
            pipeline_id:  pipelineId,
            stage_id:     stageId,
            contact_id:   p.contactId ?? null,
            owner_id:     userId,
            value:        p.value     ?? null,
            status:       'open',
          })
          .select('id')
          .single()
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: (data as { id: string }).id }, 'success')
        return {
          success:    true,
          actionType: action.type,
          entityId:   (data as { id: string }).id,
          message:    `Deal "${p.title}" created.`,
        }
      }

      case 'assign_deal': {
        const p = action.params as { dealId: string; assigneeId: string }
        const { data: updated, error } = await admin
          .from('sage_deals')
          .update({ owner_id: p.assigneeId, updated_at: new Date().toISOString() })
          .eq('id', p.dealId)
          .eq('workspace_id', workspaceId)
          .select('id, owner_id')
        if (error) throw error
        if (!updated || updated.length === 0) {
          throw new Error(`Deal ${p.dealId} not found in workspace or could not be updated`)
        }
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: p.dealId, owner_id: p.assigneeId }, 'success')
        return { success: true, actionType: action.type, entityId: p.dealId, message: 'Deal assigned.' }
      }

      case 'assign_ticket': {
        const p = action.params as { ticketId: string; assigneeId: string }
        const { error } = await admin
          .from('sage_tickets')
          .update({ assigned_to: p.assigneeId })
          .eq('id', p.ticketId)
          .eq('workspace_id', workspaceId)
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, {}, 'success')
        return { success: true, actionType: action.type, entityId: p.ticketId, message: 'Ticket assigned.' }
      }

      case 'move_deal_stage': {
        const p = action.params as { dealId: string; stageId: string }
        const { error } = await admin
          .from('sage_deals')
          .update({ stage_id: p.stageId })
          .eq('id', p.dealId)
          .eq('workspace_id', workspaceId)
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, {}, 'success')
        return { success: true, actionType: action.type, entityId: p.dealId, message: 'Deal moved to new stage.' }
      }

      case 'save_note': {
        const p = action.params as {
          body: string
          entityType?: string
          entityId?: string
          dealId?: string
        }
        const table   = p.entityType === 'ticket' ? 'sage_ticket_activities' : 'sage_deal_activities'
        const idField = p.entityType === 'ticket' ? 'ticket_id' : 'deal_id'
        const entityId = p.dealId ?? p.entityId
        const { data, error } = await admin
          .from(table)
          .insert({
            workspace_id: workspaceId,
            [idField]:    entityId ?? null,
            type:         'note',
            title:        'Note',
            body:         p.body,
            created_by:   userId,
          })
          .select('id')
          .single()
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: (data as { id: string }).id }, 'success')
        return {
          success:    true,
          actionType: action.type,
          entityId:   (data as { id: string }).id,
          message:    'Note saved.',
        }
      }

      case 'create_contact': {
        const p = action.params as {
          name:        string
          email?:      string | null
          phone?:      string | null
          companyName?: string | null
        }
        const { data, error } = await admin
          .from('sage_contacts')
          .insert({
            workspace_id: workspaceId,
            name:         p.name,
            email:        p.email        ?? null,
            phone:        p.phone        ?? null,
            company_name: p.companyName  ?? null,
            source:       'manual',
            contact_type: 'potential_customer',
          })
          .select('id')
          .single()
        if (error) throw error
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, { id: (data as { id: string }).id }, 'success')
        return {
          success:    true,
          actionType: action.type,
          entityId:   (data as { id: string }).id,
          message:    `Contact "${p.name}" created.`,
        }
      }

      case 'draft_reply': {
        // Just logs the draft — actual sending is done via the email UI
        const p = action.params as { to: string; subject?: string; body: string }
        await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, {}, 'success')
        return {
          success:    true,
          actionType: action.type,
          message:    `Draft reply prepared for ${p.to}.`,
        }
      }

      default:
        return {
          success:    false,
          actionType: action.type,
          message:    'Unknown action type.',
          error:      'Unknown action',
        }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logAction(scope, action.type, inputQuery, action.params as Record<string, unknown>, {}, 'failed', msg)
    return {
      success:    false,
      actionType: action.type,
      message:    `Action failed: ${msg}`,
      error:      msg,
    }
  }
}
