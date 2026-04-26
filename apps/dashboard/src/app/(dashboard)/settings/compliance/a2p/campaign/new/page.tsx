import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ComplianceBrandProfile } from '@/lib/types'
import { CampaignWizard } from './campaign-wizard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Campaign' }

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>
}) {
  const { brand: brandId } = await searchParams
  if (!brandId) redirect('/settings/compliance/a2p')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('workspace_members').select('workspace_id')
    .eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).single()
  const membership = membershipRaw as { workspace_id: string } | null
  if (!membership) redirect('/login')
  const workspaceId = membership.workspace_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: brandRaw } = await (createAdminClient() as any)
    .from('compliance_brand_profiles')
    .select('id, status, legal_name')
    .eq('id', brandId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  const brand = brandRaw as Pick<ComplianceBrandProfile, 'id' | 'status' | 'legal_name'> | null
  if (!brand || brand.status !== 'approved') redirect('/settings/compliance/a2p')

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/settings/compliance/a2p" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />Back to A2P
      </Link>
      <div className="mb-6">
        <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">New campaign</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Under brand: <span className="font-medium text-gray-700 dark:text-gray-300">{brand.legal_name ?? 'Unnamed'}</span>
        </p>
      </div>
      <CampaignWizard brandProfileId={brandId} />
    </div>
  )
}
