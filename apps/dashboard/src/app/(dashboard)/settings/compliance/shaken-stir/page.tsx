import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }                        from 'next/navigation'
import type { Metadata }                   from 'next'
import type { ComplianceRegistration, SmsComplianceProfile } from '@/lib/types'
import { ShakenStirForm }                  from './shaken-stir-form'

export const metadata: Metadata = { title: 'SHAKEN/STIR — Caller Authentication' }

export default async function ShakenStirPage() {
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

  const [{ data: regRaw }, { data: numbersRaw }, { data: profileRaw }] = await Promise.all([
    admin.from('compliance_registrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('type', 'shaken_stir')
      .maybeSingle(),
    admin.from('workspace_phone_numbers')
      .select('id, e164, country_code')
      .eq('workspace_id', workspaceId)
      .is('released_at', null)
      .order('created_at', { ascending: true }),
    admin.from('sms_compliance_profiles')
      .select('legal_business_name, trading_name, business_contact_name, business_contact_email, business_contact_phone')
      .eq('workspace_id', workspaceId)
      .eq('country_code', 'US')
      .eq('compliance_type', 'A2P_10DLC')
      .maybeSingle(),
  ])

  const registration = regRaw as ComplianceRegistration | null
  const numbers      = (numbersRaw ?? []) as Array<{ id: string; e164: string; country_code: string }>
  const profile      = profileRaw as Pick<
    SmsComplianceProfile,
    'legal_business_name' | 'trading_name' | 'business_contact_name' | 'business_contact_email' | 'business_contact_phone'
  > | null

  return (
    <ShakenStirForm
      registration={registration}
      phoneNumbers={numbers}
      a2pProfile={profile}
      isAdmin={isAdmin}
    />
  )
}
