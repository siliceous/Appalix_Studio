'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string | null)?.trim() || 'My Workspace'
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const suffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * 36)]).join('')
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) + '-' + suffix

  const admin = createAdminClient()

  const { data: workspace, error } = await admin
    .from('workspaces')
    .insert({ name, slug, plan: 'starter', subscription_status: 'trialing' })
    .select()
    .single()

  if (error || !workspace) {
    throw new Error(error?.message ?? 'Failed to create workspace')
  }

  await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
  })

  redirect('/dashboard')
}
