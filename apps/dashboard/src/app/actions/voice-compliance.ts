'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const TELNYX = 'https://api.telnyx.com/v2'

function headers() {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error('TELNYX_API_KEY not configured')
  return {
    Authorization:  `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  const m = data as { workspace_id: string; role: string } | null
  if (!m) redirect('/login')
  if (!['admin', 'owner'].includes(m.role)) throw new Error('Admin role required')
  return { userId: user.id, workspaceId: m.workspace_id }
}

// ── CNAM ──────────────────────────────────────────────────────────────────────

export async function submitCnamRegistration({
  callerName,
  phoneNumberIds,
}: {
  callerName:     string
  phoneNumberIds: string[]
}): Promise<{ success: boolean; error?: string; failedNumbers?: string[] }> {
  const { workspaceId } = await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  if (!callerName.trim())          return { success: false, error: 'Caller name is required' }
  if (phoneNumberIds.length === 0) return { success: false, error: 'Select at least one phone number' }

  const { data: numbers } = await admin
    .from('workspace_phone_numbers')
    .select('id, e164, provider_number_id')
    .in('id', phoneNumberIds)
    .eq('workspace_id', workspaceId)
    .is('released_at', null)

  if (!numbers?.length) return { success: false, error: 'No valid phone numbers found' }

  const normalized = callerName.trim().toUpperCase().slice(0, 15)
  const failedNumbers: string[] = []

  await Promise.all(
    (numbers as Array<{ id: string; e164: string; provider_number_id: string }>).map(async (num) => {
      const resp = await fetch(
        `${TELNYX}/phone_numbers/${encodeURIComponent(num.provider_number_id)}`,
        {
          method:  'PATCH',
          headers: headers(),
          body:    JSON.stringify({ caller_name: normalized }),
        },
      )
      if (!resp.ok) failedNumbers.push(num.e164)
    }),
  )

  const allFailed = failedNumbers.length === numbers.length

  await admin.from('compliance_registrations').upsert(
    {
      workspace_id: workspaceId,
      type:         'cnam',
      status:       allFailed ? 'rejected' : 'active',
      data: {
        caller_name:      normalized,
        phone_number_ids: phoneNumberIds,
        updated_at:       new Date().toISOString(),
      },
      submitted_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    },
    { onConflict: 'workspace_id,type' },
  )

  if (allFailed) {
    return { success: false, error: 'Carrier rejected the caller name update on all numbers', failedNumbers }
  }
  return { success: true, failedNumbers: failedNumbers.length ? failedNumbers : undefined }
}

// ── SHAKEN / STIR ─────────────────────────────────────────────────────────────

export async function submitShakenStirRegistration({
  legalBusinessName,
  contactName,
  contactEmail,
  contactPhone,
  phoneNumberIds,
}: {
  legalBusinessName: string
  contactName:       string
  contactEmail:      string
  contactPhone:      string
  phoneNumberIds:    string[]
}): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  if (!legalBusinessName.trim()) return { success: false, error: 'Legal business name is required' }
  if (!contactName.trim())       return { success: false, error: 'Contact name is required' }
  if (!contactEmail.trim())      return { success: false, error: 'Contact email is required' }
  if (phoneNumberIds.length === 0) return { success: false, error: 'Select at least one phone number' }

  await admin.from('compliance_registrations').upsert(
    {
      workspace_id: workspaceId,
      type:         'shaken_stir',
      status:       'pending',
      data: {
        legal_business_name: legalBusinessName,
        contact_name:        contactName,
        contact_email:       contactEmail,
        contact_phone:       contactPhone,
        phone_number_ids:    phoneNumberIds,
      },
      submitted_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    },
    { onConflict: 'workspace_id,type' },
  )

  return { success: true }
}

// ── Voice Integrity ───────────────────────────────────────────────────────────

export async function submitVoiceIntegrityRegistration({
  phoneNumberIds,
}: {
  phoneNumberIds: string[]
}): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  if (phoneNumberIds.length === 0) return { success: false, error: 'Select at least one phone number' }

  await admin.from('compliance_registrations').upsert(
    {
      workspace_id: workspaceId,
      type:         'voice_integrity',
      status:       'pending',
      data: {
        phone_number_ids: phoneNumberIds,
      },
      submitted_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    },
    { onConflict: 'workspace_id,type' },
  )

  return { success: true }
}
