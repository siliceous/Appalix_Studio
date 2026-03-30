'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SageItem } from '@/lib/types'

async function getWorkspaceId(): Promise<string> {
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
  return (data as { workspace_id: string }).workspace_id
}

export async function getItems(): Promise<SageItem[]> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('sage_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('item_code')
  return (data ?? []) as SageItem[]
}

export async function createItem(fields: {
  item_code:    string
  description:  string
  category?:    string
  job?:         string
  tax_code?:    string
  unit?:        string
  unit_price?:  number
}): Promise<{ id?: string; error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sage_items')
    .insert({
      workspace_id: workspaceId,
      item_code:    fields.item_code,
      description:  fields.description,
      category:     fields.category  ?? null,
      job:          fields.job       ?? null,
      tax_code:     fields.tax_code  ?? null,
      unit:         fields.unit      ?? null,
      unit_price:   fields.unit_price ?? 0,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/sage/quotes')
  return { id: (data as { id: string }).id }
}

export async function updateItem(
  id: string,
  fields: Partial<Omit<SageItem, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'deleted_at'>>
): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_items')
    .update(fields)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/quotes')
  return { error: error?.message }
}

export async function deleteItem(id: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const admin = createAdminClient()
  const { error } = await admin
    .from('sage_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  revalidatePath('/sage/quotes')
  return { error: error?.message }
}
