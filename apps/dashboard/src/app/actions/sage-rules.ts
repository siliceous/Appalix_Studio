'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export type RuleChannel   = 'email' | 'bots' | 'forms' | 'tickets' | 'any'
export type RuleAction    = 'create_lead' | 'create_ticket' | 'ignore'
export type ConditionField = 'priority' | 'content' | 'channel'
export type ConditionOp   = 'eq' | 'contains' | 'not_contains'

export interface RuleCondition {
  field: ConditionField
  op:    ConditionOp
  value: string
}

export interface SageRule {
  id:            string
  workspace_id:  string
  name:          string
  enabled:       boolean
  channel:       RuleChannel
  conditions:    RuleCondition[]
  action_type:   RuleAction
  pipeline_id:   string | null
  notify_owner:  boolean
  rule_priority: number
  created_at:    string
}

export type NewRule = Omit<SageRule, 'id' | 'workspace_id' | 'created_at'>

async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

export async function getRules(): Promise<SageRule[]> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('sage_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('rule_priority', { ascending: false })
    .order('created_at',    { ascending: true })

  return (data ?? []) as SageRule[]
}

export async function createRule(rule: NewRule): Promise<SageRule | null> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sage_rules')
    .insert({ ...rule, workspace_id: workspaceId })
    .select()
    .single()

  if (error) {
    console.error('[sage-rules] createRule error:', error.message)
    return null
  }
  return data as SageRule
}

export async function updateRule(id: string, patch: Partial<NewRule>): Promise<void> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return

  const admin = createAdminClient()
  await admin
    .from('sage_rules')
    .update(patch)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
}

export async function deleteRule(id: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return

  const admin = createAdminClient()
  await admin
    .from('sage_rules')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
}

export async function toggleRule(id: string, enabled: boolean): Promise<void> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return

  const admin = createAdminClient()
  await admin
    .from('sage_rules')
    .update({ enabled })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
}
