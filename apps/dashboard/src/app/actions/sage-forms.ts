'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { triageCreateLead, triageCreateTicket } from './sage-triage'

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

export interface SageForm {
  id:                string
  name:              string
  description:       string | null
  is_active:         boolean
  created_at:        string
  mailchimp_list_id: string | null
}

export interface SageFormSubmission {
  id:                  string
  form_id:             string
  fields:              Record<string, string>
  ai_priority:         'high' | 'medium' | 'low' | null
  ai_summary:          string | null
  ai_insights:         string[] | null
  ai_action:           string | null
  ai_entities:         { name?: string; email?: string; phone?: string; product_interest?: string } | null
  ai_analyzed_at:      string | null
  actioned_at:         string | null
  action_type:         string | null
  created_at:          string
  mailchimp_synced_at: string | null
}

/** Create a new form */
export async function createForm(data: { name: string; description?: string }): Promise<{ form?: SageForm; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).single()
  const workspaceId = (membershipRaw as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: form, error } = await admin
    .from('sage_forms')
    .insert({ workspace_id: workspaceId, name: data.name.trim(), description: data.description?.trim() || null, created_by: user.id })
    .select('id, name, description, is_active, created_at')
    .single()

  if (error || !form) return { error: error?.message ?? 'Failed to create form' }
  revalidatePath('/dashboard')
  return { form: form as SageForm }
}

/** Set a per-form Mailchimp audience list */
export async function updateFormMailchimpList(formId: string, listId: string | null): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_forms')
    .update({ mailchimp_list_id: listId })
    .eq('id', formId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/forms')
  return {}
}

/** Delete a form */
export async function deleteForm(formId: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin.from('sage_forms').delete().eq('id', formId).eq('workspace_id', workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

/** Trigger AI re-analysis of unanalysed submissions for a workspace */
export async function analyzeFormSubmissions(formId?: string): Promise<{ analyzed: number; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { analyzed: 0, error: 'Not authenticated' }

  const API_BASE    = process.env.API_BASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!API_BASE || !SERVICE_KEY) return { analyzed: 0, error: 'API not configured' }

  try {
    const res = await fetch(`${API_BASE}/forms/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-key': SERVICE_KEY },
      body:    JSON.stringify({ workspace_id: workspaceId, form_id: formId }),
    })
    const json = await res.json() as { analyzed?: number; error?: string }
    revalidatePath('/dashboard')
    return { analyzed: json.analyzed ?? 0, error: json.error }
  } catch (err) {
    return { analyzed: 0, error: err instanceof Error ? err.message : 'Request failed' }
  }
}

/** Mark a submission as actioned (lead/ticket/ignored) */
export async function markSubmissionActioned(
  submissionId: string,
  actionType: 'lead' | 'ticket' | 'ignored',
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_form_submissions')
    .update({ actioned_at: new Date().toISOString(), action_type: actionType })
    .eq('id', submissionId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

/** Create a lead from a form submission */
export async function formSubmissionCreateLead(submission: SageFormSubmission): Promise<{ error?: string }> {
  const { fields, ai_entities, ai_summary } = submission
  const entities = ai_entities ?? {}

  const name      = entities.name      ?? fields.name    ?? 'Unknown'
  const email     = entities.email     ?? fields.email   ?? ''
  const company   = fields.company     ?? undefined
  const dealTitle = fields.name ? `${fields.name} — Form Inquiry` : 'Form Inquiry'
  const notes     = ai_summary ?? fields.message ?? undefined

  const result = await triageCreateLead({ name, email, company, dealTitle, notes })
  if (result.error) return { error: result.error }

  return markSubmissionActioned(submission.id, 'lead')
}

/** Create a ticket from a form submission */
export async function formSubmissionCreateTicket(submission: SageFormSubmission): Promise<{ error?: string }> {
  const { fields, ai_entities, ai_summary } = submission
  const entities = ai_entities ?? {}

  const contactName  = entities.name  ?? fields.name  ?? 'Unknown'
  const contactEmail = entities.email ?? fields.email ?? ''
  const title        = fields.name ? `Support: ${fields.name}` : 'Support Request'
  const description  = ai_summary ?? fields.message ?? 'No details provided'

  const result = await triageCreateTicket({ title, description, contactEmail, contactName, priority: 'medium' })
  if (result.error) return { error: result.error }

  return markSubmissionActioned(submission.id, 'ticket')
}
