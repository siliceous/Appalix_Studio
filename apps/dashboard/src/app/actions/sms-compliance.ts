'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { SmsComplianceProfile, Sms10DlcCampaign } from '@/lib/types'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

async function getUserId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user.id
}

// ── Profile ───────────────────────────────────────────────────────────────────

export type ProfileFormData = Omit<SmsComplianceProfile,
  'id' | 'workspace_id' | 'country_code' | 'compliance_type' | 'status' |
  'rejection_reason' | 'approved_at' | 'submitted_at' | 'created_at' | 'updated_at'
>

export async function upsertSmsComplianceProfile(data: ProfileFormData): Promise<{ id: string; status: string }> {
  const workspaceId = await getWorkspaceId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: existing } = await admin
    .from('sms_compliance_profiles')
    .select('id, status')
    .eq('workspace_id', workspaceId)
    .eq('country_code', 'US')
    .eq('compliance_type', 'A2P_10DLC')
    .maybeSingle()

  const protectedStatuses = ['submitted', 'pending_carrier_review', 'approved']
  const keepStatus = existing && protectedStatuses.includes(existing.status)

  const { data: result, error } = await admin
    .from('sms_compliance_profiles')
    .upsert(
      {
        workspace_id:    workspaceId,
        country_code:    'US',
        compliance_type: 'A2P_10DLC',
        status:          keepStatus ? existing.status : 'draft',
        updated_at:      new Date().toISOString(),
        ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? null])),
      },
      { onConflict: 'workspace_id,country_code,compliance_type' }
    )
    .select('id, status')
    .single()

  if (error) throw new Error(error.message)
  return { id: result.id, status: result.status }
}

export async function submitSmsComplianceProfile(profileId: string): Promise<{ status: string; errors?: string[] }> {
  const workspaceId = await getWorkspaceId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: profile } = await admin
    .from('sms_compliance_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!profile) return { status: 'error', errors: ['Profile not found'] }

  await admin
    .from('sms_compliance_profiles')
    .update({ status: 'ready_for_review', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', profileId)

  // Ensure brand record exists
  const { data: existingBrand } = await admin
    .from('sms_10dlc_brands')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('compliance_profile_id', profileId)
    .maybeSingle()

  if (!existingBrand) {
    await admin
      .from('sms_10dlc_brands')
      .insert({ workspace_id: workspaceId, compliance_profile_id: profileId, provider: 'telnyx', brand_status: 'not_submitted' })
  }

  await admin
    .from('sms_compliance_status_events')
    .insert({
      workspace_id:          workspaceId,
      compliance_profile_id: profileId,
      entity_type:           'profile',
      entity_id:             profileId,
      old_status:            profile.status,
      new_status:            'ready_for_review',
      actor_type:            'user',
      actor_id:              await getUserId(),
    })

  redirect('/settings/compliance/sms-verification')
}

// ── Campaign ──────────────────────────────────────────────────────────────────

export type CampaignFormData = Omit<Sms10DlcCampaign,
  'id' | 'workspace_id' | 'compliance_profile_id' | 'campaign_status' |
  'rejection_reason' | 'submitted_at' | 'approved_at' | 'created_at' | 'updated_at'
>

export async function upsertSms10DlcCampaign(
  data: CampaignFormData,
  existingCampaignId?: string
): Promise<{ id: string; campaign_status: string }> {
  const workspaceId = await getWorkspaceId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Get or create compliance profile
  const { data: profile } = await admin
    .from('sms_compliance_profiles')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('country_code', 'US')
    .eq('compliance_type', 'A2P_10DLC')
    .maybeSingle()

  if (!profile) throw new Error('Complete your business verification before adding a campaign.')

  const payload = {
    workspace_id:          workspaceId,
    compliance_profile_id: profile.id,
    provider:              'telnyx',
    campaign_status:       'draft',
    updated_at:            new Date().toISOString(),
    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? null])),
  }

  if (existingCampaignId) {
    const { data: result, error } = await admin
      .from('sms_10dlc_campaigns')
      .update(payload)
      .eq('id', existingCampaignId)
      .eq('workspace_id', workspaceId)
      .select('id, campaign_status')
      .single()
    if (error) throw new Error(error.message)
    return { id: result.id, campaign_status: result.campaign_status }
  } else {
    const { data: result, error } = await admin
      .from('sms_10dlc_campaigns')
      .insert(payload)
      .select('id, campaign_status')
      .single()
    if (error) throw new Error(error.message)
    return { id: result.id, campaign_status: result.campaign_status }
  }
}

export async function submitSms10DlcCampaign(campaignId: string): Promise<{ campaign_status: string }> {
  const workspaceId = await getWorkspaceId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  await admin
    .from('sms_10dlc_campaigns')
    .update({ campaign_status: 'ready_for_review', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)

  redirect('/settings/compliance/sms-verification')
}

export async function deleteSms10DlcCampaign(campaignId: string): Promise<void> {
  const workspaceId = await getWorkspaceId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createAdminClient() as any)
    .from('sms_10dlc_campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  redirect('/settings/compliance/sms-verification')
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function uploadSmsComplianceDocument(formData: FormData): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  const userId      = await getUserId()
  const file        = formData.get('file')          as File | null
  const docType     = formData.get('document_type') as string | null
  const profileId   = formData.get('profile_id')    as string | null

  if (!file || !docType || !profileId) return { error: 'Missing fields' }
  if (file.size > 10 * 1024 * 1024)   return { error: 'File must be under 10 MB' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const filePath = `${workspaceId}/${profileId}/${docType}.${ext}`

  const { error: storageError } = await admin.storage
    .from('compliance-docs')
    .upload(filePath, file, { upsert: true, contentType: file.type })
  if (storageError) return { error: storageError.message }

  await admin.from('sms_compliance_documents').delete()
    .eq('workspace_id', workspaceId)
    .eq('compliance_profile_id', profileId)
    .eq('document_type', docType)

  const { error: dbError } = await admin
    .from('sms_compliance_documents')
    .insert({
      workspace_id:          workspaceId,
      compliance_profile_id: profileId,
      document_type:         docType,
      file_url:              filePath,
      file_name:             file.name,
      mime_type:             file.type,
      size_bytes:            file.size,
      uploaded_by:           userId,
    })
  if (dbError) return { error: dbError.message }
  return {}
}

export async function deleteSmsComplianceDocument(docId: string): Promise<{ error?: string }> {
  const workspaceId = await getWorkspaceId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: doc } = await admin.from('sms_compliance_documents').select('file_url').eq('id', docId).eq('workspace_id', workspaceId).maybeSingle()
  if (!doc) return { error: 'Not found' }
  await admin.storage.from('compliance-docs').remove([doc.file_url])
  await admin.from('sms_compliance_documents').delete().eq('id', docId)
  return {}
}

// ── Sage AI content generation ────────────────────────────────────────────────

export type SageField =
  | 'campaign_description'
  | 'message_flow'
  | 'sample_message_1'
  | 'sample_message_2'
  | 'opt_in_message'
  | 'opt_out_message'
  | 'help_message'
  | 'expected_message_frequency'

export async function generateSmsFieldContent(params: {
  field:        SageField
  businessName: string
  useCase:      string
  website:      string
  industry:     string
}): Promise<{ text: string; error?: string }> {
  await getWorkspaceId()

  const useCaseLabel: Record<string, string> = {
    customer_care:             'customer care and support',
    account_notifications:     'account notifications (billing, security, updates)',
    appointment_reminders:     'appointment reminders and confirmations',
    delivery_notifications:    'delivery and order status notifications',
    two_factor_authentication: 'two-factor authentication and verification codes',
    lead_followup:             'lead follow-up with prospects',
    marketing:                 'marketing, promotions and announcements',
    mixed:                     'mixed messaging (transactional and marketing)',
  }

  const biz = params.businessName || 'our business'
  const web = params.website      || 'our website'
  const uc  = useCaseLabel[params.useCase] ?? params.useCase
  const ind = params.industry     || 'General'

  const prompts: Record<SageField, string> = {
    campaign_description:
`Write a TCR A2P 10DLC campaign description for a US SMS messaging registration.

Business: ${biz} (${ind})
Website: ${web}
Use case: ${uc}

Requirements:
- 140–300 characters
- State what the business does, who they message, what specific event triggers each message, and the value to recipients
- Be concrete and specific — no vague phrases like "customers opt in" or "we send updates"
- Do NOT mention TCR, 10DLC, A2P, or carrier terms
- Return ONLY the description text, no quotes`,

    message_flow:
`Write an opt-in mechanism description (message flow) for a TCR A2P 10DLC campaign registration.

Business: ${biz}
Website: ${web}
Use case: ${uc}

Requirements:
- 150–400 characters
- Describe the EXACT opt-in step-by-step: URL, form, consent checkbox text (with STOP/freq/rate language), what triggers after opt-in
- Include a realistic URL like ${web}/book or ${web}/signup
- The consent text must include message frequency, "Msg & Data rates may apply", STOP instruction
- Be specific — carriers reject vague flows
- Return ONLY the description text, no quotes`,

    sample_message_1:
`Write a realistic first sample SMS for a TCR A2P 10DLC campaign.

Business: ${biz}
Use case: ${uc}
Scenario: Most common / primary message type

Requirements:
- Under 160 characters
- Use [FirstName] as personalisation placeholder
- Include business name
- Must end with "Reply STOP to unsubscribe" or similar
- Return ONLY the SMS text, no quotes`,

    sample_message_2:
`Write a second, different sample SMS for a TCR A2P 10DLC campaign.

Business: ${biz}
Use case: ${uc}
Scenario: A different trigger or follow-up scenario from the first sample

Requirements:
- Under 160 characters
- Use [FirstName] as personalisation placeholder
- Must include "Reply STOP" or similar — different phrasing from sample 1
- Clearly different scenario/trigger from sample 1
- Return ONLY the SMS text, no quotes`,

    opt_in_message:
`Write a TCR-compliant opt-in confirmation SMS (sent when customer replies START or YES).

Business: ${biz}
Website: ${web}

Must include: business name, message frequency note, "Msg & Data rates may apply", STOP instruction, HELP instruction, privacy policy URL
Under 200 characters. Return ONLY the SMS text, no quotes.`,

    opt_out_message:
`Write a TCR-compliant opt-out confirmation SMS (sent when customer replies STOP).

Business: ${biz}

Must: confirm unsubscription, state no further messages will be sent, say how to resubscribe (reply START).
Under 160 characters. Return ONLY the SMS text, no quotes.`,

    help_message:
`Write a TCR-compliant HELP response SMS (sent when customer replies HELP).

Business: ${biz}
Website: ${web}

Must include: business name, support email ([SupportEmail]) and/or phone ([SupportPhone]) placeholders, "Msg & Data rates may apply", STOP instruction.
Under 200 characters. Return ONLY the SMS text, no quotes.`,

    expected_message_frequency:
`Write a concise expected message frequency for a US SMS campaign.

Business: ${biz}
Use case: ${uc}

Format: "X messages per [trigger], maximum Y per [period]"
One sentence, under 80 characters. Return ONLY the frequency text, no quotes.`,
  }

  try {
    const resp = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages:   [{ role: 'user', content: prompts[params.field] }],
    })
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : ''
    return { text }
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : 'Generation failed' }
  }
}
