/**
 * Sage Rules Engine
 *
 * Evaluates workspace automation rules against an incoming item (email, bot
 * conversation, form submission, or ticket) and returns the first matching rule.
 *
 * Rule conditions are evaluated with AND logic — all conditions must pass.
 * Rules are ordered by rule_priority DESC, then created_at ASC (first-write wins
 * when two rules share the same priority).
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type RuleChannel = 'email' | 'bots' | 'forms' | 'tickets' | 'any'
export type RuleActionType = 'create_lead' | 'create_ticket' | 'ignore'
export type ConditionField = 'priority' | 'content' | 'channel'
export type ConditionOp = 'eq' | 'contains' | 'not_contains'

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
  action_type:   RuleActionType
  pipeline_id:   string | null
  notify_owner:  boolean
  rule_priority: number
  created_at:    string
}

export interface RuleMatchInput {
  channel:   'email' | 'bots' | 'forms' | 'tickets'
  priority?: string | null  // 'high' | 'medium' | 'low'
  content?:  string | null  // AI summary / subject / title
}

/** Evaluates a single rule against an input item. Returns true if all conditions pass. */
export function evaluateRule(rule: SageRule, input: RuleMatchInput): boolean {
  if (!rule.enabled) return false
  if (rule.channel !== 'any' && rule.channel !== input.channel) return false

  for (const cond of rule.conditions) {
    const expected = cond.value.toLowerCase().trim()

    if (cond.field === 'priority') {
      const actual = (input.priority ?? '').toLowerCase().trim()
      if (cond.op === 'eq'          && actual !== expected) return false
      if (cond.op === 'contains'    && !actual.includes(expected)) return false
      if (cond.op === 'not_contains' && actual.includes(expected)) return false
    }

    if (cond.field === 'content') {
      const actual = (input.content ?? '').toLowerCase()
      if (cond.op === 'eq'          && actual !== expected) return false
      if (cond.op === 'contains'    && !actual.includes(expected)) return false
      if (cond.op === 'not_contains' && actual.includes(expected)) return false
    }

    if (cond.field === 'channel') {
      const actual = input.channel.toLowerCase()
      if (cond.op === 'eq'          && actual !== expected) return false
      if (cond.op === 'contains'    && !actual.includes(expected)) return false
      if (cond.op === 'not_contains' && actual.includes(expected)) return false
    }
  }

  return true
}

/**
 * Fetches all enabled rules for a workspace and returns the first one that matches
 * the given input. Returns null if no rule matches (use default settings instead).
 */
export async function findMatchingRule(
  supabase: SupabaseClient,
  workspaceId: string,
  input: RuleMatchInput,
): Promise<SageRule | null> {
  const { data: rules, error } = await supabase
    .from('sage_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .order('rule_priority', { ascending: false })
    .order('created_at',    { ascending: true  })

  if (error || !rules) return null

  for (const rule of rules as SageRule[]) {
    if (evaluateRule(rule, input)) return rule
  }

  return null
}
