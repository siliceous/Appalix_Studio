'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TRASH_DAYS = 3

async function getWorkspaceAndUser() {
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
  const workspaceId = (data as { workspace_id: string } | null)?.workspace_id
  if (!workspaceId) return null
  return { user, workspaceId }
}

export interface TrashItem {
  id:         string
  name:       string | null
  type:       'conversation' | 'submission' | 'ticket'
  deleted_at: string
  days_left:  number
}

function daysLeft(deletedAt: string): number {
  const d = new Date(deletedAt)
  const expiry = new Date(d.getTime() + TRASH_DAYS * 24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

// ── Fetch trash ───────────────────────────────────────────────────────────────

export async function fetchTrash(
  type: 'conversation' | 'submission' | 'ticket',
): Promise<TrashItem[]> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return []

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString()

  if (type === 'submission') {
    const { data } = await admin
      .from('sage_form_submissions')
      .select('id, fields, ai_entities, deleted_at')
      .eq('workspace_id', ctx.workspaceId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false })
      .limit(100)
    return ((data ?? []) as { id: string; fields: Record<string, unknown>; ai_entities?: Record<string, unknown> | null; deleted_at: string }[]).map(r => ({
      id:         r.id,
      name:       (r.ai_entities?.name ?? r.fields?.name ?? null) as string | null,
      type:       'submission',
      deleted_at: r.deleted_at,
      days_left:  daysLeft(r.deleted_at),
    }))
  }

  if (type === 'conversation') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from('conversations')
      .select('id, title, ai_entities, deleted_at')
      .eq('workspace_id', ctx.workspaceId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false })
      .limit(100)
    return ((data ?? []) as { id: string; title?: string | null; ai_entities?: { name?: string } | null; deleted_at: string }[]).map(r => ({
      id:         r.id,
      name:       r.ai_entities?.name ?? r.title ?? null,
      type:       'conversation',
      deleted_at: r.deleted_at,
      days_left:  daysLeft(r.deleted_at),
    }))
  }

  // ticket
  const { data } = await admin
    .from('sage_tickets')
    .select('id, title, name, deleted_at')
    .eq('workspace_id', ctx.workspaceId)
    .not('deleted_at', 'is', null)
    .gte('deleted_at', cutoff)
    .order('deleted_at', { ascending: false })
    .limit(100)
  return ((data ?? []) as { id: string; title?: string | null; name?: string | null; deleted_at: string }[]).map(r => ({
    id:         r.id,
    name:       r.title ?? r.name ?? null,
    type:       'ticket',
    deleted_at: r.deleted_at,
    days_left:  daysLeft(r.deleted_at),
  }))
}

// ── Restore ───────────────────────────────────────────────────────────────────

export async function restoreSubmission(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_form_submissions')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/forms')
  return {}
}

export async function restoreConversation(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('conversations')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  // Also restore linked tickets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (admin as any)
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .eq('source_conversation_id', id)
  if (contacts && (contacts as { id: string }[]).length > 0) {
    const contactIds = (contacts as { id: string }[]).map(c => c.id)
    await admin.from('sage_tickets')
      .update({ deleted_at: null } as never)
      .eq('workspace_id', ctx.workspaceId)
      .in('contact_id', contactIds)
      .not('deleted_at', 'is', null)
  }
  revalidatePath('/dashboard/bots')
  revalidatePath('/dashboard/tickets')
  return {}
}

export async function restoreTicket(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_tickets')
    .update({ deleted_at: null } as never)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tickets')
  revalidatePath('/sage/tickets')
  return {}
}

// ── Permanent delete ──────────────────────────────────────────────────────────

export async function permanentDeleteSubmission(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_form_submissions')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/forms')
  return {}
}

export async function permanentDeleteConversation(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  // Cascade to linked tickets first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (admin as any)
    .from('sage_contacts')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .eq('source_conversation_id', id)
  if (contacts && (contacts as { id: string }[]).length > 0) {
    const contactIds = (contacts as { id: string }[]).map(c => c.id)
    await admin.from('sage_tickets').delete().eq('workspace_id', ctx.workspaceId).in('contact_id', contactIds)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('conversations').delete().eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/bots')
  return {}
}

export async function permanentDeleteTicket(id: string): Promise<{ error?: string }> {
  const ctx = await getWorkspaceAndUser()
  if (!ctx) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_tickets').delete().eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tickets')
  revalidatePath('/sage/tickets')
  return {}
}
