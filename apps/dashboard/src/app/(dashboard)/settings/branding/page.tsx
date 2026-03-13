import { createClient } from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import type { Metadata } from 'next'
import { getBranding }   from '@/app/actions/workspace-branding'
import { BrandingForm }  from '@/components/settings/branding-form'

export const metadata: Metadata = { title: 'Branding & White-label' }

export default async function BrandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(plan)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  type Row = { workspace_id: string; role: string; workspaces: { plan: string } }
  const membership = membershipRaw as Row | null
  if (!membership) redirect('/login')

  // Branding is Team & Enterprise only
  const plan = membership.workspaces?.plan ?? 'individual'
  if (!['team', 'enterprise'].includes(plan)) redirect('/settings/upgrade')

  const isAdmin = ['owner', 'admin'].includes(membership.role)
  const branding = await getBranding()

  return <BrandingForm initialBranding={branding} isAdmin={isAdmin} />
}
