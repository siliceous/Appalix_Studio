'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const API_BASE    = process.env.API_BASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

/**
 * Rename a bot conversation title.
 * Also updates the linked contact's name and their tickets' name field.
 */
export async function renameConversation(
  conversationId: string,
  title:          string,
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const newTitle = title.trim() || null

  // Update the conversation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('conversations')
    .update({ title: newTitle })
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  // Cascade to linked contact + their tickets
  if (newTitle) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: linkedContacts } = await (admin as any)
      .from('sage_contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_conversation_id', conversationId)

    if (linkedContacts && linkedContacts.length > 0) {
      const contactIds = (linkedContacts as { id: string }[]).map(c => c.id)

      await Promise.all([
        // Update contact names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin as any).from('sage_contacts').update({ name: newTitle }).eq('workspace_id', workspaceId).in('id', contactIds),
        // Update ticket name field (denormalised)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin as any).from('sage_tickets').update({ name: newTitle }).eq('workspace_id', workspaceId).in('contact_id', contactIds),
      ])
    }
  }

  revalidatePath('/dashboard')
  return {}
}

/**
 * Delete bot conversations by ID (scoped to the workspace).
 * Also deletes linked tickets (via contacts whose source_conversation_id matches).
 */
export async function deleteConversations(
  conversationIds: string[],
): Promise<{ error?: string }> {
  if (!conversationIds.length) return {}

  const supabase    = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fetch names before deleting for activity log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: convRows } = await (admin as any)
    .from('conversations').select('id, title, ai_entities').in('id', conversationIds).eq('workspace_id', workspaceId)
  type CR = { id: string; title?: string | null; ai_entities?: { name?: string } | null }
  const convNames = ((convRows ?? []) as CR[]).map(c => c.ai_entities?.name ?? c.title ?? null).filter(Boolean)

  // Find contacts linked to these conversations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: linkedContacts } = await (admin as any)
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .in('source_conversation_id', conversationIds)

  const deletedAt = new Date().toISOString()

  if (linkedContacts && linkedContacts.length > 0) {
    const contactIds = (linkedContacts as { id: string }[]).map(c => c.id)
    // Soft-delete tickets linked to those contacts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('sage_tickets')
      .update({ deleted_at: deletedAt })
      .eq('workspace_id', workspaceId)
      .in('contact_id', contactIds)
  }

  // Soft-delete the conversations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('conversations')
    .update({ deleted_at: deletedAt })
    .in('id', conversationIds)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  if (user) {
    await admin.from('sage_activity_log').insert({
      workspace_id: workspaceId,
      entity_type:  'conversation',
      entity_id:    conversationIds[0],
      event_type:   'conversation_deleted',
      payload:      { names: convNames, count: conversationIds.length, source: 'bot' },
      user_id:      user.id,
    })
  }

  revalidatePath('/dashboard')
  return {}
}

/**
 * Trigger AI analysis for bot conversations in the workspace.
 * If conversationIds is provided, only those conversations are re-analysed.
 * Otherwise, analyses up to batchSize conversations that have never been processed.
 */
export async function analyzeConversations(
  batchSize        = 50,
  conversationIds?: string[],
): Promise<{ analyzed: number; error?: string }> {
  if (!API_BASE || !SERVICE_KEY) return { analyzed: 0, error: 'Server not configured' }

  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { analyzed: 0, error: 'Not authenticated' }

  try {
    const body: Record<string, unknown> = { workspace_id: workspaceId, batch_size: batchSize }
    if (conversationIds && conversationIds.length > 0) body.conversation_ids = conversationIds

    const res = await fetch(`${API_BASE}/bots/conversations/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': SERVICE_KEY },
      body:    JSON.stringify(body),
    })
    const data = await res.json() as { analyzed?: number; error?: string }
    if (!res.ok) return { analyzed: 0, error: data.error ?? 'Analysis failed' }
    revalidatePath('/dashboard')
    return { analyzed: data.analyzed ?? 0 }
  } catch {
    return { analyzed: 0, error: 'Could not reach API' }
  }
}
