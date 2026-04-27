import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }                        from 'next/navigation'
import type { Metadata }                   from 'next'
import type { SmsComplianceProfile, Sms10DlcCampaign, SmsComplianceDocument } from '@/lib/types'
import { SmsVerificationWizard }           from './sms-verification-wizard'
import { SmsVerificationStatus }           from './sms-verification-status'

export const metadata: Metadata = { title: 'US SMS Verification' }

// Statuses where we show the status view instead of the wizard
const STATUS_VIEW_STATUSES = new Set([
  'ready_for_review', 'submitted', 'pending_carrier_review', 'approved', 'suspended', 'expired',
])

export default async function SmsVerificationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (!memberRaw) redirect('/login')
  const { workspace_id: workspaceId, role } = memberRaw as { workspace_id: string; role: string }
  const isAdmin = role === 'admin' || role === 'owner'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: profileRaw } = await admin
    .from('sms_compliance_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('country_code', 'US')
    .eq('compliance_type', 'A2P_10DLC')
    .maybeSingle()

  const profile = profileRaw as SmsComplianceProfile | null

  // Show wizard for new / draft / rejected profiles
  if (!profile || !STATUS_VIEW_STATUSES.has(profile.status)) {
    const [{ data: campaignRaw }, { data: docsRaw }] = await Promise.all([
      profile
        ? admin.from('sms_10dlc_campaigns').select('*').eq('compliance_profile_id', profile.id)
            .order('created_at', { ascending: true }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
      profile
        ? admin.from('sms_compliance_documents').select('*').eq('compliance_profile_id', profile.id)
        : Promise.resolve({ data: [] }),
    ])
    return (
      <SmsVerificationWizard
        existing={{
          profile,
          campaign:  campaignRaw  as Sms10DlcCampaign | null,
          documents: (docsRaw ?? []) as SmsComplianceDocument[],
        }}
      />
    )
  }

  // Show status view for submitted / under review / approved profiles
  const [
    { data: brandRaw },
    { data: campaignsRaw },
    { data: numbersRaw },
    { data: assignmentsRaw },
  ] = await Promise.all([
    admin.from('sms_10dlc_brands').select('id, brand_status, provider_brand_id, rejection_reason, submitted_at, approved_at')
      .eq('compliance_profile_id', profile.id).maybeSingle(),
    admin.from('sms_10dlc_campaigns').select('id, campaign_name, use_case, campaign_status, provider_campaign_id, rejection_reason, submitted_at, approved_at')
      .eq('compliance_profile_id', profile.id).order('created_at', { ascending: true }),
    admin.from('workspace_phone_numbers').select('id, e164')
      .eq('workspace_id', workspaceId).eq('country_code', 'US').is('released_at', null),
    admin.from('sms_number_campaign_assignments').select('phone_number_id, campaign_id, status')
      .eq('workspace_id', workspaceId).eq('status', 'active'),
  ])

  return (
    <SmsVerificationStatus
      profile={{
        id:                  profile.id,
        status:              profile.status,
        legal_business_name: profile.legal_business_name ?? null,
        trading_name:        profile.trading_name ?? null,
        rejection_reason:    profile.rejection_reason ?? null,
        submitted_at:        profile.submitted_at ?? null,
      }}
      brand={brandRaw ?? null}
      campaigns={campaignsRaw ?? []}
      phoneNumbers={numbersRaw ?? []}
      assignments={assignmentsRaw ?? []}
      isAdmin={isAdmin}
    />
  )
}
